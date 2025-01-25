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

const courseEnrollment = require("./courseEnrollment");

const courseSchema = mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Admin",
    },
    title: { type: String, required: true },
    topic: { type: String, required: false },
    description: { type: String, required: true },
    cost: { type: Number, required: true },
    currency: { type: String, required: true },
    weeks: { type: Number, default: 5 },
    status: { type: String, required: true, enum: ["draft", "published"] },
    grade: {
      type: String,
      required: true,
      enum: ["Primary", "Secondary", "Educator"],
    },
    access: {
      type: String,
      required: true,
      enum: ["Individual", "School", "General"],
    },
    url: { type: String, required: true },
    image: { type: String, required: true },
    banner: { type: String, required: false },
    courseEnrollment: [
      {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "CourseEnrollment",
      },
    ],
    likes: [
      { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
    ],
    dislikes: [
      { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
    ],
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Course", courseSchema);
