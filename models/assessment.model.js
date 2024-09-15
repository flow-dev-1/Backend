const mongoose = require("mongoose");
const { Schema } = mongoose;

const assesmentSchema = new mongoose.Schema(
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
    personalityColor: {
      type: String
    },
    assessments: { type: [Schema.Types.Mixed], default: [], required: true },
    rating: {
      type: String,
      required: true
    },
    text: { type: [String] },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null }
  },
  {
    timestamps: true
  }
);

const Assesment = mongoose.model("assessments", assesmentSchema);

module.exports = Assesment;
