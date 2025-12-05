const StatusCodes = require("../utils/status-codes");

module.exports = function (req, res, next) {
    //   if (!config.get("requiresAuth")) return next();
    const isSchool = req.user.isSchool
    const isAdmin = req.user.isSchoolAdmin

    if (isSchool || isAdmin) return next();

    // ToDo: Check id user hass access to this school

    res.status(StatusCodes.UNAUTHORIZED).send("Un-Authorized.");

};