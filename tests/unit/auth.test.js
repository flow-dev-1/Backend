const jwt = require("jsonwebtoken");
const authMiddleware = require("../../middleware/auth");
const StatusCodes = require("../../utils/status-codes");

require("dotenv").config({ path: "test.env" });

describe("Auth Middleware", () => {
    it("should return 401 if no token provided", () => {
        const req = { headers: { authorization: "" } };
        const res = {
            status: jest.fn().mockReturnValue({ send: jest.fn() })
        };
        const next = jest.fn();

        authMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.status().send).toHaveBeenCalledWith("Access denied. No token provided.");
        expect(next).not.toHaveBeenCalled();
    });

    it("should return 401 if token is invalid", () => {
        const req = { headers: { authorization: "Bearer invalidToken" } };
        const res = {
            status: jest.fn().mockReturnValue({ send: jest.fn() })
        };
        const next = jest.fn();

        authMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
        expect(res.status().send).toHaveBeenCalledWith("Invalid token.");
        expect(next).not.toHaveBeenCalled();
    });

    it("should set req.user if token is valid", () => {
        const token = jwt.sign({ userId: "user123" }, process.env.JWT);
        const req = { headers: { authorization: `Bearer ${token}` } };
        const res = {};
        const next = jest.fn();

        authMiddleware(req, res, next);

        expect(req.user.userId).toBe("user123");
        expect(next).toHaveBeenCalled();
    });
});
