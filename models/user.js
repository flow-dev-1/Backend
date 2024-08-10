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


const userSchema = new mongoose.Schema({
    _id: {
        type: mongoose.Schema.Types.ObjectId,
        auto: true
    },
    fullName: {
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
        unique: true
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
    DOB: {
        type: Date,
        required: false
    },
    userType: { type: String, enum: ["School", "Individual"] },//users with schools
    grade: { type: String, enum: ["Primary", "Secondary", "Educator"] },
    school: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'School' },
    isSchoolAdmin: { type: Boolean, default: false },
    schoolAdminStatus: { type: String, enum: ["Pending", "Confirmed"] },
    schoolAdminPermission: { type: String, enum: ["Admin", "Students", "Teachers"] },
    schoolAdminDate: { type: Date },
    newCourseInvite: { type: Object },
    newInvite: { type: Object },//This accounts for admin invitation dat has not been accepted or rejected
    country: { type: String },
    state: { type: String },
    lga: { type: String },
    resetPassword: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletionProperties: {
        reason: { type: String },
        suggestion: { type: String },
    }
},
    {
        timestamps: true,
    });

userSchema.methods.generateAuthToken = function () {
    const token = jwt.sign(
        {
            _id: this._id,
            isVerified: this.isVerified,
            fullName: this.fullName,
            email: this.email,
            phone: this.phone,
            gender: this.gender

        },
        process.env.JWT,
        {
            expiresIn: "7d",
        }
    );
    return token;
};

userSchema.methods.generateInviteToken = function () {
    const token = jwt.sign(
      {
        _id: this._id,
        isVerified: this.isVerified,
        fullName: this.fullName,
        email: this.email,
        phone: this.phone,
        gender: this.gender,
      },
      process.env.JWT,
      {
        expiresIn: "30d",
      }
    );
    return token;
};

const User = mongoose.model("User", userSchema);

function validateUser(user) {

    const schema = Joi.object({
        first_name: Joi.string()
            .min(2)
            .max(100)
            .required(),
        DOB: Joi.date()
            .required(),
        last_name: Joi.string()
            .min(2)
            .max(100)
            .required(),
        phone: Joi.string()
            .pattern(new RegExp(/^\+[1-9]\d{1,14}$/))
            .message('Please enter a valid phone number in international format')
            .required(),
        email: Joi.string()
            .min(5)
            .max(255)
            .required()
            .email(),
        password: Joi.string()
            .min(8)
            .max(1024)
            .required(),
        grade: Joi.string()
            .optional(),
        gender: Joi.string()
            .valid('male', 'female')
            .required(),
        country: Joi.string()
            .min(2)
            .max(255)
            .required(),
        state: Joi.string()
            .min(2)
            .max(255)
            .required(),
        lga: Joi.string()
            .min(2)
            .max(255)
            .required()
    })
    return schema.validate(user);
}

function validateInvitedUser(user) {

    const schema = Joi.object({
        first_name: Joi.string()
            .min(2)
            .max(100)
            .required(),
        DOB: Joi.date()
            .required(),
        last_name: Joi.string()
            .min(2)
            .max(100)
            .required(),
        phone: Joi.string()
            .pattern(new RegExp(/^\+[1-9]\d{1,14}$/))
            .message('Please enter a valid phone number in international format')
            .required(),
        email: Joi.string()
            .min(5)
            .max(255)
            .required()
            .email(),
        password: Joi.string()
            .allow(null)
            .optional(),
        grade: Joi.string()
            .optional(),
        gender: Joi.string()
            .valid('male', 'female')
            .required(),
        country: Joi.string()
            .min(2)
            .max(255)
            .required(),
        state: Joi.string()
            .min(2)
            .max(255)
            .required(),
        lga: Joi.string()
            .min(2)
            .max(255)
            .required()
    })
    return schema.validate(user);
}

function validateUserUpdate(user) {

    const schema = Joi.object({
        first_name: Joi.string()
            .min(2)
            .max(100)
            .required(),
        DOB: Joi.date()
            .required(),
        last_name: Joi.string()
            .min(2)
            .max(100)
            .required(),
        phone: Joi.string()
            .pattern(new RegExp(/^\+[1-9]\d{1,14}$/))
            .message('Please enter a valid phone number in international format')
            .required(),
        email: Joi.string()
            .min(5)
            .max(255)
            .required()
            .email(),
        // password: Joi.string()
        //     .min(8)
        //     .max(1024)
        //     .required(),
        gender: Joi.string()
            .valid('male', 'female')
            .required(),
        country: Joi.string()
            .min(2)
            .max(255)
            .required(),
        state: Joi.string()
            .min(2)
            .max(255)
            .required(),
        lga: Joi.string()
            .min(2)
            .max(255)
            .required()
    })
    return schema.validate(user);
}
exports.User = User;
exports.validateUser = validateUser;
exports.validateInvitedUser = validateInvitedUser;
exports.validateUserUpdate = validateUserUpdate
