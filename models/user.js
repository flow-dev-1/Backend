const jwt = require("jsonwebtoken");
const Joi = require("joi");
const mongoose = require("mongoose");
const { SoftDelete } = require("soft-delete-mongoose-plugin");

// defind soft delete field name
const IS_DELETED_FIELD = "isDeleted";
const DELETED_AT_FIELD = "deletedAt";

// use soft delete plugin
mongoose.plugin(
  new SoftDelete({
    isDeletedField: IS_DELETED_FIELD,
    deletedAtField: DELETED_AT_FIELD,
  }).getPlugin()
);

const userSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      auto: true,
    },
    fullName: {
      type: String,
      required: true,
      minlength: 2,
      maxlength: 250,
    },
    userId: {
      type: String,
      required: true,
      unique: true,
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
      maxlength: 1024,
    },
    phone: {
      type: String,
      required: false,
    },
    photo: {
      type: String,
      required: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    address: {
      type: String,
    },
    gender: {
      type: String,
      required: false,
    },
    DOB: {
      type: Date,
      required: false,
    },
    guardianFullName: {
      type: String,
      required: true,
      minlength: 2,
      maxlength: 250,
    },
    userType: { type: String, enum: ["School", "Individual"] }, //users with schools
    grade: { type: String, enum: ["Primary", "Secondary", "Educator"] },
    school: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      ref: "School",
    },
    isSchoolAdmin: { type: Boolean, default: false },
    schoolAdminStatus: { type: String, enum: ["Pending", "Confirmed"] },
    schoolAdminPermission: {
      type: String,
      enum: ["Admin", "Students", "Teachers"],
    },
    schoolAdminDate: { type: Date },
    newCourseInvite: { type: Object },
    newInvite: { type: Object }, //This accounts for admin invitation dat has not been accepted or rejected
    country: { type: String },
    state: { type: String },
    lga: { type: String },
    resetPassword: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletionProperties: {
      reason: { type: String },
      suggestion: { type: String },
    },
  },
  {
    timestamps: true,
  }
);

userSchema.methods.generateAuthToken = function () {
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
  const studentSchema = Joi.object({
    userId: Joi.string().optional(),
    fullName: Joi.string()
      .min(2)
      .max(300)
      .required()
      .pattern(/^[a-zA-Z]+(?: [a-zA-Z]+)+$/)
      .message(
        "Full name must contain at least a first name and a last name separated by a space."
      ),
    grade: Joi.string().optional(),
    gender: Joi.string().valid("male", "female").required(),
    DOB: Joi.date().required(),
    password: Joi.string().min(8).max(1024).required(),
  });

  const schema = Joi.object({
    guardianFullName: Joi.string()
      .min(2)
      .max(300)
      .required()
      .pattern(/^[a-zA-Z]+(?: [a-zA-Z]+)+$/)
      .message(
        "Guardian's full name must contain at least a first name and a last name separated by a space."
      ),
    phone: Joi.string()
      .pattern(/^\+[1-9]\d{1,14}$/)
      .message("Please enter a valid phone number in international format")
      .required(),
    email: Joi.string().min(5).max(255).required().email(),
    country: Joi.string().min(2).max(255).required(),
    state: Joi.string().min(2).max(255).required(),
    lga: Joi.string().min(2).max(255).required(),
    student: Joi.array().items(studentSchema).min(1).required(),
  });

  return schema.validate(user);
}


function validateInvitedUser(user) {
  const schema = Joi.object({
    fullName: Joi.string()
      .min(2)
      .max(300)
      .required()
      .pattern(/^[a-zA-Z]+ [a-zA-Z]+$/)
      .message(
        "Full name must contain at least a first name and a last name separated by a space."
      ),
    guardianFullName: Joi.string()
      .min(2)
      .max(300)
      .required()
      .pattern(/^[a-zA-Z]+ [a-zA-Z]+$/)
      .message(
        "Full name must contain at least a first name and a last name separated by a space."
      ),
    DOB: Joi.date().required(),
    phone: Joi.string()
      .pattern(new RegExp(/^\+[1-9]\d{1,14}$/))
      .message("Please enter a valid phone number in international format")
      .required(),
    email: Joi.string().min(5).max(255).required().email(),
    password: Joi.string().allow(null).optional(),
    grade: Joi.string().optional(),
    gender: Joi.string().valid("male", "female").required(),
    country: Joi.string().min(2).max(255).required(),
    state: Joi.string().min(2).max(255).required(),
    lga: Joi.string().min(2).max(255).required(),
  });
  return schema.validate(user);
}

function validateUserUpdate(user) {
  const schema = Joi.object({
    fullName: Joi.string()
      .min(2)
      .max(300)
      .pattern(/^[a-zA-Z]+ [a-zA-Z]+$/)
      .message(
        "Full name must contain at least a first name and a last name separated by a space."
      )
      .optional(),
    phone: Joi.string()
      .pattern(new RegExp(/^\+[1-9]\d{1,14}$/))
      .message("Please enter a valid phone number in international format"),
    email: Joi.string().min(5).max(255).email().optional(),
    gender: Joi.string().valid("male", "female").optional(),
    country: Joi.string().min(2).max(255).optional(),
    state: Joi.string().min(2).max(255).optional(),
    lga: Joi.string().min(2).max(255).optional(),
  });
  return schema.validate(user);
}
exports.User = User;
exports.validateUser = validateUser;
exports.validateInvitedUser = validateInvitedUser;
exports.validateUserUpdate = validateUserUpdate;
