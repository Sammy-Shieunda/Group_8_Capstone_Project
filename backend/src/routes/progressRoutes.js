const express = require("express");

const router = express.Router();

const {
    authenticateToken,
    requirePermission
} = require("../middleware/authMiddleware");

const {
    getPatientProgress
} = require("../controllers/progressController");

const {
    canAccessPatient
} = require("../middleware/patientAccessMiddleware");

router.get(
    "/patient/:patientId",
    authenticateToken,
    requirePermission("view_progress"),
    canAccessPatient,
    getPatientProgress
);

module.exports = router;