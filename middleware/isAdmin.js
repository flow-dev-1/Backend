const StatusCodes = require("../utils/status-codes")
module.exports = function (req, res, next) {
    //   if (!config.get("requiresAuth")) return next();
    const adminType = req.user.adminType

    if (adminType.type === "Admin" || adminType.type === "Super-Admin") return next();

    res.status(StatusCodes.UNAUTHORIZED).send("Un-Authorized.");

};