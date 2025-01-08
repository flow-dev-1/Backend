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
    // This is for selfAwareness course
    courseEnrollment: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      ref: "CourseEnrollment"
    },
    // This is for other courses
    courseEnrollmentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
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
      required: false
    },
    text: { type: [String] },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null }
  },
  {
    timestamps: true
  }
);

const Assesment = mongoose.model("Assessments", assesmentSchema);

module.exports = Assesment;
