const fs = require("fs");
const path = require("path");

const Screening = require("../models/screeningModel");
const ScreeningImage = require("../models/screeningImageModel");
const Prediction = require("../models/predictionModel");

const {
    predictHandwriting,
    predictHandwritingFragments
} = require("../services/mlService");
const uploadHandwritingImage = async (req, res) => {

    try {

        const { taskId } = req.params;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Handwriting image is required"
            });
        }

        const task = await Screening.findTaskById(taskId);

        if (!task) {

            fs.unlinkSync(req.file.path);

            return res.status(404).json({
                success: false,
                message: "Screening task not found"
            });
        }

        const imageId = await ScreeningImage.create({

            task_id: taskId,

            original_filename:
                req.file.originalname,

            stored_filename:
                req.file.filename,

            file_path:
                req.file.path,

            mime_type:
                req.file.mimetype,

            file_size:
                req.file.size
        });

        const image =
            await ScreeningImage.findById(imageId);

        res.status(201).json({

            success: true,

            message:
                "Handwriting image uploaded successfully",

            data: {
                image
            }
        });

    } catch (error) {

        console.error(
            "Upload handwriting image error:",
            error
        );

        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({
            success: false,
            message: "Failed to upload handwriting image"
        });
    }
};

const getTaskImages = async (req, res) => {

    try {

        const { taskId } = req.params;

        const task =
            await Screening.findTaskById(taskId);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Screening task not found"
            });
        }

        const images =
            await ScreeningImage.findByTaskId(taskId);

        res.json({

            success: true,

            count: images.length,

            data: images
        });

    } catch (error) {

        console.error(
            "Get task images error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to retrieve images"
        });
    }
};
const analyzeHandwritingFragments = async (req, res) => {
    try {
        const { taskId } = req.params;

        // 1. Verify task exists
        const task = await Screening.findTaskById(taskId);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Screening task not found"
            });
        }

        // 2. Get images for task
        const images = await ScreeningImage.findByTaskId(taskId);

        if (!images || images.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No handwriting image found for this task"
            });
        }

        // 3. Most recently uploaded image
        const image = images[0];

        // 4. Check physical file
        if (!fs.existsSync(image.file_path)) {
            return res.status(404).json({
                success: false,
                message: "Handwriting image file not found"
            });
        }

        console.log(
            `Sending image ${image.id} to fragment ML service...`
        );

        // 5. Send to FastAPI
        const mlResult = await predictHandwritingFragments(
            image.file_path,
            image.original_filename
        );

       const analysis =
    mlResult?.data?.analysis ??
    mlResult?.data ??
    mlResult?.analysis;

if (
    !analysis ||
    !analysis.aggregate ||
    !Array.isArray(analysis.fragments)
) {
    throw new Error(
        "ML service returned an invalid fragment analysis"
    );
}

        const aggregate = analysis.aggregate;

        // 6. Save task-level prediction
        const predictionId = await Prediction.create({
            screening_id: task.screening_id,
            task_id: Number(taskId),

            model_name:
                analysis.model_name ||
                "MobileNetV2 Fragment Transfer",

            model_version:
                analysis.model_version ||
                "1.0",

            predicted_class:
                aggregate.prediction,

            probability:
                aggregate.mean_probability,

            confidence:
                aggregate.mean_probability
        });

        console.log(
            `Fragment prediction ${predictionId} saved for task ${taskId}`
        );

        // A task is complete only once its analysis result has been persisted.
        await Screening.completeTask(taskId);

        // 7. Return result
        return res.status(200).json({
            success: true,
            message:
                "Fragment handwriting analysis completed successfully",

            data: {
                task_id: Number(taskId),
                screening_id: task.screening_id,
                image_id: image.id,

                prediction_id: predictionId,

                analysis
            }
        });

    } catch (error) {

        console.error(
            "Fragment handwriting analysis error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
const analyzeHandwriting = async (req, res) => {

    try {

        const { taskId } = req.params;

        // --------------------------------------------------
        // 1. Verify that the task exists
        // --------------------------------------------------

        const task =
            await Screening.findTaskById(taskId);

        if (!task) {

            return res.status(404).json({
                success: false,
                message: "Screening task not found"
            });
        }


        // --------------------------------------------------
        // 2. Find the uploaded handwriting image
        // --------------------------------------------------

        const images =
            await ScreeningImage.findByTaskId(taskId);

        if (!images || images.length === 0) {

            return res.status(404).json({
                success: false,
                message: "No handwriting image found for this task"
            });
        }


        // --------------------------------------------------
        // 3. Use the most recently uploaded image
        // --------------------------------------------------

        const image = images[0];


        // --------------------------------------------------
        // 4. Verify the physical file exists
        // --------------------------------------------------

        if (!fs.existsSync(image.file_path)) {

            return res.status(404).json({
                success: false,
                message: "Handwriting image file could not be found"
            });
        }


        // --------------------------------------------------
        // 5. Send image to FastAPI /predict
        // --------------------------------------------------

        console.log(
            `Sending image ${image.id} to ML service...`
        );

        const mlResult = await predictHandwritingFragments(
    image.file_path,
    image.original_filename
);

console.log("========== ML RESULT ==========");
console.dir(mlResult, { depth: null });
console.log("TYPE:", typeof mlResult);
console.log("DATA:", mlResult?.data);
console.log("DATA TYPE:", typeof mlResult?.data);
console.log("================================");

const analysis =
    mlResult?.data?.analysis ??
    mlResult?.data ??
    mlResult?.analysis;

console.log("========== ANALYSIS ==========");
console.dir(analysis, { depth: null });
console.log("================================");

if (!analysis || !analysis.aggregate) {
    throw new Error(
        "ML service returned an invalid fragment analysis"
    );
}

const aggregate = analysis.aggregate;

        // --------------------------------------------------
        // 6. Extract prediction
        // --------------------------------------------------

        const prediction =
            mlResult.prediction;


        if (!prediction) {

            throw new Error(
                "ML service returned an invalid prediction"
            );
        }


        // --------------------------------------------------
        // 7. Save prediction to MySQL
        // --------------------------------------------------

        await Prediction.create({

    screening_id:
        task.screening_id,

    model_name:
        mlResult.model?.name || "MobileNetV2",

    model_version:
        mlResult.model?.version || "1.0",

    predicted_class:
        prediction.class,

    probability:
        prediction.probability,

    confidence:
        prediction.probability
});

        // --------------------------------------------------
        // 8. Return result
        // --------------------------------------------------

        const savedPrediction =
            await Prediction.findLatestByScreeningId(
                task.screening_id
            );


        return res.status(200).json({

            success: true,

            message:
                "Handwriting analysis completed successfully",

            data: {

                task_id:
                    Number(taskId),

                screening_id:
                    task.screening_id,

                image_id:
                    image.id,

                prediction:
                    savedPrediction
            }
        });

    } catch (error) {

        console.error(
            "Analyze handwriting error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Failed to analyze handwriting",

            error:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : undefined
        });
    }
};

const serveScreeningImage = async (req, res) => {
    try {
        const imageId = Number(req.params.imageId);

        if (!Number.isInteger(imageId) || imageId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid image ID"
            });
        }

        const image = await ScreeningImage.findById(imageId);

        if (!image) {
            return res.status(404).json({
                success: false,
                message: "Image not found"
            });
        }

        if (!fs.existsSync(image.file_path)) {
            return res.status(404).json({
                success: false,
                message: "Image file not found"
            });
        }

        res.setHeader(
            "Content-Type",
            image.mime_type || "image/jpeg"
        );

        return res.sendFile(
            path.resolve(image.file_path)
        );

    } catch (error) {
        console.error(
            "Serve screening image error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to serve screening image"
        });
    }
};
module.exports = {
    uploadHandwritingImage,
    getTaskImages,
    analyzeHandwriting,
    serveScreeningImage,
    analyzeHandwritingFragments
};
