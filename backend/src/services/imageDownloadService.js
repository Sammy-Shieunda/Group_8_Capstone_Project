const axios = require("axios");
const fs = require("fs");
const path = require("path");
const os = require("os");

async function downloadImageToTemp(url, originalFilename = "handwriting.jpg") {
    const extension =
        path.extname(originalFilename) || ".jpg";

    const tempFilename =
        `writeable-${Date.now()}-${Math.random()
            .toString(36)
            .substring(2)}${extension}`;

    const tempPath =
        path.join(os.tmpdir(), tempFilename);

    const response = await axios.get(url, {
        responseType: "stream",
        timeout: 30000
    });

    await new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(tempPath);

        response.data.pipe(writer);

        writer.on("finish", resolve);
        writer.on("error", reject);

        response.data.on("error", reject);
    });

    return tempPath;
}

function deleteTempImage(filePath) {
    if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}

module.exports = {
    downloadImageToTemp,
    deleteTempImage
};