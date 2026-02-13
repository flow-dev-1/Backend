const mongoose = require("mongoose");

const courseEnrollmentSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      auto: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      // required: true
    },
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      // required: true
    },
    schoolCourseEnrollment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SchoolCourseEnrollment",
      // required: true
    },
    status: {
      type: String,
      enum: ["Pending", "Accepted", "Confirmed", "Deactivated"],
      default: "Pending",
    },
    progress: {
      type: Number,
      default: 0,
    },
    lastWeekIndex: {
      type: Number,
      default: 1,
    },
    stdClass: {
      type: String
    },
    classTag: {
      type: String
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "checkModel",
    },
    checkModel: {
      type: String,
      enum: ["User", "School", "Educator"],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("CourseEnrollment", courseEnrollmentSchema);
