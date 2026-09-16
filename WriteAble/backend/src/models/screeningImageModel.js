const pool = require("../config/database");

const ScreeningImage = {

    async create(image) {

        const {
            task_id,
            original_filename,
            stored_filename,
            file_path,
            mime_type,
            file_size,
            cloudinary_public_id,
            cloudinary_url
        } = image;

        const [result] = await pool.execute(
            `INSERT INTO screening_images
            (
                task_id,
                original_filename,
                stored_filename,
                file_path,
                mime_type,
                file_size,
                cloudinary_public_id,
                cloudinary_url
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                task_id,
                original_filename,
                stored_filename,
                file_path,
                mime_type,
                file_size,
                cloudinary_public_id || null,
                cloudinary_url || null
            ]
        );

        return result.insertId;
    },

    async findByTaskId(taskId) {

        const [rows] = await pool.execute(
            `SELECT *
             FROM screening_images
             WHERE task_id = ?
             ORDER BY uploaded_at DESC`,
            [taskId]
        );

        return rows;
    },

    async findById(id) {

        const [rows] = await pool.execute(
            `SELECT *
             FROM screening_images
             WHERE id = ?`,
            [id]
        );

        return rows[0];
    }
};

module.exports = ScreeningImage;
