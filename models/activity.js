const mongoose = require("mongoose");
const { Schema } = mongoose;

// Schema for the overall structure (Activities)
const ActivitiesSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "checkModel"
    },
    email: { type: String },
    checkModel: {
      type: String,
      enum: ["User", "Admin", "School", "Educator"]
    },
    week: {
      type: String,
      required: true
    },
    activities: { type: [Schema.Types.Mixed], default: [], required: true },
    lastActivityIndex: { type: Number },
    // This is for self-awareness course alone
    courseEnrollment: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      ref: "Course"
    },
    courseEnrollmentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      ref: "CourseEnrollment"
    },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null }
  },
  {
    timestamps: true
  }
);

// Create the model
const Activity = mongoose.model("Activity", ActivitiesSchema);

module.exports = Activity;
