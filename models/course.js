const mongoose = require("mongoose");
const courseEnrollment = require("./courseEnrollment");

const courseSchema = mongoose.Schema({
    createdBy: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Admin' },
    title: { type: String, required: true },
    description: { type: String, required: true },
    cost: { type: Number, required: true },
    currency: { type: String, required: true },
    status: { type: String, required: true },
    access: { type: String, required: true },
    url: { type: String, required: true },
    image: { type: String, required: true },
    courseEnrollment: [{ type: mongoose.Schema.Types.ObjectId, required: true, ref: 'CourseEnrollment' }],
    likes: [{ type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' }]

}, {
    timestamps: true,
});

module.exports = mongoose.model('Course', courseSchema);
