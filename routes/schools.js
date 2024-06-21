const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const auth = require("../middleware/auth")
const { loginValidator, validate, registerSchoolValidator, } = require("../middleware/validate");
const schoolsController = require("../controller/schoolsController")
const upload = require("../utils/multer");
const optionalUpload = require('../utils/optionalUpload');
const schoolAccess = require('../middleware/schoolAccess');//This middleware allows users with access 2 a school

router.get('/', async (req, res) => {
    res.json('Hello! welcome to FLOW SCHOOLS');
})

router.post('/', validate(registerSchoolValidator), schoolsController.registerSchool);

router.patch('/verify-account', auth, schoolAccess, schoolsController.verifyAccount);

router.post('/login', validate(loginValidator), schoolsController.loginFlowSchool);

router.post('/forgot-password', schoolsController.forgotPassword);

// //Verify OTP
router.patch('/verify-token', auth, schoolAccess, schoolsController.verify_otp_forgotPassword)

router.put('/password', auth, schoolAccess, schoolsController.resetPassword);

router.patch('/password', auth, schoolAccess, schoolsController.changePassword);

// router.put('/profile', auth, schoolAccess, validate(validateAdminUpdate), schoolsController.updateProfile);

// router.delete('/:id', [auth, schoolAccess], schoolsController.deleteAdmin);


module.exports = router; 