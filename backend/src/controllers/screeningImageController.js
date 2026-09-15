const fs = require("fs");
const path = require("path");

const Screening = require("../models/screeningModel");
const ScreeningImage = require("../models/screeningImageModel");
const Prediction = require("../models/predictionModel");

const {
    predictHandwriting,
    predictHandwritingFragments
} = require("../services/mlService");

const {
    uploadImage,
    deleteImage,
} = require("../services/cloudinaryService");

const {
    downloadImageToTemp,
    deleteTempImage
} = require("../services/imageDownloadService");

const uploadHandwritingImage = async (req, res) => {
    let cloudinaryImage = null;

    try {
        const { taskId } = req.params;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Handwriting image is required"
            });
        }

        // Verify that the screening task exists
        const task = await Screening.findTaskById(taskId);

        if (!task) {
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }

            return res.status(404).json({
                success: false,
                message: "Screening task not found"
            });
        }

        // Upload the temporary Multer file to Cloudinary
        cloudinaryImage = await uploadImage(
            req.file.path,
            "writeable/handwriting"
        );

        console.log(
            `Image uploaded to Cloudinary: ${cloudinaryImage.secure_url}`
        );

        // Save image metadata + Cloudinary information
        const imageId = await ScreeningImage.create({
            task_id: taskId,

            original_filename:
                req.file.originalname,

            stored_filename:
                req.file.filename,

            // Keep this temporarily for backward compatibility
            file_path:
                req.file.path,

            mime_type:
                req.file.mimetype,

            file_size:
                req.file.size,

            cloudinary_public_id:
                cloudinaryImage.public_id,

            cloudinary_url:
                cloudinaryImage.secure_url
        });

        // Delete the temporary local file
        if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        const image =
            await ScreeningImage.findById(imageId);

        return res.status(201).json({
            success: true,
            message: "Handwriting image uploaded successfully",

            data: {
                image
            }
        });

    } catch (error) {
        console.error(
            "Upload handwriting image error:",
            error
        );

        // Delete Cloudinary upload if database saving failed
        if (cloudinaryImage?.public_id) {
            try {
                await deleteImage(cloudinaryImage.public_id);
            } catch (cleanupError) {
                console.error(
                    "Cloudinary cleanup error:",
                    cleanupError.message
                );
            }
        }

        // Delete temporary local file
        if (
            req.file &&
            fs.existsSync(req.file.path)
        ) {
            fs.unlinkSync(req.file.path);
        }

        return res.status(500).json({
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
    let tempImagePath = null;

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

        // 3. Use the most recently uploaded image
        const image = images[0];

        // 4. Cloudinary image is now the source of truth
        if (!image.cloudinary_url) {
            return res.status(404).json({
                success: false,
                message: "Cloudinary image URL not found"
            });
        }

        console.log(
            `Downloading image ${image.id} from Cloudinary...`
        );

        // 5. Download Cloudinary image to temporary filesystem
        tempImagePath = await downloadImageToTemp(
            image.cloudinary_url,
            image.original_filename
        );

        console.log(
            `Temporary image created: ${tempImagePath}`
        );

        // 6. Send temporary file to FastAPI
        console.log(
            `Sending image ${image.id} to fragment ML service...`
        );

        const mlResult = await predictHandwritingFragments(
            tempImagePath,
            image.original_filename
        );

        console.log("========== FASTAPI RESPONSE ==========");
        console.dir(mlResult, { depth: null });
        console.log("======================================");

        // 7. Extract analysis
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

        // 8. Save task-level prediction
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

        // 9. Mark task complete
        await Screening.completeTask(taskId);

        // 10. Return result
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

    } finally {
        // Always remove temporary downloaded image
        if (tempImagePath) {
            try {
                deleteTempImage(tempImagePath);

                console.log(
                    `Temporary image deleted: ${tempImagePath}`
                );
            } catch (cleanupError) {
                console.error(
                    "Temporary image cleanup error:",
                    cleanupError.message
                );
            }
        }
    }
};
const analyzeHandwriting = async (req, res) => {
    let tempImagePath = null;

    try {
        const { taskId } = req.params;

        // 1. Verify task exists
        const task =
            await Screening.findTaskById(taskId);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Screening task not found"
            });
        }

        // 2. Find uploaded handwriting image
        const images =
            await ScreeningImage.findByTaskId(taskId);

        if (!images || images.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No handwriting image found for this task"
            });
        }

        // 3. Use most recently uploaded image
        const image = images[0];

        // 4. Cloudinary must contain the image
        if (!image.cloudinary_url) {
            return res.status(404).json({
                success: false,
                message: "Cloudinary image URL not found"
            });
        }

        console.log(
            `Downloading image ${image.id} from Cloudinary...`
        );

        // 5. Download to temporary filesystem
        tempImagePath =
            await downloadImageToTemp(
                image.cloudinary_url,
                image.original_filename
            );

        console.log(
            `Temporary image created: ${tempImagePath}`
        );

        // 6. Send image to ML service
        console.log(
            `Sending image ${image.id} to ML service...`
        );

        const mlResult =
            await predictHandwritingFragments(
                tempImagePath,
                image.original_filename
            );

        console.log("========== ML RESULT ==========");
        console.dir(mlResult, { depth: null });
        console.log("================================");

        // 7. Extract analysis
        const analysis =
            mlResult?.data?.analysis ??
            mlResult?.data ??
            mlResult?.analysis;

        if (!analysis || !analysis.aggregate) {
            throw new Error(
                "ML service returned an invalid fragment analysis"
            );
        }

        const aggregate =
            analysis.aggregate;

        // 8. Extract prediction
        const prediction =
            mlResult.prediction ||
            {
                class: aggregate.prediction,
                probability: aggregate.mean_probability
            };

        if (!prediction || !prediction.class) {
            throw new Error(
                "ML service returned an invalid prediction"
            );
        }

        // 9. Save prediction
        await Prediction.create({
            screening_id:
                task.screening_id,

            task_id:
                Number(taskId),

            model_name:
                mlResult.model?.name ||
                analysis.model_name ||
                "MobileNetV2",

            model_version:
                mlResult.model?.version ||
                analysis.model_version ||
                "1.0",

            predicted_class:
                prediction.class,

            probability:
                prediction.probability,

            confidence:
                prediction.probability
        });

        // 10. Get saved prediction
        const savedPrediction =
            await Prediction.findLatestByScreeningId(
                task.screening_id
            );

        // 11. Return result
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

    } finally {
        // Always remove temporary file
        if (tempImagePath) {
            try {
                deleteTempImage(tempImagePath);

                console.log(
                    `Temporary image deleted: ${tempImagePath}`
                );
            } catch (cleanupError) {
                console.error(
                    "Temporary image cleanup error:",
                    cleanupError.message
                );
            }
        }
    }
};
const serveScreeningImage = async (req, res) => {
    try {
        const imageId =
            Number(req.params.imageId);

        if (
            !Number.isInteger(imageId) ||
            imageId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid image ID"
            });
        }

        const image =
            await ScreeningImage.findById(imageId);

        if (!image) {
            return res.status(404).json({
                success: false,
                message: "Image not found"
            });
        }

        // Cloudinary is now the primary image source
        if (image.cloudinary_url) {
            return res.redirect(
                image.cloudinary_url
            );
        }

        // Fallback for legacy images
        if (
            image.file_path &&
            fs.existsSync(image.file_path)
        ) {
            res.setHeader(
                "Content-Type",
                image.mime_type || "image/jpeg"
            );

            return res.sendFile(
                path.resolve(image.file_path)
            );
        }

        return res.status(404).json({
            success: false,
            message: "Image file not found"
        });

    } catch (error) {
        console.error(
            "Serve screening image error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to serve screening image"
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
