const StatusCodes = require("../utils/status-codes")
module.exports = function (req, res, next) {
    //   if (!config.get("requiresAuth")) return next();
    const isAdmin = req.user.isAdmin

    if (isAdmin) return next();

    res.status(StatusCodes.UNAUTHORIZED).send("Un-Authorized.");

};