const cloudinary = require("../config/cloudinary");

const uploadImage = async (filePath, folder = "writeable/handwriting") => {
    const result = await cloudinary.uploader.upload(filePath, {
        folder,
        resource_type: "image",
    });

    return {
        public_id: result.public_id,
        secure_url: result.secure_url,
        format: result.format,
        width: result.width,
        height: result.height,
    };
};

const uploadBuffer = (buffer, folder = "writeable/handwriting") => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: "image",
            },
            (error, result) => {
                if (error) {
                    return reject(error);
                }

                resolve({
                    public_id: result.public_id,
                    secure_url: result.secure_url,
                    format: result.format,
                    width: result.width,
                    height: result.height,
                });
            }
        );

        stream.end(buffer);
    });
};

const deleteImage = async (publicId) => {
    if (!publicId) return;

    await cloudinary.uploader.destroy(publicId, {
        resource_type: "image",
    });
};

module.exports = {
    uploadImage,
    uploadBuffer,
    deleteImage,
};