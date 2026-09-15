const express = require("express");
const {
    authenticateToken,
    requirePermission
} = require("../middleware/authMiddleware");
const {
    getScreeningReport,
    getPatientReport
} = require("../controllers/reportController");

const router = express.Router();

router.get(
    "/:id/report",
    authenticateToken,
    requirePermission("view_reports"),
    getScreeningReport
);

// Kept for backward compatibility; new clients should use a screening report.
router.get(
    "/patient/:patientId",
    authenticateToken,
    requirePermission("view_reports"),
    getPatientReport
);

module.exports = router;
