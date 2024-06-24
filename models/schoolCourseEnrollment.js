const mongoose = require("mongoose");

const schoolCourseEnrollmentSchema = new mongoose.Schema({

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
    status: {
        type: String,
        enum: ['Active', 'Deactivated'],
        default: 'Active'
    },
    stdClass: {
        type: String //This is also responsible for educator class
    },
    dayOfWeek: {
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    },
    startTime: {
        type: String, // Store time as string in "HH:mm" format
        required: true
    },
    endTime: {
        type: String, // Store time as string in "HH:mm" format
        required: true
    },
    students: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }]
});

module.exports = mongoose.model("SchoolCourseEnrollment", schoolCourseEnrollmentSchema);
