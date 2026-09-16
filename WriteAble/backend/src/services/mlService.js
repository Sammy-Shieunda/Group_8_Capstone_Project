const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

const ML_SERVICE_URL =
    process.env.ML_SERVICE_URL || "http://127.0.0.1:8000";

async function predictHandwriting(filePath, originalFilename) {
    const form = new FormData();

    form.append(
        "file",
        fs.createReadStream(filePath),
        {
            filename: originalFilename
        }
    );

    try {
        const response = await axios.post(
            `${ML_SERVICE_URL}/predict`,
            form,
            {
                headers: {
                    ...form.getHeaders()
                },
                timeout: 120000,
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            }
        );

        return response.data;

    } catch (error) {
        if (error.response) {
            throw new Error(
                `ML service error: ${error.response.status} - ${
                    JSON.stringify(error.response.data)
                }`
            );
        }

        if (error.code === "ECONNREFUSED") {
            throw new Error(
                "ML service unavailable. Make sure FastAPI is running on port 8000."
            );
        }

        throw new Error(
            `Failed to communicate with ML service: ${error.message}`
        );
    }
}
async function predictHandwritingFragments(filePath, originalFilename) {
    const form = new FormData();

    form.append(
        "file",
        fs.createReadStream(filePath),
        { filename: originalFilename }
    );

    try {
        const response = await axios.post(
            `${ML_SERVICE_URL}/predict-fragments`,
            form,
            {
                headers: {
                    ...form.getHeaders()
                },
                timeout: 120000,
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            }
        );

        console.log("========== FASTAPI RESPONSE ==========");
        console.dir(response.data, { depth: null });
        console.log("======================================");

        return response.data;

    } catch (error) {
        if (error.response) {
            console.error(
                "FastAPI fragment error:",
                error.response.status,
                error.response.data
            );

            throw new Error(
                `ML fragment service error: ${error.response.status} - ${JSON.stringify(error.response.data)}`
            );
        }

        if (error.code === "ECONNREFUSED") {
            throw new Error(
                "ML service unavailable. Make sure FastAPI is running on port 8000."
            );
        }

        throw new Error(
            `Failed to communicate with ML fragment service: ${error.message}`
        );
    }
}
module.exports = {
    predictHandwriting,
    predictHandwritingFragments
};