const mongoose = require("mongoose");

const assesmentSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "checkModel"
    },
    email: { type: String },
    courseEnrollment: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "CourseEnrollment"
    },
    checkModel: {
      type: String,
      enum: ["User", "Admin", "School", "Educator"]
      // required: true,
    },
    week: {
      type: String,
      required: true
    },
    rating: {
      type: String,
      required: true
    },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null }
  },
  {
    timestamps: true
  }
);

const Assesment = mongoose.model("assessments", assesmentSchema);

module.exports = Assesment

