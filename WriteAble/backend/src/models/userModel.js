const pool = require("../config/database");

const User = {

    async findByEmail(email) {

        const [rows] = await pool.execute(
            `SELECT *
             FROM users
             WHERE email = ?
             LIMIT 1`,
            [email]
        );

        return rows[0];
    },

    async findById(id) {

        const [rows] = await pool.execute(
            `SELECT
                id,
                first_name,
                last_name,
                email,
                role,
                is_active,
                created_at,
                updated_at
             FROM users
             WHERE id = ?
             LIMIT 1`,
            [id]
        );

        return rows[0];
    },
    async findAll() {
    const [rows] = await pool.execute(
        `SELECT
            id,
            first_name,
            last_name,
            email,
            role,
            is_active,
            created_at,
            updated_at
         FROM users
         ORDER BY created_at DESC`
    );

    return rows;
},
    async create(user) {

        const {
            first_name,
            last_name,
            email,
            password_hash,
            role
        } = user;

        const [result] = await pool.execute(
            `INSERT INTO users
            (
                first_name,
                last_name,
                email,
                password_hash,
                role
            )
            VALUES (?, ?, ?, ?, ?)`,
            [
                first_name,
                last_name,
                email,
                password_hash,
                role
            ]
        );

        return result.insertId;
    }

};

module.exports = User;