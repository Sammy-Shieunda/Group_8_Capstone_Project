const bcrypt = require("bcryptjs");
const readline = require("readline");
const pool = require("./database");

const ALLOWED_ROLES = [
    "superadmin",
    "admin",
    "clinician",
    "researcher",
    "educator"
];

function ask(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => rl.question(question, answer => {
        rl.close();
        resolve(answer.trim());
    }));
}

async function main() {
    try {
        const firstName = await ask("First name: ");
        const lastName = await ask("Last name: ");
        const email = (await ask("Email: ")).toLowerCase();
        const role = (await ask(`Role (${ALLOWED_ROLES.join("/")}): `)).toLowerCase();
        const password = await ask("Initial password: ");

        if (!firstName || !lastName || !email || !password || !ALLOWED_ROLES.includes(role)) {
            throw new Error("Invalid input. Check the required fields and role.");
        }

        const [existing] = await pool.execute(
            "SELECT id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1",
            [email]
        );
        if (existing.length) throw new Error("A user with this email already exists.");

        const passwordHash = await bcrypt.hash(password, 12);
        const [result] = await pool.execute(
            `INSERT INTO users (first_name, last_name, email, password_hash, role, is_active)
             VALUES (?, ?, ?, ?, ?, 1)`,
            [firstName, lastName, email, passwordHash, role]
        );

        console.log(`Created ${role} account with user id ${result.insertId}.`);
    } catch (error) {
        console.error("Failed to create user:", error.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

main();
