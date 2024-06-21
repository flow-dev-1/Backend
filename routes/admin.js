const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const isAdmin = require("../middleware/isAdmin")
const auth = require("../middleware/auth")
const { inviteAdminValidator, loginValidator, validate, registerAdminValidator, createCourseValidator, } = require("../middleware/validate");
const adminController = require("../controller/adminController")
// const { loginValidator, validate, validateRestaurantOrder, validateUserAddress } = require("../middleware/validation");
// const { validateUser, validateUserUpdate } = require("../models/user");
// const { validateDispatchOrder } = require("../models/dispatchOrder");
// const auth = require("../middleware/auth")
const upload = require("../utils/multer");
const optionalUpload = require('../utils/optionalUpload');

router.get('/', async (req, res) => {
    res.json('Hello! welcome to FLOW ADMIN');
})

router.post('/roles', adminController.createAdminRoles);

router.get('/roles', adminController.getAdminRoles);

router.post('/invitation',
    // auth,
    //  isAdmin, validate(inviteAdminValidator), 
    adminController.inviteFlowAdmin);

router.post('/register', auth, isAdmin, validate(registerAdminValidator), adminController.registerFlowAdmin);

router.patch('/verify-account', auth, isAdmin, adminController.verifyAccount);

router.post('/login', validate(registerAdminValidator), adminController.loginFlowAdmin);

router.post('/forgot-password', adminController.forgotPassword);
// //Verify OTP
router.patch('/verify-token', auth, isAdmin, adminController.verify_otp_forgotPassword)

router.put('/password', auth, isAdmin, adminController.resetPassword);

/********************** Courses Routes *********************/
router.get('/courses', auth, isAdmin, adminController.getCourses);

router.post('/courses', auth, isAdmin, upload.single('image'), validate(createCourseValidator), adminController.createCourses);

router.put('/courses/:id', auth, isAdmin, optionalUpload.single('image'), validate(createCourseValidator), adminController.updateCourses);

router.delete('/courses/:id', auth, isAdmin, adminController.deleteCourse);


module.exports = router; 