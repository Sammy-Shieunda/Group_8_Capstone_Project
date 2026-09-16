const express = require("express");
const { authenticateToken, requirePermission } =
    require("../middleware/authMiddleware");
const { getDashboard } = require("../controllers/adminController");

const router = express.Router();

router.get(
    "/dashboard",
    authenticateToken,
    requirePermission("view_screenings"),
    getDashboard
);

module.exports = router;
