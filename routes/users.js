const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const userController = require("../controller/userController");
const { loginValidator, validate, } = require("../middleware/validate");
const { validateUser, validateUserUpdate, validateInvitedUser } = require('../models/user');
const auth = require("../middleware/auth")
// const upload = require("../utils/multer");

router.get('/', async (req, res) => {
    res.json('Hello! welcome to Qwique User');
})
router.get('/me', auth, userController.getLoggedUser);

router.get('/courses', auth, userController.getCourses);

router.post('/register', validate(validateUser), userController.registerUser);

router.post('/invited-user', auth, validate(validateInvitedUser), userController.registerInvitedUser);

router.post('/invited-school-admin', auth, validate(validateInvitedUser), userController.registerSchoolInvitedAdmin);

router.patch('/verify-account', auth, userController.verifyAccount);
router.post('/login', validate(loginValidator), userController.login);
router.post('/forgot-password', userController.forgotPassword);
// //Verify OTP
router.post('/verify-token', auth, userController.verify_otp_forgotPassword)

router.put('/password', auth, userController.resetPassword);

router.put('/profile', auth, validate(validateUserUpdate), userController.updateProfile);

router.post('/courses/:id/enroll', auth, userController.courseEnrollment);

module.exports = router; 