/*
|--------------------------------------------------------------------------
| WriteAble Recommendation Engine
|--------------------------------------------------------------------------
|
| This engine provides screening-level next steps.
|
| It MUST NOT diagnose dysgraphia.
|--------------------------------------------------------------------------
*/

function generateRecommendations({
    overallIndicator,
    taskResults = [],
    evidenceCount = 0
}) {
    const recommendations = [];

    /*
    |--------------------------------------------------------------------------
    | Insufficient evidence
    |--------------------------------------------------------------------------
    */

    if (evidenceCount < 3) {
        recommendations.push({
            type: "additional_screening",
            priority: "recommended",
            title: "Complete additional handwriting activities",
            description:
                "The available evidence is insufficient for an overall " +
                "screening indicator. Consider completing additional " +
                "handwriting activities before interpreting the result."
        });

        recommendations.push({
            type: "monitoring",
            priority: "recommended",
            title: "Continue monitoring handwriting development",
            description:
                "Observe handwriting development across classroom and " +
                "everyday writing activities."
        });

        return recommendations;
    }

    /*
    |--------------------------------------------------------------------------
    | Higher indicator
    |--------------------------------------------------------------------------
    */

    if (overallIndicator === "higher") {
        recommendations.push({
            type: "professional_assessment",
            priority: "recommended",
            title: "Consider further professional assessment",
            description:
                "Consider discussing the screening result with an " +
                "appropriately qualified professional who can evaluate " +
                "handwriting and related developmental or learning factors."
        });

        recommendations.push({
            type: "school_support",
            priority: "recommended",
            title: "Consider educational handwriting support",
            description:
                "Where appropriate, consider classroom strategies and " +
                "writing support that can reduce unnecessary handwriting " +
                "difficulty while further assessment is considered."
        });

        recommendations.push({
            type: "monitoring",
            priority: "recommended",
            title: "Monitor handwriting development",
            description:
                "Continue observing handwriting performance across " +
                "different writing activities and over time."
        });

        return recommendations;
    }

    /*
    |--------------------------------------------------------------------------
    | Low indicator
    |--------------------------------------------------------------------------
    */

    if (overallIndicator === "low") {
        recommendations.push({
            type: "monitoring",
            priority: "routine",
            title: "Continue routine monitoring",
            description:
                "The available handwriting samples did not produce a " +
                "strong screening-level pattern. Continue monitoring " +
                "handwriting development as part of normal educational support."
        });

        recommendations.push({
            type: "additional_screening",
            priority: "optional",
            title: "Repeat screening if concerns remain",
            description:
                "If handwriting concerns continue or become more noticeable, " +
                "additional screening or professional assessment may be considered."
        });

        return recommendations;
    }

    /*
    |--------------------------------------------------------------------------
    | Inconclusive
    |--------------------------------------------------------------------------
    */

    recommendations.push({
        type: "additional_screening",
        priority: "recommended",
        title: "Consider additional handwriting activities",
        description:
            "The available model outputs are mixed or insufficient to " +
            "produce a clear screening indicator. Additional handwriting " +
            "samples may provide more evidence."
    });

    recommendations.push({
        type: "monitoring",
        priority: "recommended",
        title: "Continue monitoring handwriting development",
        description:
            "Observe handwriting across different tasks and contexts " +
            "rather than relying on a single handwriting sample."
    });

    return recommendations;
}

module.exports = {
    generateRecommendations
};