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


exports.Otp_ForgotPassword = async (name, email, otp, token) => {
    let link = process.env.ENV === 'staging' ? `https://my-flow.netlify.app/reset-password?t=${token}&c=${otp}` : `http://localhost:3000/reset-password?t=${token}&c=${otp}`

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
            html: ` <b> Hi ${name} </b></br>
            <p>We recieved a request to reset the Password on your FLOW Account.</p>
            </br>
            <p>Please click or copy this link to complete password reset.</p>
            </br>
            </br>
            <b><a href="${link}">${link}</a></b>
            </br>
            </br>
            <p>Please do not forward this email to others in order to prevent anybody else from accessing your account.</p>   
            </br>
            <p>Thanks for helping us keep your account secure. </p>`,

        });
        console.log("email sent sucessfully");

    } catch (error) {
        console.log(error, "email not sent");
    }
};

exports.admin_invite = async (name, email, token) => {
    let link = process.env.ENV === 'staging' ? `https://my-flow.netlify.app/register?t=${token}&email=${email}` : ` http://localhost:5173/register?t=${token}&email=${email}`

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
            html: ` <b> Hi ${name} </b></br>
            <p>You have been invited to Join FLOW as an Administrator.</p>
            </br>
            <p>Please click or copy this link to complete your sign up.</p>
            </br>
            </br>
            <b><a href="${link}">${link}</a></b>
            </br>
            </br>
            <p>Please do not forward this email to others in order to prevent anybody else from accessing your account.</p>   
            </br>
            <p>Kind Regards! </p>`,

        });
        console.log("email sent sucessfully");

    } catch (error) {
        console.log(error, "email not sent");
    }
};

exports.school_admin_invite = async (status, first_name, last_name, school_id, school_name, email, token) => {
    let query = `t=${token}&s=${school_id}&email=${email}&first_name=${first_name}&last_name=${last_name}`
    let link;
    // if (status === "new") {
    // This is a new user
    link = process.env.ENV === 'staging' ? `https://my-flow.netlify.app/invited-admin?${query}` : `http://localhost:3000/invited-admin?${query}`

    // } else {
    //     // This is for users that are already registered.
    //     // They just need to accept and confirm the invitation
    //     link = process.env.ENV === 'staging' ? `https://my-flow.netlify.app/invited-admin?${query}` : `http://localhost:3000/invited-admin?${query}`
    // }


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
            subject: 'FLOW For Schools Invitation',
            html: ` <b> Hi ${first_name} </b></br>
            <p>You have been invited to Join ${school_name} as an Administrator.</p>
            </br>
            <p>Please click or copy this link to complete your sign up.</p>
            </br>
            </br>
            <b><a href="${link}">${link}</a></b>
            </br>
            </br>
            <p>Please do not forward this email to others in order to prevent anybody else from accessing your account.</p>   
            </br>
            <p>Kind Regards! </p>`,

        });
        console.log("email sent sucessfully");

    } catch (error) {
        console.log(error, "email not sent");
    }
};

exports.school_course_invite = async (status, grade, enrollment_id, school_name, course_name, email, token) => {
    let query = `t=${token}&s=${enrollment_id}&email=${email}&status=${status}&grade=${grade}&schoolName=${school_name}&coursName=${course_name}`
    let link;
    // if (status === "new") {
    //     // This is a new user
    //     link = process.env.ENV === 'staging' ? `https://my-flow.netlify.app/register?${query}` : `http://localhost:3000/register?${query}`

    // } else {
    // This is for users that are already registered.
    // They just need to accept and confirm the invitation
    link = process.env.ENV === 'staging' ? `https://my-flow.netlify.app/invited-user?${query}` : `http://localhost:3000/invited-user?${query}`
    // }


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
            subject: 'FLOW For Schools Invitation',
            html: ` <b> Hello! </b></br>
              <p>You have been invited to enroll in the <b style="color: #2a9d8f;">${course_name}</b> course on FLOW by <b style="color: #264653;">${school_name}</b>.</p><br>
            </br>
            <p>Please click or copy this link to complete your sign up.</p>
            </br>
            </br>
            <b><a href="${link}">${link}</a></b>
            </br>
            </br>
            <p>Please do not forward this email to others in order to prevent anybody else from accessing your account.</p>   
            </br>
            <p>Kind Regards! </p>`,

        });
        console.log("email sent sucessfully");

    } catch (error) {
        console.log(error, "email not sent");
    }
};

