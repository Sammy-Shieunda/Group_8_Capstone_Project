const Patient = require("../models/patientModel");
const PatientAssignment = require("../models/patientAssignmentModel");


// ============================================================
// CREATE PATIENT
// ============================================================

const createPatient = async (req, res) => {

    try {

        const {
            patient_code,
            first_name,
            last_name,
            date_of_birth,
            age,
            grade,
            dominant_hand
        } = req.body;


        // ------------------------------------------------------
        // VALIDATION
        // ------------------------------------------------------

        if (!patient_code) {

            return res.status(400).json({
                success: false,
                message: "patient_code is required"
            });

        }


        if (!first_name) {

            return res.status(400).json({
                success: false,
                message: "first_name is required"
            });

        }


        if (!last_name) {

            return res.status(400).json({
                success: false,
                message: "last_name is required"
            });

        }


        if (
            age !== undefined &&
            age !== null &&
            (
                Number.isNaN(
                    Number(age)
                ) ||
                Number(age) < 1 ||
                Number(age) > 18
            )
        ) {

            return res.status(400).json({
                success: false,
                message: "age must be between 1 and 18"
            });

        }


        if (!grade) {

            return res.status(400).json({
                success: false,
                message: "grade is required"
            });

        }


        // ------------------------------------------------------
        // CREATE
        // ------------------------------------------------------

        const patientId =
            await Patient.create({

                patient_code,

                first_name,

                last_name,

                date_of_birth:
                    date_of_birth || null,

                age:
                    age !== undefined
                        ? Number(age)
                        : null,

                grade,

                dominant_hand:
                    dominant_hand ||
                    "unknown"

            });


        // ------------------------------------------------------
        // FETCH CREATED PATIENT
        // ------------------------------------------------------

        const patient =
            await Patient.findById(
                patientId
            );


        return res.status(201).json({

            success: true,

            message:
                "Patient created successfully",

            data: patient

        });


    } catch (error) {

        console.error(
            "Create patient error:",
            error
        );


        // Duplicate patient code

        if (
            error.code ===
            "ER_DUP_ENTRY"
        ) {

            return res.status(409).json({

                success: false,

                message:
                    "Patient code already exists"

            });

        }


        return res.status(500).json({

            success: false,

            message:
                "Failed to create patient"

        });

    }
};



// ============================================================
// GET ALL PATIENTS
// ============================================================

const getPatients = async (req, res) => {

    try {

        const role =
            req.user.role;


        let patients;


        // ------------------------------------------------------
        // ADMIN / SUPERADMIN
        // ------------------------------------------------------

        if (

            role === "superadmin" ||

            role === "admin"

        ) {

            patients =
                await Patient.findAll();

        }


        // ------------------------------------------------------
        // CLINICIAN / EDUCATOR
        // ------------------------------------------------------

        else if (

            role === "clinician" ||

            role === "educator"

        ) {

            patients =
                await PatientAssignment
                    .getPatientsForUser(
                        req.user.userId
                    );

        }


        // ------------------------------------------------------
        // RESEARCHER
        // ------------------------------------------------------

        else if (
            role === "researcher"
        ) {

            return res.status(403).json({

                success: false,

                message:
                    "Direct patient access is not permitted for researchers"

            });

        }


        // ------------------------------------------------------
        // UNKNOWN ROLE
        // ------------------------------------------------------

        else {

            return res.status(403).json({

                success: false,

                message:
                    "You do not have permission to view patients"

            });

        }


        // ------------------------------------------------------
        // RESPONSE
        // ------------------------------------------------------

        return res.json({

            success: true,

            count:
                patients.length,

            data:
                patients

        });


    } catch (error) {

        console.error(
            "Get patients error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to retrieve patients"

        });

    }
};



// ============================================================
// GET SINGLE PATIENT
// ============================================================

const getPatient = async (req, res) => {

    try {

        const {
            id
        } = req.params;


        // ------------------------------------------------------
        // VALIDATE ID
        // ------------------------------------------------------

        const patientId =
            Number(id);


        if (
            !Number.isInteger(
                patientId
            ) ||
            patientId <= 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid patient ID"

            });

        }


        // ------------------------------------------------------
        // FIND PATIENT
        // ------------------------------------------------------

        const patient =
            await Patient.findById(
                patientId
            );


        if (!patient) {

            return res.status(404).json({

                success: false,

                message:
                    "Patient not found"

            });

        }


        // ------------------------------------------------------
        // SCREENING HISTORY
        // ------------------------------------------------------

        const screenings =
            await Patient.findScreenings(
                patientId
            );


        // ------------------------------------------------------
        // RESPONSE
        // ------------------------------------------------------

        return res.json({

            success: true,

            data: {

                ...patient,

                screenings

            }

        });


    } catch (error) {

        console.error(
            "Get patient error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to retrieve patient"

        });

    }
};



// ============================================================
// UPDATE PATIENT
// ============================================================

const updatePatient = async (req, res) => {

    try {

        const {
            id
        } = req.params;


        const patientId =
            Number(id);


        if (
            !Number.isInteger(
                patientId
            ) ||
            patientId <= 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid patient ID"

            });

        }


        // ------------------------------------------------------
        // CHECK EXISTENCE
        // ------------------------------------------------------

        const existingPatient =
            await Patient.findById(
                patientId
            );


        if (!existingPatient) {

            return res.status(404).json({

                success: false,

                message:
                    "Patient not found"

            });

        }


        // ------------------------------------------------------
        // UPDATE
        // ------------------------------------------------------

        await Patient.update(
            patientId,
            req.body
        );


        // ------------------------------------------------------
        // RETURN UPDATED PATIENT
        // ------------------------------------------------------

        const updatedPatient =
            await Patient.findById(
                patientId
            );


        return res.json({

            success: true,

            message:
                "Patient updated successfully",

            data:
                updatedPatient

        });


    } catch (error) {

        console.error(
            "Update patient error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to update patient"

        });

    }
};



// ============================================================
// DELETE PATIENT
// ============================================================

const deletePatient = async (req, res) => {

    try {

        const {
            id
        } = req.params;


        const patientId =
            Number(id);


        if (
            !Number.isInteger(
                patientId
            ) ||
            patientId <= 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid patient ID"

            });

        }


        // ------------------------------------------------------
        // CHECK EXISTENCE
        // ------------------------------------------------------

        const existingPatient =
            await Patient.findById(
                patientId
            );


        if (!existingPatient) {

            return res.status(404).json({

                success: false,

                message:
                    "Patient not found"

            });

        }


        // ------------------------------------------------------
        // DELETE
        // ------------------------------------------------------

        const result =
            await Patient.delete(
                patientId
            );


        if (
            result.affectedRows === 0
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "Patient not found"

            });

        }


        return res.json({

            success: true,

            message:
                "Patient deleted successfully"

        });


    } catch (error) {

        console.error(
            "Delete patient error:",
            error
        );


        // Foreign-key protection

        if (
            error.code ===
            "ER_ROW_IS_REFERENCED_2"
        ) {

            return res.status(409).json({

                success: false,

                message:
                    "Patient cannot be deleted because related screening records exist"

            });

        }


        return res.status(500).json({

            success: false,

            message:
                "Failed to delete patient"

        });

    }
};



// ============================================================
// EXPORTS
// ============================================================

module.exports = {

    createPatient,

    getPatients,

    getPatient,

    updatePatient,

    deletePatient

};