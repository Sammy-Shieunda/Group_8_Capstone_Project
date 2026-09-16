const express = require("express");

const router = express.Router();

const {
    authenticateToken,
    requirePermission
} = require("../middleware/authMiddleware");

const {
    getPatients,
    getPatient,
    createPatient
} = require("../controllers/patientController");

const {
    canAccessPatient
} = require("../middleware/patientAccessMiddleware");

// View all patients
router.get(
    "/",
    authenticateToken,
    requirePermission("view_patients"),
    getPatients
);

// View one patient
router.get(
    "/:id",
    authenticateToken,
    requirePermission("view_patients"),
    canAccessPatient,
    getPatient
);

// Create a patient
router.post(
    "/",
    authenticateToken,
    requirePermission("create_patients"),
    createPatient
);

module.exports = router;