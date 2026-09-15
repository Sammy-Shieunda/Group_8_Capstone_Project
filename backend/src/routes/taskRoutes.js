const express = require("express");

const {
    startTask,
    completeTask
} = require("../controllers/taskController");

const {
    authenticateToken,
    requirePermission
} = require("../middleware/authMiddleware");

const router = express.Router();

router.patch(
    "/:taskId/start",
    authenticateToken,
    requirePermission("edit_screenings"),
    startTask
);

router.patch(
    "/:taskId/complete",
    authenticateToken,
    requirePermission("complete_screenings"),
    completeTask
);

module.exports = router;