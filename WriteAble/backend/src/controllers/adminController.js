const Screening = require("../models/screeningModel");

const getDashboard = async (req, res) => {
    try {
        const dashboard = await Screening.getDashboardSummary();

        return res.json({
            success: true,
            data: dashboard
        });
    } catch (error) {
        console.error("Get dashboard error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to load dashboard"
        });
    }
};

module.exports = {
    getDashboard
};
