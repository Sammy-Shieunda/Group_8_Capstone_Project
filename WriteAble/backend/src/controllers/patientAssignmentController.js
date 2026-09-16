const PatientAssignment = require("../models/patientAssignmentModel");
const Patient = require("../models/patientModel");
const User = require("../models/userModel");

const assignPatient = async (req, res) => {
    try {
        const { patient_id, user_id } = req.body;

        if (!patient_id || !user_id) {
            return res.status(400).json({
                success: false,
                message: "patient_id and user_id are required"
            });
        }

        const patient = await Patient.findById(patient_id);

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient not found"
            });
        }

        const user = await User.findById(user_id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (
            user.role !== "clinician" &&
            user.role !== "educator"
        ) {
            return res.status(400).json({
                success: false,
                message: "Patients can only be assigned to clinicians or educators"
            });
        }

        const alreadyAssigned =
            await PatientAssignment.isAssigned(
                patient_id,
                user_id
            );

        if (alreadyAssigned) {
            return res.status(409).json({
                success: false,
                message: "Patient is already assigned to this user"
            });
        }

        const assignmentId =
            await PatientAssignment.assignPatient({
                patient_id,
                user_id,
                assigned_by: req.user.userId
            });

        const assignments =
            await PatientAssignment.getAssignmentsForPatient(
                patient_id
            );

        res.status(201).json({
            success: true,
            message: "Patient assigned successfully",
            data: {
                assignment_id: assignmentId,
                patient_id,
                user_id,
                assigned_by: req.user.userId,
                assignments
            }
        });

    } catch (error) {
        console.error(
            "Assign patient error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to assign patient"
        });
    }
};


const getPatientAssignments = async (req, res) => {
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

        const assignments =
            await PatientAssignment.getAssignmentsForPatient(
                patientId
            );

        res.json({
            success: true,
            count: assignments.length,
            data: assignments
        });

    } catch (error) {
        console.error(
            "Get patient assignments error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to retrieve patient assignments"
        });
    }
};


const removeAssignment = async (req, res) => {
    try {
        const {
            patientId,
            userId
        } = req.params;

        const result =
            await PatientAssignment.removeAssignment(
                patientId,
                userId
            );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Assignment not found"
            });
        }

        res.json({
            success: true,
            message: "Patient assignment removed successfully"
        });

    } catch (error) {
        console.error(
            "Remove assignment error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to remove patient assignment"
        });
    }
};


module.exports = {
    assignPatient,
    getPatientAssignments,
    removeAssignment
};