const Progress = require("../models/progressModel");
const Patient = require("../models/patientModel");

const getPatientProgress = async (req, res) => {
    try {
        const { patientId } = req.params;

        const patient =
            await Patient.findById(patientId);

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient not found"
            });
        }

        const progress =
            await Progress.findByPatientId(patientId);

        res.json({
            success: true,
            count: progress.length,
            data: {
                patient,
                progress
            }
        });

    } catch (error) {
        console.error(
            "Get patient progress error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to retrieve patient progress"
        });
    }
};

module.exports = {
    getPatientProgress
};