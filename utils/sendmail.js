// const image = require('./legumes.jpg')
const nodemailer = require("nodemailer");
const { EMAIL, EMAIL_USER, EMAIL_PASS } = require("../config/keys");
const path = require('path');
// const smtpTransport = require('nodemailer-smtp-transport');


exports.Otp_VerifyAccount = async (email, name, otp) => {
    try {
        const transporter = nodemailer.createTransport({
            service: EMAIL_USER,
            secure: true,
            auth: {
                pass: EMAIL_PASS,
                user: EMAIL
            },
        });

        await transporter.sendMail({
            from: EMAIL,
            to: email,
            subject: 'FLOW Email Verification',
            html: `
      <b>Hi ${name},</b>
      <p> Welcome to FLOW.</p>
      
      <p>To verify your account, Use the OTP Code below to verify account</p>
      
      <b>CODE: ${otp}</b>
      `,

        });
        console.log("email sent successfully");

    } catch (error) {
        console.log(error, "email not sent");
    }
};


exports.Otp_ForgotPassword = async (email, otp) => {
    try {
        const transporter = nodemailer.createTransport({
            service: EMAIL_USER,
            secure: true,
            auth: {
                pass: EMAIL_PASS,
                user: EMAIL
            },
        });

        await transporter.sendMail({
            from: EMAIL,
            to: email,
            subject: ' FLOW Reset Password',
            html: ` <b> Hi, </b></br>
        <p>We recieved a request to reset the Password on your FLOW Account.</p>
        </br>
        <p>Please enter this code to complete password reset.</p>
        </br>
        </br>
        <b>CODE:${otp}</b>
        </br>
        </br>
        <p>Thanks for helping us keep your account secure. </p>`,

        });
        console.log("email sent sucessfully");

    } catch (error) {
        console.log(error, "email not sent");
    }
};
