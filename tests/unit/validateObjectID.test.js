const mongoose = require("mongoose");
const validateObjectId = require("../../middleware/validateObjectId.js");

describe("Validate ObjectID Middleware", () => {
    it("should return 404 if the provided ID is not a valid MongoDB ObjectID", () => {
        const req = { params: { id: "invalidObjectId" } };
        const res = {
            status: jest.fn().mockReturnValue({ send: jest.fn() })
        };
        const next = jest.fn();

        validateObjectId(req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.status().send).toHaveBeenCalledWith("Invalid object ID.");
        expect(next).not.toHaveBeenCalled();
    });

    it("should call next if the provided ID is a valid MongoDB ObjectID", () => {
        const req = { params: { id: mongoose.Types.ObjectId() } };
        const res = {};
        const next = jest.fn();

        validateObjectId(req, res, next);

        expect(next).toHaveBeenCalled();
    });
});
