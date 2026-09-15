const pool = require("../config/database");


const Screening = {

    async create(screening) {
        const {
            screening_code,
            patient_id,
            assessor_id
        } = screening;

        const [result] = await pool.execute(
            `INSERT INTO screenings
            (
                screening_code,
                patient_id,
                assessor_id
            )
            VALUES (?, ?, ?)`,
            [
                screening_code,
                patient_id,
                assessor_id
            ]
        );

        return result.insertId;
    },


    async updateParticipationId(screeningId, participationId) {
        const [result] = await pool.execute(
            `UPDATE screenings
             SET participation_id = ?
             WHERE id = ?`,
            [participationId, screeningId]
        );

        return result.affectedRows;
    },


    // your existing functions continue below...

    async findById(id) {

        const [rows] = await pool.execute(
            `SELECT *
             FROM screenings
             WHERE id = ?`,
            [id]
        );

        return rows[0];
    },

    async findByPatientId(patientId) {

        const [rows] = await pool.execute(
            `SELECT *
             FROM screenings
             WHERE patient_id = ?
             ORDER BY created_at DESC`,
            [patientId]
        );

        return rows;
    },
async getAll() {

    const [rows] = await pool.execute(
        `SELECT
            id,
            screening_code,
            participation_id,
            status,
            started_at,
            completed_at,
            overall_indicator,
            indicator_score,
            model_version,
            created_at
         FROM screenings
         ORDER BY started_at DESC, id DESC`
    );

    return rows;
},
    async getDashboardSummary() {
        const [[kpis]] = await pool.execute(
            `SELECT
                COUNT(*) AS total_screenings,
                COALESCE(SUM(started_at >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01')), 0) AS screenings_this_month,
                COALESCE(SUM(status = 'completed'), 0) AS completed_screenings,
                COALESCE(SUM(status <> 'completed'), 0) AS incomplete_screenings,
                COALESCE(SUM(overall_indicator = 'higher'), 0) AS higher_indicator_results
             FROM screenings`
        );

        const [[patients]] = await pool.execute(
            `SELECT COUNT(*) AS total_patients FROM patients`
        );

        const [outcomeRows] = await pool.execute(
            `SELECT overall_indicator, COUNT(*) AS count
             FROM screenings
             WHERE status = 'completed'
             GROUP BY overall_indicator`
        );

        const [recentScreenings] = await pool.execute(
            `SELECT
                id,
                screening_code,
                participation_id,
                status,
                overall_indicator,
                started_at,
                completed_at
             FROM screenings
             ORDER BY started_at DESC, id DESC
             LIMIT 8`
        );

        const outcomes = {
            low: 0,
            moderate: 0,
            higher: 0,
            inconclusive: 0
        };

        outcomeRows.forEach(row => {
            if (row.overall_indicator in outcomes) {
                outcomes[row.overall_indicator] = Number(row.count);
            }
        });

        return {
            kpis: {
                totalPatients: Number(patients.total_patients),
                totalScreenings: Number(kpis.total_screenings),
                screeningsThisMonth: Number(kpis.screenings_this_month),
                completedScreenings: Number(kpis.completed_screenings),
                incompleteScreenings: Number(kpis.incomplete_screenings),
                higherIndicatorResults: Number(kpis.higher_indicator_results),
                followUpsRequired: Number(kpis.higher_indicator_results)
            },
            outcomes,
            recentScreenings
        };
    },
    async createTask(task) {

        const {
            screening_id,
            task_type,
            task_order
        } = task;

        const [result] = await pool.execute(
            `INSERT INTO screening_tasks
            (
                screening_id,
                task_type,
                task_order,
                status
            )
            VALUES (?, ?, ?, 'pending')`,
            [
                screening_id,
                task_type,
                task_order
            ]
        );

        return result.insertId;
    },

    async getTasks(screeningId) {

        const [rows] = await pool.execute(
            `SELECT *
             FROM screening_tasks
             WHERE screening_id = ?
             ORDER BY task_order ASC`,
            [screeningId]
        );

        return rows;
    },

    async completeScreening(
        screeningId,
        { indicator = "inconclusive", indicatorScore = null, modelVersion = null } = {}
    ) {

    const [result] = await pool.execute(
        `UPDATE screenings
         SET
            status = 'completed',
            completed_at = CURRENT_TIMESTAMP,
            overall_indicator = ?,
            indicator_score = ?,
            model_version = ?
         WHERE id = ?`,
        [indicator, indicatorScore, modelVersion, screeningId]
    );

    return result;
},

    async getIncompleteTasks(screeningId) {

    const [rows] = await pool.execute(
        `SELECT *
         FROM screening_tasks
         WHERE screening_id = ?
         AND status = 'pending'
         ORDER BY task_order ASC`,
        [screeningId]
    );

    return rows;
},

    // THIS IS THE IMPORTANT FUNCTION
    async findTaskById(taskId) {

        const [rows] = await pool.execute(
            `SELECT *
             FROM screening_tasks
             WHERE id = ?`,
            [taskId]
        );

        return rows[0];
    },
async startTask(taskId) {
    const [result] = await pool.execute(
        `UPDATE screening_tasks
         SET status = 'in_progress',
             started_at = CURRENT_TIMESTAMP
         WHERE id = ?
         AND status = 'pending'`,
        [taskId]
    );

    return result;
},
    async completeTask(taskId) {

        const [result] = await pool.execute(
            `UPDATE screening_tasks
             SET
                status = 'completed',
                completed_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [taskId]
        );

        return result;
    }
}
module.exports = Screening;
