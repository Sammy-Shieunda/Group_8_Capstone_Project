import os
import cv2
import numpy as np
import tensorflow as tf

from tensorflow.keras.applications.mobilenet_v2 import preprocess_input

MODEL_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "models",
    "dysgraphia_fragment_transfer_mobilenetv2.keras"
)

FRAGMENT_SIZE = (128, 64)  # width, height

class FragmentPredictor:

    def __init__(self):
        print(f"Loading fragment model from: {MODEL_PATH}")

        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(
                f"Fragment model not found at: {MODEL_PATH}"
            )

        self.model = tf.keras.models.load_model(
            MODEL_PATH,
            custom_objects={
                "preprocess_input": preprocess_input
            },
            compile=False
        )

        print("Fragment model loaded successfully.")
        print(f"Input shape: {self.model.input_shape}")
        print(f"Output shape: {self.model.output_shape}")

    def extract_fragments(self, image_bytes):
        """
        Convert the uploaded handwriting image into fragments
        using the same OpenCV extraction approach used during
        model development.
        """

        image_array = np.frombuffer(image_bytes, dtype=np.uint8)

        image = cv2.imdecode(
            image_array,
            cv2.IMREAD_GRAYSCALE
        )

        if image is None:
            raise ValueError("Unable to decode handwriting image.")

        # Threshold
        _, binary = cv2.threshold(
            image,
            30,
            255,
            cv2.THRESH_BINARY_INV
        )

        # Remove horizontal ruled lines
        horizontal_kernel = cv2.getStructuringElement(
            cv2.MORPH_RECT,
            (40, 1)
        )

        horizontal_lines = cv2.morphologyEx(
            binary,
            cv2.MORPH_OPEN,
            horizontal_kernel
        )

        no_lines = cv2.subtract(
            binary,
            horizontal_lines
        )

        # Dilate to connect handwriting components
        dilation_kernel = cv2.getStructuringElement(
            cv2.MORPH_RECT,
            (15, 5)
        )

        dilated = cv2.dilate(
            no_lines,
            dilation_kernel,
            iterations=1
        )

        # Find contours
        contours, _ = cv2.findContours(
            dilated,
            cv2.RETR_EXTERNAL,
            cv2.CHAIN_APPROX_SIMPLE
        )

        fragments = []

        for contour in contours:

            x, y, w, h = cv2.boundingRect(contour)

            area = w * h

            # Same basic filters used during extraction
            if w < 15:
                continue

            if h < 10:
                continue

            if area < 200:
                continue

            # Crop from the line-free image
            crop = no_lines[
                max(0, y):min(no_lines.shape[0], y + h),
                max(0, x):min(no_lines.shape[1], x + w)
            ]

            if crop.size == 0:
                continue

            fragments.append({
                "x": x,
                "y": y,
                "width": w,
                "height": h,
                "image": crop
            })

        # Reading order:
        # top-to-bottom, left-to-right
        fragments.sort(
            key=lambda fragment: (
                fragment["y"],
                fragment["x"]
            )
        )

        return fragments

    def preprocess_fragment(self, fragment):
        """
        Convert a fragment into the model's expected
        64 × 128 × 1 input.
        """

        resized = cv2.resize(
            fragment,
            FRAGMENT_SIZE,
            interpolation=cv2.INTER_AREA
        )

        # Normalize to 0–1
        normalized = resized.astype(
            np.float32
        ) / 255.0

        # Add channel dimension
        normalized = np.expand_dims(
            normalized,
            axis=-1
        )

        return normalized

    def predict(self, image_bytes):

        fragments = self.extract_fragments(
            image_bytes
        )

        if not fragments:
            raise ValueError(
                "No handwriting fragments could be extracted "
                "from the image."
            )

        processed = []

        for fragment in fragments:
            processed.append(
                self.preprocess_fragment(
                    fragment["image"]
                )
            )

        batch = np.stack(processed)

        # Model prediction
        probabilities = self.model.predict(
            batch,
            verbose=0
        ).reshape(-1)

        results = []

        for index, probability in enumerate(probabilities):

            probability = float(probability)

            # IMPORTANT:
            # Verify the positive-class meaning against
            # the training labels before using this as
            # the final clinical interpretation.
            prediction = (
                "Potential Dysgraphia"
                if probability >= 0.5
                else "Low Potential Dysgraphia"
            )

            results.append({
                "fragment_index": index + 1,
                "probability": round(probability, 6),
                "prediction": prediction,
                "bounding_box": {
                    "x": fragments[index]["x"],
                    "y": fragments[index]["y"],
                    "width": fragments[index]["width"],
                    "height": fragments[index]["height"]
                }
            })

        # Aggregate evidence across fragments
        mean_probability = float(
            np.mean(probabilities)
        )

        potential_count = int(
            np.sum(probabilities >= 0.5)
        )

        low_count = int(
            np.sum(probabilities < 0.5)
        )

        if potential_count > low_count:
            aggregate_prediction = "Potential Dysgraphia"
        elif low_count > potential_count:
            aggregate_prediction = "Low Potential Dysgraphia"
        else:
            aggregate_prediction = "Inconclusive"

        return {
            "model_name": "MobileNetV2 Fragment Transfer",
            "model_version": "1.0",
            "fragment_count": len(results),
            "aggregate": {
                "prediction": aggregate_prediction,
                "mean_probability": round(
                    mean_probability,
                    6
                ),
                "potential_fragments": potential_count,
                "low_potential_fragments": low_count
            },
            "fragments": results
        }


fragment_predictor = FragmentPredictor()