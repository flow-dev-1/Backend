const jwt = require("jsonwebtoken");
const Joi = require("joi");
const mongoose = require("mongoose");
const { SoftDelete } = require("soft-delete-mongoose-plugin");

// defind soft delete field name
const IS_DELETED_FIELD = "isDeleted";
const DELETED_AT_FIELD = "deletedAt";

// use soft delete plugin
mongoose.plugin(new SoftDelete({
    isDeletedField: IS_DELETED_FIELD,
    deletedAtField: DELETED_AT_FIELD,
}).getPlugin());


const adminSchema = new mongoose.Schema({
    first_name: {
        type: String,
        required: true,
        minlength: 2,
        maxlength: 250
    },
    last_name: {
        type: String,
        required: true,
        minlength: 2,
        maxlength: 250
    },
    email: {
        type: String,
        required: true,
        minlength: 5,
        maxlength: 255,
    },
    password: {
        type: String,
        required: false,
        minlength: 5,
        maxlength: 1024
    },
    phone: {
        type: String,
        required: false
    },
    photo: {
        type: String,
        required: false
    },
    isAdmin: { type: Boolean, default: true },
    adminType: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'AdminRole' },

    isVerified: {
        type: Boolean,
        default: false
    },
    address: {
        type: String,
    },
    gender: {
        type: String,
        required: false
    },


    country: { type: String },
    state: { type: String },
    resetPassword: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
},
    {
        timestamps: true,
    });

adminSchema.methods.generateAuthToken = async function () {
    // Populate adminType
    await this.populate('adminType');
    const token = jwt.sign(
        {
            _id: this._id,
            isVerified: this.isVerified,
            firstName: this.first_name,
            lastName: this.last_name,
            email: this.email,
            phone: this.phone,
            isAdmin: this.isAdmin,
            adminType: this.adminType

        },
        process.env.JWT,
        {
            expiresIn: "1d",
        }
    );
    return token;
};

module.exports = mongoose.model("Admin", adminSchema);
