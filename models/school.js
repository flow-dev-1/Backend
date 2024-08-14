const jwt = require("jsonwebtoken");
const Joi = require("joi");
const mongoose = require("mongoose");
const { plugin } = require("mongoose");
const { SoftDelete } = require("soft-delete-mongoose-plugin");


// define soft delete field name
const IS_DELETED_FIELD = "isDeleted";
const DELETED_AT_FIELD = "deletedAt";

// use soft delete plugin
plugin(
    new SoftDelete({
        isDeletedField: IS_DELETED_FIELD,
        deletedAtField: DELETED_AT_FIELD,
    }).getPlugin()
);

const schoolsSchema = new mongoose.Schema({
    school_name: {
        type: String,
        required: true,
        minlength: 2,
        maxlength: 250
    },
    contact_name: {
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
    },
    isSchool: {
        type: Boolean,
        default: true
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    address: {
        type: String,
        required: true

    },
    grade: {
        type: String,
        required: true
    },
    team: [{ type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' }],
    email_notification: [{
        fullName: { type: String },
        email: { type: String },
        position: { type: String },
        dateAdded: { type: Date, default: Date.now }
    }],
    country: { type: String, required: true },
    state: { type: String, required: true },
    lga: { type: String },
    resetPassword: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletionProperties: {
        reason: { type: String },
        // suggestion: { type: String },
    }
},
    {
        timestamps: true,
    });

schoolsSchema.methods.generateAuthToken = async function () {

    const token = jwt.sign(
        {
            _id: this._id,
            isVerified: this.isVerified,
            schoolName: this.school_name,
            contactName: this.contact_name,
            email: this.email,
            phone: this.phone,
            isSchool: this.isSchool

        },
        process.env.JWT,
        {
            expiresIn: "7d",
        }
    );
    return token;
};

// schoolsSchema.methods.softDelete = async function () {
//     this.isDeleted = true;
//     this.deletedAt = new Date();
//     await this.save();
// };
const school = mongoose.model("School", schoolsSchema);

exports.Schools = school
