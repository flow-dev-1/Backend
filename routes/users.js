const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const userController = require("../controller/userController");
const { loginValidator, validate, } = require("../middleware/validate");
const { validateUser } = require('../models/user');
const auth = require("../middleware/auth")
// const upload = require("../utils/multer");

router.get('/', async (req, res) => {
    res.json('Hello! welcome to Qwique User');
})

router.post('/register', validate(validateUser), userController.registerUser);
router.patch('/verify-account', auth, userController.verifyAccount);
router.post('/login', validate(loginValidator), userController.login);
router.post('/forgot-password', userController.forgotPassword);
//Verify OTP
router.post('/verify-token', auth, userController.verify_otp_forgotPassword)

router.put('/password', auth, userController.resetPassword);

module.exports = router; 