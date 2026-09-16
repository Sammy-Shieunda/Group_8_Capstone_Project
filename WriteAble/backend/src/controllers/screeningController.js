const ScreeningImage = require("../models/screeningImageModel");
const Prediction = require("../models/predictionModel");
const Screening = require("../models/screeningModel");
const Patient = require("../models/patientModel");
const {
    generateParticipationId
} = require("../utils/participationId");
const ScreeningInterpretationService =
    require("../services/screeningInterpretationService");
const reportService =
    require("../services/reportService");
const TASK_TYPES = [
    "letter_copying",
    "word_copying",
    "sentence_copying",
    "numbers",
    "full_page",
    "drawings"
];

const TASK_INFO = {
    letter_copying: {
        title: "Letter Copying",
        description: "Copy the letters shown in the activity."
    },
    word_copying: {
        title: "Word Copying",
        description: "Copy the provided words carefully."
    },
    sentence_copying: {
        title: "Sentence Copying",
        description: "Copy the provided sentence using your normal handwriting."
    },
    numbers: {
        title: "Numbers",
        description: "Write or copy the numbers shown in the activity."
    },
    full_page: {
        title: "Full Page",
        description: "Complete the handwriting activity across the provided page."
    },
    drawings: {
        title: "Drawings",
        description: "Complete the drawing activity using the provided instructions."
    }
};

const generateScreeningCode = () => {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    const random = Math.floor(1000 + Math.random() * 9000);

    return `SCR-${year}${month}${day}-${random}`;
};


/*
|--------------------------------------------------------------------------
| START SCREENING
|--------------------------------------------------------------------------
*/
const startScreening = async (req, res) => {
    try {

        const {
            patient_id,
            patient_code
        } = req.body;


        /*
        |--------------------------------------------------------------------------
        | GET ASSESSOR FROM AUTHENTICATED USER
        |--------------------------------------------------------------------------
        |
        | Do NOT accept assessor_id from the frontend.
        | The JWT identifies the currently logged-in educator/admin.
        |
        */
       const assessor_id = req.user.userId;


        /*
        |--------------------------------------------------------------------------
        | Validate patient_id
        |--------------------------------------------------------------------------
        */
        if (!patient_id && !patient_code) {
            return res.status(400).json({
                success: false,
                message: "patient_code is required"
            });
        }


        /*
        |--------------------------------------------------------------------------
        | Check that patient exists
        |--------------------------------------------------------------------------
        */
        const patient = patient_code
            ? await Patient.findByCode(String(patient_code).trim())
            : await Patient.findById(patient_id);

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient not found"
            });
        }


        /*
        |--------------------------------------------------------------------------
        | Generate internal screening code
        |--------------------------------------------------------------------------
        */
        const screeningCode = generateScreeningCode();


        /*
        |--------------------------------------------------------------------------
        | Create screening
        |--------------------------------------------------------------------------
        */
        const screeningId = await Screening.create({
            screening_code: screeningCode,
            patient_id: patient.id,
            assessor_id
        });


        /*
        |--------------------------------------------------------------------------
        | Generate participation ID
        |--------------------------------------------------------------------------
        |
        | Example:
        | WA-2026-000003
        |
        */
        const participationId =
            generateParticipationId(screeningId);


        /*
        |--------------------------------------------------------------------------
        | Save participation ID
        |--------------------------------------------------------------------------
        */
        await Screening.updateParticipationId(
            screeningId,
            participationId
        );


        /*
        |--------------------------------------------------------------------------
        | Retrieve created screening
        |--------------------------------------------------------------------------
        */
        const screening =
            await Screening.findById(screeningId);


        /*
        |--------------------------------------------------------------------------
        | Return screening information
        |--------------------------------------------------------------------------
        |
        | Notice that we do NOT return the patient object here.
        | The frontend receives the participation ID. Tasks are created only
        | after the participant selects an activity.
        |
        */
        res.status(201).json({
            success: true,
            message: "Screening started successfully",

            data: {

                screening: {
                    id: screening.id,

                    screening_code:
                        screening.screening_code,

                    participation_id:
                        screening.participation_id,

                    status:
                        screening.status,

                    started_at:
                        screening.started_at,

                    assessor_id:
                        screening.assessor_id,

                    patient_id:
                        patient.id,

                    patient_code:
                        patient.patient_code,

                    age:
                        patient.age,

                    grade:
                        patient.grade,

                    dominant_hand:
                        patient.dominant_hand
                },

                // Tasks are created only after the assessor selects one.
                tasks: []
            }
        });


    } catch (error) {

        console.error("=================================");
        console.error("START SCREENING ERROR");
        console.error("Message:", error.message);
        console.error("Code:", error.code);
        console.error("SQL State:", error.sqlState);
        console.error("SQL Message:", error.sqlMessage);
        console.error("Stack:", error.stack);
        console.error("=================================");

        res.status(500).json({
            success: false,
            message: "Failed to start screening",
            error: error.message,
            code: error.code || null,
            sqlState: error.sqlState || null
        });

    }
};


/*
|--------------------------------------------------------------------------
| GET SCREENING
|--------------------------------------------------------------------------
*/
const getScreening = async (req, res) => {
    try {
        const screeningId = Number(req.params.id);

        if (!Number.isInteger(screeningId) || screeningId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid screening ID"
            });
        }

        const screening = await Screening.findById(screeningId);

        if (!screening) {
            return res.status(404).json({
                success: false,
                message: "Screening not found"
            });
        }

        const tasks = await Screening.getTasks(screeningId);

        const enrichedTasks = await Promise.all(
            tasks.map(async (task) => {

                const images =
                    await ScreeningImage.findByTaskId(task.id);

                const prediction =
                    await Prediction.findLatestByTaskId(task.id);

                const info = TASK_INFO[task.task_type];

                return {
                    ...task,

                    title: info?.title || task.task_type,
                    description:
                        info?.description || "Complete this screening activity.",

                    // file_path remains server-only and is never exposed to Admin.
                    images: images.map(({ file_path, ...safeImage }) => safeImage),

                    prediction
                };
            })
        );

        return res.json({
            success: true,
            data: {
                screening,
                tasks: enrichedTasks
            }
        });

    } catch (error) {

        console.error(
            "Get screening error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to load screening"
        });
    }
};

/*
|--------------------------------------------------------------------------
| GET PATIENT SCREENINGS
|--------------------------------------------------------------------------
*/
const getPatientScreenings = async (req, res) => {

    try {

        const { patientId } = req.params;


        /*
        |--------------------------------------------------------------------------
        | Verify patient exists
        |--------------------------------------------------------------------------
        */
        const patient =
            await Patient.findById(patientId);


        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient not found"
            });
        }


        /*
        |--------------------------------------------------------------------------
        | Get screenings
        |--------------------------------------------------------------------------
        */
        const screenings =
            await Screening.findByPatientId(patientId);


        res.json({
            success: true,
            count: screenings.length,

            data: screenings
        });


    } catch (error) {

        console.error(
            "Get patient screenings error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to retrieve patient screenings"
        });

    }

};


/*
|--------------------------------------------------------------------------
| COMPLETE SCREENING
|--------------------------------------------------------------------------
*/
const completeScreening = async (req, res) => {

    try {

        const { id } = req.params;


        /*
        |--------------------------------------------------------------------------
        | Find screening
        |--------------------------------------------------------------------------
        */
        const screening =
            await Screening.findById(id);


        if (!screening) {
            return res.status(404).json({
                success: false,
                message: "Screening not found"
            });
        }


        /*
        |--------------------------------------------------------------------------
        | Prevent duplicate completion
        |--------------------------------------------------------------------------
        */
        if (screening.status === "completed") {

            return res.status(400).json({
                success: false,
                message: "Screening is already completed"
            });

        }


        /*
        |--------------------------------------------------------------------------
        | Find incomplete tasks
        |--------------------------------------------------------------------------
        */
        const tasks =
            await Screening.getTasks(id);

        if (tasks.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No screening activities have been selected"
            });
        }

        const incompleteTasks =
            await Screening.getIncompleteTasks(id);


        if (incompleteTasks.length > 0) {

            return res.status(400).json({

                success: false,

                message:
                    "Screening has incomplete tasks",

                data: {

                    incomplete_tasks:
                        incompleteTasks.length,

                    tasks:
                        incompleteTasks

                }

            });

        }


        /*
        |--------------------------------------------------------------------------
        | Complete screening
        |--------------------------------------------------------------------------
        |
        | For now we retain "inconclusive".
        | Later Phase E/F will calculate the actual overall indicator
        | from the task-level model results.
        |
        */
        const report = await reportService.getScreeningReport(id);

        if (!report) {
            return res.status(404).json({
                success: false,
                message: "Unable to generate screening report"
            });
        }

        await Screening.completeScreening(id, {
            indicator: report.interpretation.indicator,
            indicatorScore: report.interpretation.indicator_score ?? null,
            modelVersion: report.screening.model_version
        });

        const interpretation = await ScreeningInterpretationService.interpret(id);

        /*
        |--------------------------------------------------------------------------
        | Retrieve updated screening
        |--------------------------------------------------------------------------
        */
        const updatedScreening =
            await Screening.findById(id);


        res.json({

            success: true,

            message:
                "Screening completed successfully",

            data: {
                screening: updatedScreening,
                interpretation

            }

        });


    }  catch (error) {

    console.error("=================================");
    console.error("START SCREENING ERROR");
    console.error("Message:", error.message);
    console.error("Code:", error.code);
    console.error("SQL State:", error.sqlState);
    console.error("SQL Message:", error.sqlMessage);
    console.error("Stack:", error.stack);
    console.error("=================================");

    res.status(500).json({
        success: false,
        message: "Failed to start screening",
        error: error.message,
        code: error.code || null,
        sqlState: error.sqlState || null
    });

}

};

/*
|--------------------------------------------------------------------------
| GET ALL SCREENINGS
|--------------------------------------------------------------------------
|
| Admin/educator endpoint.
| Returns real screening records from MySQL.
|
| Dates are NEVER generated here.
| started_at, completed_at and created_at come directly from the database.
|
|--------------------------------------------------------------------------
*/

const getAllScreenings = async (req, res) => {
    try {
        const screenings = await Screening.getAll();

        res.json({
            success: true,
            count: screenings.length,
            data: screenings
        });

    } catch (error) {
        console.error("Get all screenings error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve screenings",
            error: error.message
        });
    }
};
const createScreeningTask = async (req, res) => {
    try {
        const screeningId = Number(req.params.id);
        const { task_type } = req.body;

        if (!Number.isInteger(screeningId) || screeningId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid screening ID"
            });
        }

        if (!task_type || typeof task_type !== "string") {
            return res.status(400).json({
                success: false,
                message: "task_type is required"
            });
        }

        if (!TASK_TYPES.includes(task_type)) {
            return res.status(400).json({
                success: false,
                message: "Invalid screening task type",
                allowed_task_types: TASK_TYPES
            });
        }

        const screening =
            await Screening.findById(screeningId);

        if (!screening) {
            return res.status(404).json({
                success: false,
                message: "Screening not found"
            });
        }

        if (screening.status === "completed") {
            return res.status(400).json({
                success: false,
                message: "Screening has already been completed"
            });
        }

        /*
         * Prevent the same screening activity from
         * being added twice.
         */

        const existingTasks =
            await Screening.getTasks(screeningId);

        const alreadyExists =
            existingTasks.some(
                task => task.task_type === task_type
            );

        if (alreadyExists) {
            return res.status(409).json({
                success: false,
                message: "This screening activity has already been selected"
            });
        }

        const taskOrder =
            existingTasks.length + 1;

        const taskId =
            await Screening.createTask({
                screening_id: screeningId,
                task_type,
                task_order: taskOrder
            });

        await Screening.startTask(taskId);

        const task =
            await Screening.findTaskById(taskId);

        const info = TASK_INFO[task_type];

        return res.status(201).json({
            success: true,
            message: "Screening activity selected successfully",
            data: {
                task: {
                    ...task,
                    title: info?.title || task_type,
                    description:
                        info?.description || "Complete this screening activity."
                }
            }
        });

    } catch (error) {

        console.error(
            "Create screening task error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to create screening task"
        });
    }
};
module.exports = {
    startScreening,
    createScreeningTask,
    getScreening,
    getPatientScreenings,
    completeScreening,
    getAllScreenings
};
