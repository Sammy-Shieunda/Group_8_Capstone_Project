const Screening = require("../models/screeningModel");
const Prediction = require("../models/predictionModel");

const MINIMUM_ANALYZED_TASKS = 3;

/**
 * Produces a transparent session-level screening indicator. It is not a
 * diagnostic score. The indicator score is a descriptive composite model
 * score: the mean Potential Dysgraphia probability across analyzed tasks.
 * It is not a clinical risk score or diagnosis.
 */
const interpret = async (screeningId) => {
    const tasks = await Screening.getTasks(screeningId);
    const completedTasks = tasks.filter(task => task.status === "completed");

    const analyzed = await Promise.all(
        completedTasks.map(async task => ({
            task,
            prediction: await Prediction.findLatestByTaskId(task.id)
        }))
    );

    const valid = analyzed.filter(item => item.prediction);
    const potentialCount = valid.filter(
        item => item.prediction.predicted_class === "Potential Dysgraphia"
    ).length;
    const lowCount = valid.length - potentialCount;
    const versions = [...new Set(
        valid.map(item => item.prediction.model_version).filter(Boolean)
    )];

    let overallIndicator = "inconclusive";
    let reason = "insufficient_evidence";

    if (valid.length >= MINIMUM_ANALYZED_TASKS) {
        if (potentialCount > lowCount) {
            overallIndicator = "higher";
            reason = "more_potential_task_results";
        } else if (lowCount > potentialCount) {
            overallIndicator = "low";
            reason = "more_low_potential_task_results";
        } else {
            reason = "mixed_task_results";
        }
    }

    const probabilities = valid
        .map(item => Number(item.prediction.probability))
        .filter(value => Number.isFinite(value));

    const indicatorScore = probabilities.length
        ? probabilities.reduce((sum, value) => sum + value, 0) / probabilities.length
        : null;

    return {
        overall_indicator: overallIndicator,
        indicator_score: indicatorScore,
        model_version: versions.length === 1 ? versions[0] : null,
        evidence: {
            minimum_analyzed_tasks: MINIMUM_ANALYZED_TASKS,
            analyzed_tasks: valid.length,
            potential_task_results: potentialCount,
            low_potential_task_results: lowCount,
            reason
        }
    };
};

module.exports = {
    interpret,
    MINIMUM_ANALYZED_TASKS
};
