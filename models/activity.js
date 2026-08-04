const mongoose = require("mongoose");
const { Schema } = mongoose;

const FeedbackGenerationSchema = new Schema(
  {
    status: {
      type: String,
      enum: ["queued", "processing", "completed", "failed"],
      required: true
    },
    inputHash: { type: String, default: null },
    attempts: { type: Number, default: 0, min: 0 },
    lastError: { type: String, default: null, maxlength: 2000 },
    queuedAt: { type: Date, default: null },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null }
  },
  { _id: false }
);

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
    feedbackGeneration: {
      type: FeedbackGenerationSchema,
      default: undefined
    },
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
