const winston = require('winston');
const mongoose = require('mongoose');
require('dotenv').config();

const db = process.env.MONGODB_URI || process.env.ATLAS_URI

module.exports = function () {
    //   const environment = process.env.NODE_ENV;
    // console.log(`Current environment: ${environment}`);
    mongoose.connect(db)
        .then(() => winston.info(`Connected to DB...`));
}