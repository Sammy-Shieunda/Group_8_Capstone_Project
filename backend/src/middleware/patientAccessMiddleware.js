const PatientAssignment = require("../models/patientAssignmentModel");

const canAccessPatient = async (req, res, next) => {
    try {
        const patientId =
            req.params.id ||
            req.params.patientId ||
            req.body.patient_id;

        if (!patientId) {
            return res.status(400).json({
                success: false,
                message: "Patient ID is required"
            });
        }

        const role = req.user.role;

        // Administrators have broad access
        if (
            role === "superadmin" ||
            role === "admin"
        ) {
            return next();
        }

        // Clinicians and educators can only access
        // patients assigned to them.
        if (
            role === "clinician" ||
            role === "educator"
        ) {
            const assigned =
                await PatientAssignment.isAssigned(
                    patientId,
                    req.user.userId
                );

            if (!assigned) {
                return res.status(403).json({
                    success: false,
                    message: "You do not have access to this patient"
                });
            }

            return next();
        }

        // Researchers do not get direct patient access.
        if (role === "researcher") {
            return res.status(403).json({
                success: false,
                message: "Direct patient access is not permitted for researchers"
            });
        }

        return res.status(403).json({
            success: false,
            message: "You do not have permission to access this patient"
        });

    } catch (error) {
        console.error(
            "Patient access check error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to verify patient access"
        });
    }
};

module.exports = {
    canAccessPatient
};