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

});

module.exports = mongoose.model('Parent', parentSchema);


