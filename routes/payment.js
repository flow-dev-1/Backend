const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const paymentController = require("../controller/paymentController");
const auth = require('../middleware/auth');


router.get('/', async (req, res) => {
    res.json('Hello! welcome to FLOW');
})

router.post('/validate-transaction', auth, paymentController.validatePaymentByCallback);

router.post('/', paymentController.validatePaymentByWebhook);

module.exports = router; 