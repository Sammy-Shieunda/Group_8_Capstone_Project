const pool = require("../config/database");

const Patient = {

    // =========================================================
    // CREATE PATIENT
    // =========================================================

    async create(patient) {

        const {
            patient_code,
            first_name,
            last_name,
            date_of_birth,
            age,
            grade,
            dominant_hand
        } = patient;


        const [result] = await pool.execute(
            `INSERT INTO patients
            (
                patient_code,
                first_name,
                last_name,
                date_of_birth,
                age,
                grade,
                dominant_hand
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                patient_code,
                first_name,
                last_name,
                date_of_birth || null,
                age || null,
                grade || null,
                dominant_hand || "unknown"
            ]
        );


        return result.insertId;
    },


    // =========================================================
    // GET ALL PATIENTS
    //
    // Returns real patient records plus their latest
    // screening information.
    // =========================================================

    async findAll() {

        const [rows] = await pool.execute(
            `SELECT

                p.id,

                p.patient_code,

                p.first_name,

                p.last_name,

                p.date_of_birth,

                p.age,

                p.grade,

                p.dominant_hand,

                p.created_at,


                COUNT(DISTINCT s.id)
                    AS screening_count,


                MAX(
                    COALESCE(
                        s.started_at,
                        s.created_at
                    )
                )
                    AS last_screening_at,


                (
                    SELECT
                        s2.overall_indicator

                    FROM screenings s2

                    WHERE
                        s2.patient_id = p.id

                    ORDER BY
                        COALESCE(
                            s2.started_at,
                            s2.created_at
                        ) DESC,
                        s2.id DESC

                    LIMIT 1

                )
                    AS latest_indicator,


                (
                    SELECT
                        s3.status

                    FROM screenings s3

                    WHERE
                        s3.patient_id = p.id

                    ORDER BY
                        COALESCE(
                            s3.started_at,
                            s3.created_at
                        ) DESC,
                        s3.id DESC

                    LIMIT 1

                )
                    AS latest_screening_status


            FROM patients p


            LEFT JOIN screenings s

                ON s.patient_id = p.id


            GROUP BY

                p.id,

                p.patient_code,

                p.first_name,

                p.last_name,

                p.date_of_birth,

                p.age,

                p.grade,

                p.dominant_hand,

                p.created_at


            ORDER BY

                p.created_at DESC,

                p.id DESC`
        );


        return rows;
    },


    // =========================================================
    // GET PATIENT BY CODE
    // =========================================================

    async findByCode(patientCode) {

        const [rows] = await pool.execute(
            `SELECT
                id,
                patient_code,
                first_name,
                last_name,
                date_of_birth,
                age,
                grade,
                dominant_hand,
                created_at
             FROM patients
             WHERE patient_code = ?`,
            [patientCode]
        );

        return rows[0] || null;
    },


    // =========================================================
    // GET PATIENT BY ID
    // =========================================================

    async findById(id) {

        const [rows] = await pool.execute(
            `SELECT

                id,

                patient_code,

                first_name,

                last_name,

                date_of_birth,

                age,

                grade,

                dominant_hand,

                created_at

             FROM patients

             WHERE id = ?`,
            [id]
        );


        return rows[0] || null;
    },


    // =========================================================
    // GET PATIENT SCREENING HISTORY
    // =========================================================

    async findScreenings(id) {

        const [rows] = await pool.execute(
            `SELECT

                s.id,

                s.patient_id,

                s.screening_code,

                s.participation_id,

                s.status,

                s.started_at,

                s.completed_at,

                s.overall_indicator,

                s.indicator_score,

                s.model_version,

                s.created_at

             FROM screenings s

             WHERE s.patient_id = ?

             ORDER BY

                COALESCE(
                    s.started_at,
                    s.created_at
                ) DESC,

                s.id DESC`,
            [id]
        );


        return rows;
    },


    // =========================================================
    // GET PATIENT WITH SCREENINGS
    //
    // Useful for the patient profile page.
    // =========================================================

    async findByIdWithScreenings(id) {

        const patient =
            await this.findById(id);


        if (!patient) {
            return null;
        }


        const screenings =
            await this.findScreenings(id);


        return {
            ...patient,
            screenings
        };
    },


    // =========================================================
    // UPDATE PATIENT
    // =========================================================

    async update(id, patient) {

        const {
            first_name,
            last_name,
            date_of_birth,
            age,
            grade,
            dominant_hand
        } = patient;


        const [result] = await pool.execute(
            `UPDATE patients

             SET

                first_name = ?,

                last_name = ?,

                date_of_birth = ?,

                age = ?,

                grade = ?,

                dominant_hand = ?

             WHERE id = ?`,
            [
                first_name,
                last_name,
                date_of_birth || null,
                age || null,
                grade || null,
                dominant_hand || "unknown",
                id
            ]
        );


        return result;
    },


    // =========================================================
    // DELETE PATIENT
    // =========================================================

    async delete(id) {

        const [result] = await pool.execute(
            `DELETE FROM patients

             WHERE id = ?`,
            [id]
        );


        return result;
    }

};


module.exports = Patient;