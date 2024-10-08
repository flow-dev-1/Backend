const winston = require("winston");
const express = require("express");
const morgan = require('morgan');
const cron = require('node-cron');
const courseReminder = require("./utils/cronJobs/courseReminder.js");
const { welcome_new_user, flow_course_reminder } = require("./utils/sendmail.js");

require('dotenv').config();
require("./startup/logging")();

const app = express();

app.use(morgan('tiny'));

require("./startup/cors.js")(app);
require("./startup/db")();

cron.schedule('0 12 * * *', () => {
    console.log("Running at 12:00 PM every day");
    courseReminder();
});



require("./startup/routes")(app);

// require("./startup/validation")();

const port = process.env.PORT;

const server = app.listen(port, () =>
    winston.info(`Listening on port ${port}...`)
);
module.exports = server;
