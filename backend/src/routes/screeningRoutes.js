const express = require("express");
const {
    startScreening,
    createScreeningTask,
    getScreening,
    getPatientScreenings,
    completeScreening,
    getAllScreenings
} = require("../controllers/screeningController");
const {
    authenticateToken,
    requirePermission
} = require("../middleware/authMiddleware");

const router = express.Router();

// Start a new screening
router.post(
    "/start",
    authenticateToken,
    requirePermission("create_screenings"),
    startScreening
);

router.post(
    "/:id/tasks",
    authenticateToken,
    requirePermission("create_screenings"),
    createScreeningTask
);

// Get all screenings
router.get(
    "/",
    authenticateToken,
    requirePermission("view_screenings"),
    getAllScreenings
);

// Get screenings for a patient
router.get(
    "/patient/:patientId",
    authenticateToken,
    requirePermission("view_screenings"),
    getPatientScreenings
);

// Complete a screening
router.patch(
    "/:id/complete",
    authenticateToken,
    requirePermission("complete_screenings"),
    completeScreening
);

// Get a specific screening
router.get(
    "/:id",
    authenticateToken,
    requirePermission("view_screenings"),
    getScreening
);

module.exports = router;