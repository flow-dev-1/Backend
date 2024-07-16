const mongoose = require('mongoose');
const express = require('express');
const { loginValidator, validate } = require("../middleware/validate");
const router = express.Router();
const userController = require("../controller/userController");
const auth = require('../middleware/auth');
// const { loginValidator, validate, validateRestaurantOrder, validateUserAddress } = require("../middleware/validation");
// const { validateUser, validateUserUpdate } = require("../models/user");
// const { validateDispatchOrder } = require("../models/dispatchOrder");
// const auth = require("../middleware/auth")
// const upload = require("../utils/multer");

router.get('/', async (req, res) => {
    res.json('Hello! welcome to FLOW');
})

router.post('/login', validate(loginValidator), userController.login);

router.post('/forgot-password', userController.forgotPassword);

// //Verify OTP
router.patch('/verify-token', auth, userController.verify_otp_forgotPassword)

router.put('/password', auth, userController.resetPassword);

module.exports = router; 