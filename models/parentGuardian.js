const mongoose = require("mongoose");

const parentSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: "checkModel",
    },
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


