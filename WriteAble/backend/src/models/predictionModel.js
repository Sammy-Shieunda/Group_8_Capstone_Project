const pool = require("../config/database");

const Prediction = {

    async create(prediction) {

        const {
            screening_id,
            task_id,
            model_name,
            model_version,
            predicted_class,
            probability,
            confidence
        } = prediction;

        const [result] = await pool.execute(
            `INSERT INTO predictions
            (
                screening_id,
                task_id,
                model_name,
                model_version,
                predicted_class,
                probability,
                confidence
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                screening_id,
                task_id,
                model_name,
                model_version,
                predicted_class,
                probability,
                confidence
            ]
        );

        return result.insertId;
    },

    async findByScreeningId(screeningId) {

        const [rows] = await pool.execute(
            `SELECT *
             FROM predictions
             WHERE screening_id = ?
             ORDER BY created_at DESC`,
            [screeningId]
        );

        return rows;
    },

    async findLatestByScreeningId(screeningId) {

        const [rows] = await pool.execute(
            `SELECT *
             FROM predictions
             WHERE screening_id = ?
             ORDER BY created_at DESC
             LIMIT 1`,
            [screeningId]
        );

        return rows[0];
    },

    async findLatestByTaskId(taskId) {

        const [rows] = await pool.execute(
            `SELECT
                id,
                screening_id,
                task_id,
                model_name,
                model_version,
                predicted_class,
                probability,
                confidence,
                created_at
             FROM predictions
             WHERE task_id = ?
             ORDER BY created_at DESC, id DESC
             LIMIT 1`,
            [taskId]
        );

        return rows[0] || null;
    }

};

module.exports = Prediction;
