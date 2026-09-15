const pool = require("./database");

async function testDatabase() {
    try {
        const [rows] = await pool.query("SELECT DATABASE() AS database_name");

        console.log("MySQL connection successful!");
        console.log("Database:", rows[0].database_name);

        process.exit(0);
    } catch (error) {
        console.error("MySQL connection failed:");
        console.error(error.message);

        process.exit(1);
    }
}

testDatabase();