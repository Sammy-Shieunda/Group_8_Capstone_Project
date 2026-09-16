const express = require("express");

const {
    login,
    getCurrentUser
} = require("../controllers/authController");

const {
    authenticateToken,
    requireRole,
    requirePermission
} = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/login", login);

router.get(
    "/me",
    authenticateToken,
    getCurrentUser
);

// Temporary RBAC test
router.get(
    "/admin-test",
    authenticateToken,
    requireRole("admin", "superadmin"),
    (req, res) => {
        res.json({
            success: true,
            message: "Admin authorization successful",
            user: req.user
        });
    }
);

// Permission test
router.get(
    "/permission-test",
    authenticateToken,
    requirePermission("manage_users"),
    (req, res) => {
        res.json({
            success: true,
            message: "Permission authorization successful",
            permission: "manage_users",
            user: req.user
        });
    }
);

module.exports = router;