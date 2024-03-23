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
        unique: true
    },
    password: {
        type: String,
        required: true,
        minlength: 5,
        maxlength: 1024
    },
    phone: {
        type: String,
        required: true
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
        required: true
    },
    age: {
        type: Number,
        required: true
    },

    country: { type: String },
    state: { type: String },
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
            firstName: this.first_name,
            lastName: this.last_name,
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

const User = mongoose.model("User", userSchema);

function validateUser(user) {

    const schema = Joi.object({
        first_name: Joi.string()
            .min(2)
            .max(100)
            .required(),
        age: Joi.number()
            .min(18)
            .max(100)
            .required(),
        last_name: Joi.string()
            .min(2)
            .max(100)
            .required(),
        phone: Joi.string()
            .min(11)
            .max(11)
            .message('Please enter a valid phone number.')
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
        age: Joi.number()
            .min(18)
            .max(100)
            .required(),
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
            .required()
    })
    return schema.validate(user);
}

function validateUserUpdate(user) {

    const schema = Joi.object({
        full_name: Joi.string()
            .min(2)
            .max(250)
            .required(),
        phone: Joi.string()
            .pattern(new RegExp(/^\+[1-9]\d{1,14}$/))
            .message('Please enter a valid phone number in international format')
            .required(),
        isoCode: Joi.string()
            .pattern(new RegExp(/^\+[1-9]\d{1,14}$/))
            .message('Please enter a valid iso-code')
            .required(),
        email: Joi.string()
            .min(5)
            .max(255)
            .required()
            .email(),

    })
    return schema.validate(user);
}
exports.User = User;
exports.validateUser = validateUser;
exports.validateUserUpdate = validateUserUpdate
