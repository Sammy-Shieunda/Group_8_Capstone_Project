const bcrypt = require("bcryptjs");
const User = require("../models/userModel");

const getUsers = async (req, res) => {
    try {
        const users = await User.findAll();

        res.json({
            success: true,
            count: users.length,
            data: users
        });

    } catch (error) {
        console.error("Get users error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve users"
        });
    }
};


const createUser = async (req, res) => {
    try {
        const {
            first_name,
            last_name,
            email,
            password,
            role
        } = req.body;

        const normalizedEmail = String(email || "").trim().toLowerCase();

        if (
            !first_name ||
            !last_name ||
            !normalizedEmail ||
            !password ||
            !role
        ) {
            return res.status(400).json({
                success: false,
                message: "first_name, last_name, email, password and role are required"
            });
        }

        const allowedRoles = [
            "superadmin",
            "admin",
            "clinician",
            "researcher",
            "educator"
        ];

        if (!allowedRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user role"
            });
        }

        if (role === "superadmin" && req.user.role !== "superadmin") {
            return res.status(403).json({
                success: false,
                message: "Only a super administrator can create a super administrator account"
            });
        }

        const existingUser =
            await User.findByEmail(normalizedEmail);

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "A user with this email already exists"
            });
        }

        const passwordHash =
            await bcrypt.hash(password, 12);

        const userId = await User.create({
            first_name,
            last_name,
            email: normalizedEmail,
            password_hash: passwordHash,
            role
        });

        const user = await User.findById(userId);

        res.status(201).json({
            success: true,
            message: "User created successfully",
            data: {
                user
            }
        });

    } catch (error) {
        console.error("Create user error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to create user"
        });
    }
};


module.exports = {
    getUsers,
    createUser
};