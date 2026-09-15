const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const patientRoutes = require("./routes/patientRoutes");

const screeningRoutes = require("./routes/screeningRoutes");

const screeningImageRoutes =
    require("./routes/screeningImageRoutes");

const taskRoutes =
    require("./routes/taskRoutes");

    const authRoutes =
    require("./routes/authRoutes");

const patientAssignmentRoutes =
    require("./routes/patientAssignmentRoutes");

const userRoutes = require("./routes/userRoutes");

const progressRoutes =
    require("./routes/progressRoutes");

const reportRoutes =
    require("./routes/reportRoutes");

const adminRoutes =
    require("./routes/adminRoutes");

const errorHandler =
    require("./middleware/errorMiddleware");

const app = express();
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "WriteAble Screening API is running",
        api: "/api"
    });
});
app.use(helmet());

app.use(cors({
    origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:5501",
    "http://127.0.0.1:5501"
],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({
    limit: "5mb"
}));


const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200
});

app.use("/api", limiter);


app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Dysgraphia Screening API is running",
        environment: process.env.NODE_ENV
    });
});


app.use("/api/patients", patientRoutes);

app.use(
    "/api/screening-images",
    screeningImageRoutes
);

app.use(
    "/api/tasks",
    taskRoutes
);

app.use(
    "/api/auth",
    authRoutes
);
app.use(
    "/api/screenings",
    screeningRoutes
);

app.use(
    "/api/assignments",
    patientAssignmentRoutes
);

app.use(
    "/api/users",
    userRoutes
);

app.use(
    "/api/progress",
    progressRoutes
);

app.use(
    "/api/screenings",
    reportRoutes
);
app.use(
    "/api/admin",
    adminRoutes
);

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API endpoint not found"
    });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
