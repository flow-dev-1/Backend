const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const auth = require("../middleware/auth")
const { loginValidator, validate, registerSchoolValidator, updateSchoolValidator, inviteAdminValidator, } = require("../middleware/validate");
const schoolsController = require("../controller/schoolsController")
const upload = require("../utils/multer");
const optionalUpload = require('../utils/optionalUpload');
const schoolAccess = require('../middleware/schoolAccess');//This middleware allows users with access 2 a school

router.get('/', async (req, res) => {
    res.json('Hello! welcome to FLOW SCHOOLS');
})

router.get('/me', auth, schoolAccess, schoolsController.getCurrentSchool);

router.get('/:id/team', auth, schoolAccess, schoolsController.getSchoolAdminTeam);

router.get('/:id/email-list', auth, schoolAccess, schoolsController.getSchoolEmailTeam);

router.post('/', validate(registerSchoolValidator), schoolsController.registerSchool);

router.patch('/verify-account', auth, schoolAccess, schoolsController.verifyAccount);

router.post('/login', validate(loginValidator), schoolsController.loginFlowSchool);

router.post('/forgot-password', schoolsController.forgotPassword);

// //Verify OTP
router.patch('/verify-token', auth, schoolAccess, schoolsController.verify_otp_forgotPassword)

router.put('/password', auth, schoolAccess, schoolsController.resetPassword);

router.patch('/password', auth, schoolAccess, schoolsController.changePassword);

router.put('/profile', auth, schoolAccess, optionalUpload.single('image'), validate(updateSchoolValidator), schoolsController.updateProfile);

router.post('/invitation', auth, validate(inviteAdminValidator), schoolsController.inviteSchoolAdmin);

router.post('/email-notification', auth, validate(inviteAdminValidator), schoolsController.addEmailNotificationadmin);

router.delete('/teams/:id', auth, schoolAccess, schoolsController.removeSchoolAdmin);

router.delete('/email-list/:id', auth, schoolAccess, schoolsController.removeEmailAdmin);


// router.delete('/:id', [auth, schoolAccess], schoolsController.deleteAdmin);


module.exports = router; 