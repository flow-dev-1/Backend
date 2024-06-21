const StatusCodes = require("../utils/status-codes")

const checkAdminRole = (allowedRoles) => {
    return async (req, res, next) => {
        try {
            const adminType = req.user.adminType

            if (!adminType || !allowedRoles.includes(adminType.type)) {
                return res.status(403).json({ message: "Access denied. Insufficient permissions." });
            }

            next();

        } catch (error) {
            res.status(StatusCodes.UNAUTHORIZED).send("Un-Authorized.");
        };
    };
}
module.exports = checkAdminRole