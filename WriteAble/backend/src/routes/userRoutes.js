const express = require("express");

const router = express.Router();

const {
    authenticateToken,
    requireRole
} = require("../middleware/authMiddleware");

const {
    getUsers,
    createUser
} = require("../controllers/userController");

router.get(
    "/",
    authenticateToken,
    requireRole("superadmin", "admin"),
    getUsers
);

router.post(
    "/",
    authenticateToken,
    requireRole("superadmin", "admin"),
    createUser
);

module.exports = router;