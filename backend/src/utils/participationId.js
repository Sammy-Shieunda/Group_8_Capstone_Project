const generateParticipationId = (screeningId) => {

    const year = new Date().getFullYear();

    return `WA-${year}-${String(screeningId).padStart(6, "0")}`;

};

module.exports = {
    generateParticipationId
};