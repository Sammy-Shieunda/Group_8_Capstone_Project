from pathlib import Path

import cv2
import numpy as np


TARGET_SIZE = (256, 256)


def standardize_colour(img):
    """
    Convert image to grayscale.
    """
    if img.ndim == 3:
        img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    return img


def crop_borders(img, margin=10):
    """
    Remove extreme borders around the handwriting.
    """
    _, thresh = cv2.threshold(
        img,
        30,
        255,
        cv2.THRESH_BINARY
    )

    coords = cv2.findNonZero(thresh)

    if coords is None:
        return img

    x, y, w, h = cv2.boundingRect(coords)

    x0 = max(x - margin, 0)
    y0 = max(y - margin, 0)
    x1 = min(x + w + margin, img.shape[1])
    y1 = min(y + h + margin, img.shape[0])

    return img[y0:y1, x0:x1]


def deskew(img):
    """
    Correct the overall rotation/skew of the handwriting.
    """
    _, thresh = cv2.threshold(
        img,
        30,
        255,
        cv2.THRESH_BINARY
    )

    coords = cv2.findNonZero(thresh)

    if coords is None:
        return img

    angle = cv2.minAreaRect(coords)[-1]

    if angle < -45:
        angle = 90 + angle

    if abs(angle) < 0.5:
        return img

    h, w = img.shape

    matrix = cv2.getRotationMatrix2D(
        (w / 2, h / 2),
        angle,
        1.0
    )

    return cv2.warpAffine(
        img,
        matrix,
        (w, h),
        borderValue=0
    )


def resize_and_pad(img, target_size=TARGET_SIZE):
    """
    Resize handwriting proportionally and pad to 256x256.
    """
    h, w = img.shape

    target_w, target_h = target_size

    scale = min(
        target_w / w,
        target_h / h
    )

    new_w = int(w * scale)
    new_h = int(h * scale)

    resized = cv2.resize(
        img,
        (new_w, new_h),
        interpolation=cv2.INTER_AREA
    )

    canvas = np.zeros(
        (target_h, target_w),
        dtype=np.uint8
    )

    x_offset = (target_w - new_w) // 2
    y_offset = (target_h - new_h) // 2

    canvas[
        y_offset:y_offset + new_h,
        x_offset:x_offset + new_w
    ] = resized

    return canvas


def normalize(img):
    """
    Convert pixel values from 0-255 to 0-1.
    """
    return img.astype("float32") / 255.0


def preprocess_image(image_path):
    """
    Complete preprocessing pipeline used by the model.
    """

    img = cv2.imread(
        str(image_path),
        cv2.IMREAD_UNCHANGED
    )

    if img is None:
        raise ValueError(
            f"Could not read image: {image_path}"
        )

    img = standardize_colour(img)
    img = crop_borders(img)
    img = deskew(img)
    img = resize_and_pad(img)
    img = normalize(img)

    # Model expects:
    # (batch, 256, 256, 1)

    img = np.expand_dims(img, axis=-1)
    img = np.expand_dims(img, axis=0)

    return img