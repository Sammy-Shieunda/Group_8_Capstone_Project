const express = require("express");

const upload = require("../middleware/uploadMiddleware");

const {
    uploadHandwritingImage,
    getTaskImages,
    analyzeHandwriting,
    serveScreeningImage,
    analyzeHandwritingFragments
} = require("../controllers/screeningImageController");

const {
    authenticateToken,
    requirePermission
} = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
    "/tasks/:taskId/image",
    authenticateToken,
    requirePermission("upload_handwriting"),
    upload.single("handwriting"),
    uploadHandwritingImage
);
router.post(
    "/tasks/:taskId/analyze-fragments",
    authenticateToken,
    requirePermission("upload_handwriting"),
    analyzeHandwritingFragments
);

router.post(
    "/tasks/:taskId/analyze",
    authenticateToken,
    requirePermission("upload_handwriting"),
    analyzeHandwriting
);

router.get(
    "/tasks/:taskId/images",
    authenticateToken,
    requirePermission("view_screenings"),
    getTaskImages
);

router.get(
    "/images/:imageId/file",
    authenticateToken,
    requirePermission("view_screenings"),
    serveScreeningImage
);
module.exports = router;
