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

const adminRoleSchema = mongoose.Schema({

    type: { type: String, enum: ["Super-Admin", "Admin"] },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
});

module.exports = mongoose.model('AdminRole', adminRoleSchema);


