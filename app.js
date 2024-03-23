const winston = require("winston");
const express = require("express");
const morgan = require('morgan');

require('dotenv').config();
require("./startup/logging")();

const app = express();

app.use(morgan('tiny'));

require("./startup/cors.js")(app);
require("./startup/routes")(app);
require("./startup/db")();
// require("./startup/validation")();


const port = process.env.PORT;

const server = app.listen(port, () =>
    winston.info(`Listening on port ${port}...`)
);
module.exports = server;
