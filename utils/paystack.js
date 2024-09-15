const dotenv = require("dotenv");
const { PAYSTACK_SECRET_KEY, ENVIRONMENT } = require('../config/keys')
dotenv.config();
const axios = require('axios');
const paystack = require("paystack")(PAYSTACK_SECRET_KEY);
const paystack_api = require("paystack-api")(PAYSTACK_SECRET_KEY);

exports.initiatePaystackPayment = async (amount, email, name, enrolmentId) => {
    const params = {
        amount: amount * 100,
        email: email,
        name: name,
        // channels:['card','bank'],
        callback_url: ENVIRONMENT === "production" ? "https://dashboard.flow.ng/dashboard/enrollment/confirm" :
            ENVIRONMENT === "staging" ? "https://my-flow.netlify.app/dashboard/enrollment/confirm" : "http://localhost:3000/dashboard/enrollment/confirm",
        metadata: {
            enrolmentId
        }
    };

    const data = await paystack.transaction.initialize(params);

    return data;
};


//Charge a user saved card.
exports.charge_authorization = async (amount, email, authorization_code) => {
    const params = {
        amount: amount * 100,
        email: email,
        authorization_code
    };

    const data = await paystack.transaction.charge(params);

    return data;
};

exports.validatePaystackPayment = async (reference) => {
    const data = await paystack.transaction.verify(reference);

    return data;
};

exports.verifyAccount = async (account_number, bank_code) => {

    try {
        const params = {
            account_number,
            bank_code
        }
        const data = await paystack_api.verification.resolveAccount(params);
        // console.log({params:data});

        return data;
    } catch (error) {
        return error.error
    }

};

exports.bankList = async () => {
    const data = await paystack.misc.list_banks()
    return data
}