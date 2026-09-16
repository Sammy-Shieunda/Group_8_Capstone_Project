const permissions = {
    superadmin: [
        "view_patients",
        "create_patients",
        "edit_patients",
        "view_screenings",
        "create_screenings",
        "edit_screenings",
        "complete_screenings",
        "upload_handwriting",
        "view_progress",
        "view_reports",
        "export_data",
        "view_research",
        "view_analytics",
        "manage_users",
        "manage_settings",
        "view_audit_logs"
    ],

    admin: [
        "view_patients",
        "create_patients",
        "edit_patients",
        "view_screenings",
        "create_screenings",
        "edit_screenings",
        "complete_screenings",
        "upload_handwriting",
        "view_progress",
        "view_reports",
        "export_data",
        "view_research",
        "view_analytics",
        "manage_users",
        "view_audit_logs"
    ],

    clinician: [
        "view_patients",
        "create_patients",
        "edit_patients",
        "view_screenings",
        "create_screenings",
        "edit_screenings",
        "complete_screenings",
        "upload_handwriting",
        "view_progress",
        "view_reports"
    ],

    researcher: [
        "view_research",
        "view_analytics",
        "export_anonymized_data"
    ],

    educator: [
    "view_patients",
    "create_patients",
    "edit_patients",
    "view_screenings",
    "create_screenings",
    "edit_screenings",
    "complete_screenings",
    "upload_handwriting",
    "view_progress",
    "view_reports"
]
};

module.exports = permissions;