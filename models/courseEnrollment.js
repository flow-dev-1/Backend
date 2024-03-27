const mongoose = require("mongoose");

const courseEnrollmentSchema = new mongoose.Schema({
    first_name: {
        type: String,
        required: true
    },
    last_name: {
        type: String,
        required: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        // required: true
    },
    amount: { type: String },
    email: {
        type: String,
        required: true
    },
    phone: {
        type: String
    },
    status: {
        type: String,
        enum: ['Pending', 'Confirmed'],
        default: 'Pending'
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
});

module.exports = mongoose.model("CourseEnrollment", courseEnrollmentSchema);
