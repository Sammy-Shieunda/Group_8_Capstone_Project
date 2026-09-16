const ReportService = require("../services/reportService");
const PatientAssignment = require("../models/patientAssignmentModel");

async function assertScreeningAccess(report, user) {
    if (!report) return false;

    if (user.role === "superadmin" || user.role === "admin") return true;

    if (user.role === "researcher") return false;

    if (user.role === "clinician" || user.role === "educator") {
        return PatientAssignment.isAssigned(report.screening.patient_id, user.userId);
    }

    return false;
}

const getScreeningReport = async (req, res) => {
    try {
        const report = await ReportService.getScreeningReport(req.params.id);

        if (!report) {
            return res.status(404).json({
                success: false,
                message: "Screening report not found"
            });
        }

        const allowed = await assertScreeningAccess(report, req.user);
        if (!allowed) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to view this screening report"
            });
        }

        return res.json({ success: true, data: report });
    } catch (error) {
    console.error("Generate screening report error:", error);

    res.status(500).json({
        success: false,
        message: error.message || "Failed to generate screening report",
        error: process.env.NODE_ENV === "development"
            ? error.stack
            : undefined
    });
}
};

const getPatientReport = async (req, res) => {
    return res.status(501).json({
        success: false,
        message: "Patient-level reports are not enabled. Use a screening report."
    });
};

module.exports = {
    getScreeningReport,
    getPatientReport
};
