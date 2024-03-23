const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
// const userController = require("../controller/userController")
// const { loginValidator, validate, validateRestaurantOrder, validateUserAddress } = require("../middleware/validation");
// const { validateUser, validateUserUpdate } = require("../models/user");
// const { validateDispatchOrder } = require("../models/dispatchOrder");
// const auth = require("../middleware/auth")
// const upload = require("../utils/multer");

router.get('/', async (req, res) => {
    res.json('Hello! welcome to FLOW');
})

module.exports = router; 