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

router.get('/parent', auth, userController.getParentWithNewCourseInvite);

router.get('/courses', auth, userController.getCourses);

router.get('/payments', auth, userController.getPayments);

router.post('/register', validate(validateUser), userController.registerUser);

router.post('/invited-user', auth, validate(validateInvitedUser), userController.registerInvitedUser);

router.post('/invited-school-admin', auth, validate(validateInvitedUser), userController.registerSchoolInvitedAdmin);

router.patch('/profile', auth, validate(validateUserUpdate), userController.updateProfile);

router.post('/courses/:id/enroll', auth, userController.courseEnrollment);

router.put("/course-enrollment/:id/activity", auth, userController.activityData);

router.get("/course-enrollment/:id/get-activity/:week", auth, userController.getactivityData);





module.exports = router; 