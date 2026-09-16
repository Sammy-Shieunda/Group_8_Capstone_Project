from pathlib import Path
import shutil
import tempfile

from fastapi import FastAPI, File, UploadFile, HTTPException
from app.fragment_predictor import fragment_predictor

from .model import model, THRESHOLD
from .preprocessing import preprocess_image


app = FastAPI(
    title="WriteAble Dysgraphia ML Service",
    description="Handwriting-based dysgraphia screening inference service",
    version="1.0.0"
)


@app.get("/health")
def health():
    return {
        "success": True,
        "service": "dysgraphia-ml-service",
        "status": "healthy",
        "model": "MobileNetV2",
        "model_version": "1.0"
    }


@app.post("/predict")
async def predict(file: UploadFile = File(...)):

    allowed_types = {
        "image/jpeg",
        "image/png",
        "image/webp"
    }

    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Only JPEG, PNG and WebP images are supported."
        )

    suffix = Path(file.filename or "").suffix

    try:
        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=suffix
        ) as temp_file:

            shutil.copyfileobj(
                file.file,
                temp_file
            )

            temp_path = Path(temp_file.name)

        # Preprocess exactly as during training
        processed_image = preprocess_image(temp_path)

        # Model inference
        probability = float(
            model.predict(
                processed_image,
                verbose=0
            )[0][0]
        )

        prediction = (
            "Potential Dysgraphia"
            if probability >= THRESHOLD
            else "Low Potential Dysgraphia"
        )

        return {
            "success": True,
            "model": {
                "name": "MobileNetV2",
                "version": "1.0"
            },
            "prediction": {
                "class": prediction,
                "probability": round(probability, 6),
                "threshold": THRESHOLD
            }
        }

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )

    finally:

        if "temp_path" in locals() and temp_path.exists():
            temp_path.unlink()
            
@app.post("/predict-fragments")
async def predict_fragments(
    file: UploadFile = File(...)
):
    try:
        image_bytes = await file.read()

        if not image_bytes:
            raise HTTPException(
                status_code=400,
                detail="Uploaded file is empty."
            )

        result = fragment_predictor.predict(
            image_bytes
        )

        return {
            "success": True,
            "filename": file.filename,
            "data": result
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    except Exception as error:
        print(
            f"Fragment prediction error: {error}"
        )

        raise HTTPException(
            status_code=500,
            detail="Fragment analysis failed."
        )