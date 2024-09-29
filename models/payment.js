const mongoose = require("mongoose");
const courseEnrollment = require("./courseEnrollment");

const paymentSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "checkModel",
    },
    courseEnrollment: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "CourseEnrollment",
    },
    amount: { type: Number },
    fullName: { type: String },
    phone: { type: String },
    email: { type: String },
    checkModel: {
      type: String,
      enum: ["User", "School", "Educator", "Admin"],
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Failed"],
      default: "Pending",
    },
    reference: { type: String },
    paymentDetails: {},
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Payment", paymentSchema);
