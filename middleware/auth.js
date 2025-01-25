const jwt = require("jsonwebtoken");
const StatusCodes = require("../utils/status-codes");


module.exports = function (req, res, next) {
    //   if (!config.get("requiresAuth")) return next();

    try {
        const token = req.headers.authorization.split(" ")[1];

        if (!token) return res.status(401).json({ message: "Access denied. Invalid or expired token detected." });
        const decoded = jwt.verify(token, process.env.JWT);

        req.user = decoded;

        next();
    } catch (ex) {
        console.log(ex)
        res.status(StatusCodes.UNAUTHORIZED).json({ message: "Access denied. Invalid or expired token detected." });
    }
};
