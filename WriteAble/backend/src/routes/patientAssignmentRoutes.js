const express = require("express");

const router = express.Router();

const {
    authenticateToken,
    requireRole
} = require("../middleware/authMiddleware");

const {
    assignPatient,
    getPatientAssignments,
    removeAssignment
} = require("../controllers/patientAssignmentController");


// Assign a patient
router.post(
    "/",
    authenticateToken,
    requireRole("superadmin", "admin"),
    assignPatient
);


// View assignments for a patient
router.get(
    "/patient/:patientId",
    authenticateToken,
    requireRole("superadmin", "admin"),
    getPatientAssignments
);


// Remove assignment
router.delete(
    "/:patientId/:userId",
    authenticateToken,
    requireRole("superadmin", "admin"),
    removeAssignment
);


module.exports = router;