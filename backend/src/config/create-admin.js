const bcrypt = require("bcryptjs");
const pool = require("./database");

async function createAdmin() {

    try {

        const password = process.env.ADMIN_INITIAL_PASSWORD;

        if (!password) {
            throw new Error(
                "ADMIN_INITIAL_PASSWORD is missing from .env"
            );
        }

        const passwordHash =
            await bcrypt.hash(password, 12);

        await pool.execute(
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
                "System",
                "Administrator",
                "admin@writeable-platform.org",
                passwordHash,
                "admin"
            ]
        );

        console.log(
            "Admin account created successfully."
        );

        process.exit(0);

    } catch (error) {

        console.error(
            "Failed to create admin:",
            error.message
        );

        process.exit(1);
    }
}

createAdmin();