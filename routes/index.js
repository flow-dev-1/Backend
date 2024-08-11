const mongoose = require('mongoose');
const express = require('express');
const { loginValidator, validate } = require("../middleware/validate");
const router = express.Router();
const indexController = require("../controller/indexController");
const auth = require('../middleware/auth');

router.get('/', async (req, res) => {
    res.json('Hello! welcome to FLOW');
})

router.post('/login', validate(loginValidator), indexController.login);

router.post('/forgot-password', indexController.forgotPassword);

// //Verify OTP
router.patch('/verify-token', auth, indexController.verify_otp_forgotPassword)

router.put('/password', auth, indexController.resetPassword);

module.exports = router; 