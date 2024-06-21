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

router.post('/roles', auth, isAdmin, adminController.createAdminRoles);




module.exports = router; 