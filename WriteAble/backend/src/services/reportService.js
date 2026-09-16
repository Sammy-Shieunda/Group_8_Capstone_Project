const pool = require("../config/database");
const recommendationService = require("./recommendationService");

const DISCLAIMER =
    "This report is a screening aid and is not a clinical diagnosis. " +
    "A higher indicator does not mean that the child has dysgraphia. " +
    "Results should be interpreted by an appropriately qualified professional " +
    "alongside other developmental, educational and clinical information.";

const MODEL_VERSION_FALLBACK = "transfer_mobilenetv2_fragments";

const TASK_LABELS = {
    letter_copying: "Letter Copying",
    word_copying: "Word Copying",
    sentence_copying: "Sentence Copying",
    numbers: "Numbers",
    full_page: "Full Page",
    drawings: "Drawings"
};

function formatTaskType(taskType) {
    return TASK_LABELS[taskType] || String(taskType || "Unknown Task")
        .replace(/_/g, " ")
        .replace(/\b\w/g, char => char.toUpperCase());
}

function calculateInterpretation(taskResults) {
    const analyzedTasks = taskResults.filter(task => task.prediction);
    const evidenceCount = analyzedTasks.length;

    const potentialCount = analyzedTasks.filter(task =>
        String(task.prediction.predicted_class || "").toLowerCase() === "potential dysgraphia"
    ).length;

    const lowCount = analyzedTasks.filter(task =>
        String(task.prediction.predicted_class || "").toLowerCase() === "low potential dysgraphia"
    ).length;

    const probabilities = analyzedTasks
        .map(task => Number(task.prediction.probability))
        .filter(value => Number.isFinite(value));

    const meanProbability = probabilities.length
        ? probabilities.reduce((sum, value) => sum + value, 0) / probabilities.length
        : null;

    let indicator = "inconclusive";

    if (evidenceCount >= 3) {
        if (potentialCount > lowCount) indicator = "higher";
        else if (lowCount > potentialCount) indicator = "low";
    }

    let explanation;
    if (evidenceCount < 3) {
        explanation =
            "There are not enough analyzed handwriting samples to produce " +
            "a screening-level overall indicator. Additional handwriting " +
            "activities are recommended.";
    } else if (indicator === "higher") {
        explanation =
            "More of the analyzed handwriting samples were classified by the " +
            "screening model as Potential Dysgraphia than Low Potential Dysgraphia. " +
            "This produces a higher screening indicator.";
    } else if (indicator === "low") {
        explanation =
            "More of the analyzed handwriting samples were classified by the " +
            "screening model as Low Potential Dysgraphia than Potential Dysgraphia. " +
            "No strong screening-level pattern was identified within the available samples.";
    } else {
        explanation =
            "The available handwriting samples produced mixed or balanced model outputs. " +
            "The available evidence is therefore inconclusive.";
    }

    return {
        indicator,
        evidence_count: evidenceCount,
        potential_count: potentialCount,
        low_count: lowCount,
        indicator_score: meanProbability,
        mean_probability: meanProbability,
        explanation
    };
}

async function getScreeningReport(screeningId) {
    const numericScreeningId = Number(screeningId);
    if (!Number.isInteger(numericScreeningId) || numericScreeningId <= 0) {
        return null;
    }

    const [screeningRows] = await pool.execute(
        `SELECT
            s.id,
            s.patient_id,
            s.participation_id,
            s.screening_code,
            s.status,
            s.started_at,
            s.completed_at,
            s.overall_indicator,
            s.indicator_score,
            s.model_version,
            s.started_at AS created_at,
            p.patient_code,
            p.age,
            p.grade,
            p.dominant_hand
         FROM screenings s
         INNER JOIN patients p ON p.id = s.patient_id
         WHERE s.id = ?
         LIMIT 1`,
        [numericScreeningId]
    );

    if (!screeningRows.length) return null;
    const screening = screeningRows[0];

    const [taskRows] = await pool.execute(
    `SELECT
        id,
        screening_id,
        task_type,
        status,
        started_at,
        completed_at
     FROM screening_tasks
     WHERE screening_id = ?
     ORDER BY task_order ASC, id ASC`,
    [numericScreeningId]
);

    const [imageRows] = await pool.execute(
        `SELECT
            id,
            task_id,
            original_filename,
            stored_filename,
            mime_type,
            file_size,
            uploaded_at
         FROM screening_images
         WHERE task_id IN (
             SELECT id FROM screening_tasks WHERE screening_id = ?
         )
         ORDER BY uploaded_at ASC, id ASC`,
        [numericScreeningId]
    );

    const [predictionRows] = await pool.execute(
        `SELECT
            p.id,
            p.screening_id,
            p.task_id,
            p.model_name,
            p.model_version,
            p.predicted_class,
            p.probability,
            p.confidence,
            p.created_at
         FROM predictions p
         INNER JOIN (
             SELECT task_id, MAX(id) AS latest_id
             FROM predictions
             WHERE screening_id = ? AND task_id IS NOT NULL
             GROUP BY task_id
         ) latest ON latest.latest_id = p.id
         WHERE p.screening_id = ?
         ORDER BY p.created_at ASC, p.id ASC`,
        [numericScreeningId, numericScreeningId]
    );

    const tasks = taskRows.map(task => {
        const images = imageRows
            .filter(image => Number(image.task_id) === Number(task.id))
            .map(image => ({
                id: image.id,
                original_filename: image.original_filename,
                mime_type: image.mime_type,
                file_size: image.file_size,
                uploaded_at: image.uploaded_at
            }));

        const prediction = predictionRows.find(
            item => Number(item.task_id) === Number(task.id)
        ) || null;

        return {
            id: task.id,
            task_type: task.task_type,
            title: formatTaskType(task.task_type),
            status: task.status,
            started_at: task.started_at,
            completed_at: task.completed_at,
            images,
            prediction: prediction ? {
                id: prediction.id,
                model_name: prediction.model_name,
                model_version: prediction.model_version || MODEL_VERSION_FALLBACK,
                predicted_class: prediction.predicted_class,
                probability: prediction.probability === null ? null : Number(prediction.probability),
                confidence: prediction.confidence === null ? null : Number(prediction.confidence),
                created_at: prediction.created_at
            } : null
        };
    });

    const interpretation = calculateInterpretation(tasks);
    const evidenceSummary =
        `${interpretation.evidence_count} analyzed task${interpretation.evidence_count === 1 ? "" : "s"}: ` +
        `${interpretation.potential_count} Potential Dysgraphia, ` +
        `${interpretation.low_count} Low Potential Dysgraphia.`;

    const recommendations = recommendationService.generateRecommendations({
        overallIndicator: interpretation.indicator,
        taskResults: tasks,
        evidenceCount: interpretation.evidence_count
    });

    return {
        patient: {
            id: screening.patient_id,
            patient_code: screening.patient_code,
            age: screening.age,
            grade: screening.grade,
            dominant_hand: screening.dominant_hand
        },
        screening: {
            id: screening.id,
            patient_id: screening.patient_id,
            participation_id: screening.participation_id,
            screening_code: screening.screening_code,
            status: screening.status,
            started_at: screening.started_at,
            completed_at: screening.completed_at,
            overall_indicator: interpretation.indicator,
            indicator_score:
                screening.indicator_score === null || screening.indicator_score === undefined
                    ? interpretation.indicator_score
                    : Number(screening.indicator_score),
            model_version: screening.model_version || MODEL_VERSION_FALLBACK,
            created_at: screening.created_at
        },
        tasks,
        interpretation: {
            indicator: interpretation.indicator,
            evidence_count: interpretation.evidence_count,
            potential_count: interpretation.potential_count,
            low_count: interpretation.low_count,
            mean_probability: interpretation.mean_probability,
            indicator_score: interpretation.indicator_score,
            evidence_summary: evidenceSummary,
            explanation: interpretation.explanation
        },
        recommendations,
        disclaimer: DISCLAIMER,
        generated_at: new Date().toISOString()
    };
}

module.exports = {
    getScreeningReport,
    calculateInterpretation,
    DISCLAIMER
};
