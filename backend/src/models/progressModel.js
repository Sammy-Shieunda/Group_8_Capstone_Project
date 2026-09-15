const pool = require("../config/database");

const Progress = {

    async findByPatientId(patientId) {
        const [rows] = await pool.execute(
            `SELECT
                pr.*,
                s.screening_code,
                s.completed_at
             FROM progress_records pr
             INNER JOIN screenings s
                ON pr.screening_id = s.id
             WHERE pr.patient_id = ?
             ORDER BY pr.created_at ASC`,
            [patientId]
        );

        return rows;
    },

    async findLatestByPatientId(patientId) {
        const [rows] = await pool.execute(
            `SELECT *
             FROM progress_records
             WHERE patient_id = ?
             ORDER BY created_at DESC
             LIMIT 1`,
            [patientId]
        );

        return rows[0];
    },

    async create(progress) {
        const {
            patient_id,
            screening_id,
            overall_score,
            previous_score,
            change_percentage,
            trend
        } = progress;

        const [result] = await pool.execute(
            `INSERT INTO progress_records
            (
                patient_id,
                screening_id,
                overall_score,
                previous_score,
                change_percentage,
                trend
            )
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                patient_id,
                screening_id,
                overall_score,
                previous_score,
                change_percentage,
                trend
            ]
        );

        return result.insertId;
    }

};

module.exports = Progress;