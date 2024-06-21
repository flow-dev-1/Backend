const express = require('express');
const admin = require("../routes/admin");
const users = require('../routes/users');
const indexRouter = require("../routes/index")
const error = require("../middleware/error");

module.exports = function (app) {
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());
    app.use('/api/admins', admin);
    app.use('/api/schools', admin);
    app.use('/api/users', users);
    app.use("/api", indexRouter)
    app.use("/", indexRouter)

    app.use(error);
}