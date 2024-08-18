const express = require('express');
const admin = require("../routes/admin");
const educator = require("../routes/educators");
const school = require("../routes/schools");
const users = require('../routes/users');
const indexRouter = require("../routes/index")
const paymentRouter = require("../routes/payment")
const error = require("../middleware/error");

module.exports = function (app) {
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());
    app.use('/api/admins', admin);
    app.use("/api/educator", educator);
    app.use('/api/schools', school);
    app.use('/api/users', users);
    app.use("/api", indexRouter)
    app.use("/", paymentRouter)

    app.use(error);
}