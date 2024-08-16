const mongoose = require("mongoose");

const parentSchema = mongoose.Schema({
    fullName: { type: String },
    email: { type: String, },
    phone: {
        type: String,
        required: false,
    },
    country: { type: String },
    state: { type: String },
    lga: { type: String },
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});



const parents = mongoose.model('Parent', parentSchema);

exports.Parents = parents


