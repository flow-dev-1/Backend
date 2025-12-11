const StatusCodes = require("../utils/status-codes");

module.exports = function (req, res, next) {

    const isSchool = req.user.isSchool
    const isAdmin = req.user.isSchoolAdmin
    const flowAdmin = req.user.isAdmin

    if (isSchool || isAdmin || flowAdmin) return next();

    // ToDo: Check id user hass access to this school

    res.status(StatusCodes.UNAUTHORIZED).send("Un-Authorized.");

};