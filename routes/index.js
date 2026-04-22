const mongoose = require('mongoose');
const express = require('express');
const { loginValidator, validate } = require("../middleware/validate");
const router = express.Router();
const indexController = require("../controller/indexController");
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');

router.get('/', async (req, res) => {
    res.json('Hello! welcome to FLOW');
})

// router.post('/fixing', indexController.fixing_selfawareness);

router.post('/login', validate(loginValidator), indexController.login);

router.post('/forgot-password', indexController.forgotPassword);

// //Verify OTP
router.patch('/verify-token', auth, indexController.verify_otp_forgotPassword)

router.patch("/verify-account", auth, indexController.verifyAccount);


router.put('/password', auth, indexController.resetPassword);

router.get("/id", indexController.generateUserId);

// Assign a course to school 66ea7ff154d898ec66826d3b for Year 7 (JSS 1)
router.post("/assign-course", auth, isAdmin, indexController.assignCourseToSchool);

module.exports = router; 