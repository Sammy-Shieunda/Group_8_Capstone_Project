const multer = require("multer");
const path = require("path");
const crypto = require("crypto");

const storage = multer.diskStorage({

    destination: (req, file, cb) => {
        cb(null, "uploads/handwriting/");
    },

    filename: (req, file, cb) => {

        const uniqueName =
            `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${path.extname(file.originalname)}`;

        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {

    console.log("========== FILE RECEIVED ==========");
    console.log("Filename:", file.originalname);
    console.log("MIME type:", file.mimetype);
    console.log("===================================");

    const allowedMimeTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    const allowedExtensions = [
        ".jpg",
        ".jpeg",
        ".png",
        ".webp"
    ];

    const extension = path.extname(file.originalname).toLowerCase();

    if (
        allowedMimeTypes.includes(file.mimetype) ||
        (
            file.mimetype === "application/octet-stream" &&
            allowedExtensions.includes(extension)
        )
    ) {
        cb(null, true);
    } else {

        console.log("REJECTED:", {
            mimetype: file.mimetype,
            extension: extension
        });

        cb(new Error("Only JPEG, PNG, and WebP images are allowed."));
    }
};

const upload = multer({
    storage,
    fileFilter,

    limits: {
        fileSize: 10 * 1024 * 1024
    }
});

module.exports = upload;

/* This gives us:
JPEG support
PNG support
WebP support
10 MB maximum
unique filenames
storage outside src
rejection of unsupported file types
*/