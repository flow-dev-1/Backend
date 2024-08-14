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

const educatorSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      auto: true,
    },
    fullName: {
      type: String,
      required: true,
      minlength: 2,
      maxlength: 255,
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
    educatorType: { type: String, enum: ["School", "Individual"] }, //Educators with schools
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
    newInvite: { type: Object }, 
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

educatorSchema.methods.generateAuthToken =  function () {
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

educatorSchema.methods.generateInviteToken = async function () {
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

const educator = mongoose.model("Educator", educatorSchema);

function validateEducator(Educator) {
  const schema = Joi.object({
    DOB: Joi.date().required(),
   fullName: Joi.string()
    .min(2)
    .max(300)
    .required()
    .pattern(/^[a-zA-Z]+ [a-zA-Z]+$/)
    .message(
      "Full name must contain at least a first name and a last name separated by a space."
    ),
    phone: Joi.string()
      .pattern(new RegExp(/^\+[1-9]\d{1,14}$/))
      .message("Please enter a valid phone number in international format")
      .required(),
    email: Joi.string().min(5).max(255).required().email(),
    password: Joi.string().min(8).max(1024).required(),
    grade: Joi.string().optional(),
    gender: Joi.string().valid("male", "female").required(),
    country: Joi.string().min(2).max(255).required(),
    state: Joi.string().min(2).max(255).required(),
    lga: Joi.string().min(2).max(255).required(),
  });
  return schema.validate(Educator);
}

function validateInvitedEducator(Educator) {
  const schema = Joi.object({
    DOB: Joi.date().required(),
   fullName: Joi.string()
    .min(2)
    .max(300)
    .required()
    .pattern(/^[a-zA-Z]+ [a-zA-Z]+$/)
    .message(
      "Full name must contain at least a first name and a last name separated by a space."
    ),
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
  return schema.validate(Educator);
}

function validateEducatorUpdate(Educator) {
const schema = Joi.object({
  DOB: Joi.date().required(),
  fullName: Joi.string()
    .min(2)
    .max(300)
    .required()
    .pattern(/^[a-zA-Z]+ [a-zA-Z]+$/)
    .message(
      "Full name must contain at least a first name and a last name separated by a space."
    ),
  phone: Joi.string()
    .pattern(new RegExp(/^\+[1-9]\d{1,14}$/))
    .message("Please enter a valid phone number in international format")
    .required(),
  email: Joi.string().min(5).max(255).required().email(),
  gender: Joi.string().valid("male", "female").required(),
  country: Joi.string().min(2).max(255).required(),
  state: Joi.string().min(2).max(255).required(),
  lga: Joi.string().min(2).max(255).required(),
});

  return schema.validate(Educator);
}
exports.Educator = educator;
exports.validateEducator = validateEducator;
exports.validateInvitedEducator = validateInvitedEducator;
exports.validateEducatorUpdate = validateEducatorUpdate;
