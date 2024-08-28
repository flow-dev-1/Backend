const mongoose = require("mongoose");

// Define the schema for the answer options
const AnswerSchema = new mongoose.Schema({
  index: {
    type: Number,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
});

// Define the schema for each activity
const ActivitySchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true,
  },
  answer: {
    type: mongoose.Schema.Types.Mixed, // Can be either a string or an array of AnswerSchema
    required: true,
  },
  options: {
    type: [String], // Array of strings for the options
    required: true,
  },
});

// Define the schema for the overall structure
const ActivitiesSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: "checkModel",
  },
  email: { type: String },
  checkModel: {
    type: String,
    enum: ["User", "Admin", "School", "Educator"],
  },
  week: {
    type: String,
    required: true
  },
  activities: {
    type: [ActivitySchema], // Array of ActivitySchema
    required: true,
  },
  courseEnrollment:
  {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "CourseEnrollment",
  },
});

const Activity = mongoose.model("Activity", ActivitiesSchema);

module.exports = Activity;
