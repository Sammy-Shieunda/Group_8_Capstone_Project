const pool = require("../config/database");

const PatientAssignment = {

    async assignPatient({ patient_id, user_id, assigned_by }) {
        const [result] = await pool.execute(
            `INSERT INTO patient_assignments
            (
                patient_id,
                user_id,
                assigned_by
            )
            VALUES (?, ?, ?)`,
            [
                patient_id,
                user_id,
                assigned_by
            ]
        );

        return result.insertId;
    },

    async isAssigned(patientId, userId) {
        const [rows] = await pool.execute(
            `SELECT id
             FROM patient_assignments
             WHERE patient_id = ?
             AND user_id = ?
             LIMIT 1`,
            [
                patientId,
                userId
            ]
        );

        return rows.length > 0;
    },

    async getPatientsForUser(userId) {
        const [rows] = await pool.execute(
            `SELECT p.*
             FROM patients p
             INNER JOIN patient_assignments pa
                 ON p.id = pa.patient_id
             WHERE pa.user_id = ?
             ORDER BY p.created_at DESC`,
            [userId]
        );

        return rows;
    },

    async getAssignmentsForPatient(patientId) {
        const [rows] = await pool.execute(
            `SELECT
                pa.id,
                pa.patient_id,
                pa.user_id,
                pa.assigned_by,
                pa.assigned_at,
                u.first_name,
                u.last_name,
                u.email,
                u.role
             FROM patient_assignments pa
             INNER JOIN users u
                 ON pa.user_id = u.id
             WHERE pa.patient_id = ?
             ORDER BY pa.assigned_at DESC`,
            [patientId]
        );

        return rows;
    },

    async removeAssignment(patientId, userId) {
        const [result] = await pool.execute(
            `DELETE FROM patient_assignments
             WHERE patient_id = ?
             AND user_id = ?`,
            [
                patientId,
                userId
            ]
        );

        return result;
    }
};

module.exports = PatientAssignment;