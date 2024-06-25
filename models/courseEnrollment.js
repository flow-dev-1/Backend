const mongoose = require("mongoose");

const courseEnrollmentSchema = new mongoose.Schema({
    _id: {
        type: mongoose.Schema.Types.ObjectId,
        auto: true
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
        enum: ['Pending', 'Confirmed', "Deactivated"],
        default: 'Pending'
    },
    progress: {
        type: Number,
        default: 0
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("CourseEnrollment", courseEnrollmentSchema);
