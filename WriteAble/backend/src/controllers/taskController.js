const Screening = require("../models/screeningModel");

const completeTask = async (req, res) => {

    try {

        const { taskId } = req.params;

        const task = await Screening.findTaskById(taskId);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Screening task not found"
            });
        }

        if (task.status === "completed") {
            return res.status(400).json({
                success: false,
                message: "Task is already completed"
            });
        }

        await Screening.completeTask(taskId);

        const updatedTask =
            await Screening.findTaskById(taskId);

        res.json({
            success: true,
            message: "Screening task completed successfully",
            data: {
                task: updatedTask
            }
        });

    } catch (error) {

        console.error("Complete task error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to complete screening task"
        });
    }
};

const startTask = async (req, res) => {
    try {
        const { taskId } = req.params;

        const task = await Screening.findTaskById(taskId);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Screening task not found"
            });
        }

        if (task.status === "completed") {
            return res.status(400).json({
                success: false,
                message: "Task is already completed"
            });
        }

        if (task.status === "in_progress") {
            return res.status(400).json({
                success: false,
                message: "Task is already in progress"
            });
        }

        await Screening.startTask(taskId);

        const updatedTask =
            await Screening.findTaskById(taskId);

        res.json({
            success: true,
            message: "Screening task started successfully",
            data: {
                task: updatedTask
            }
        });

    } catch (error) {
        console.error("Start task error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to start screening task"
        });
    }
};

module.exports = {
    startTask,
    completeTask
};