// const image = require('./legumes.jpg')
const nodemailer = require("nodemailer");
const { EMAIL, EMAIL_USER, EMAIL_PASS } = require("../config/keys");
const path = require("path");
// const smtpTransport = require('nodemailer-smtp-transport');

exports.Otp_VerifyAccount = async (email, name, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      service: EMAIL_USER,
      secure: true,
      auth: {
        pass: EMAIL_PASS,
        user: EMAIL,
      },
    });

    await transporter.sendMail({
      from: EMAIL,
      to: email,
      subject: "FLOW Email Verification",
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
  let link =
    process.env.ENV === "production" ? `https://flowonline.app/forgot-password?t=${token}&c=${otp}` :
      process.env.ENV === "staging"
        ? `https://my-flow-dev/forgot-password?t=${token}&c=${otp}`
        : `http://localhost:3000/forgot-password?t=${token}&c=${otp}`;

  try {
    const transporter = nodemailer.createTransport({
      service: EMAIL_USER,
      secure: true,
      auth: {
        pass: EMAIL_PASS,
        user: EMAIL,
      },
    });

    await transporter.sendMail({
      from: EMAIL,
      to: email,
      subject: " FLOW Reset Password",
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
  let link =
    process.env.ENV === "production" ? `https://flow-admin.flowonline.app/sign-up?t=${token}&email=${email}` :
      process.env.ENV === "staging"
        ? `https://admin-flow.netlify.app/sign-up?t=${token}&email=${email}`
        : ` http://localhost:5173/sign-up?t=${token}&email=${email}`;

  try {
    const transporter = nodemailer.createTransport({
      service: EMAIL_USER,
      secure: true,
      auth: {
        pass: EMAIL_PASS,
        user: EMAIL,
      },
    });

    await transporter.sendMail({
      from: EMAIL,
      to: email,
      subject: " FLOW Admin Invite",
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

exports.school_admin_invite = async (
  status,
  fullName,
  school_id,
  school_name,
  email,
  token
) => {
  let query = `t=${token}&s=${school_id}&email=${email}&fullName=${fullName}`;
  let link;
  // if (status === "new") {
  // This is a new user
  link =
    process.env.ENV === "production" ? `https://flowonline.app/invited-admin?${query}` :
      process.env.ENV === "staging"
        ? `https://my-flow-dev/invited-admin?${query}`
        : `http://localhost:3000/invited-admin?${query}`;

  // } else {
  //     // This is for users that are already registered.
  //     // They just need to accept and confirm the invitation
  //     link = process.env.ENV === 'staging' ? `https://my-flow-dev/invited-admin?${query}` : `http://localhost:3000/invited-admin?${query}`
  // }

  try {
    const transporter = nodemailer.createTransport({
      service: EMAIL_USER,
      secure: true,
      auth: {
        pass: EMAIL_PASS,
        user: EMAIL,
      },
    });

    await transporter.sendMail({
      from: EMAIL,
      to: email,
      subject: "FLOW For Schools Admin Invitation",
      html: ` <b> Hi ${fullName} </b></br>
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

exports.school_course_invite = async (
  parentName,
  childName,
  status,
  grade,
  enrollment_id,
  school_name,
  course_name,
  email,
  token
) => {
  let query = `t=${token}&s=${enrollment_id}&email=${email}&status=${status}&grade=${grade}&schoolName=${school_name}&coursName=${course_name}`;
  let link;
  // if (status === "new") {
  //     // This is a new user
  //     link = process.env.ENV === 'staging' ? `https://my-flow-dev/register?${query}` : `http://localhost:3000/register?${query}`

  // } else {
  // This is for users that are already registered.
  // They just need to accept and confirm the invitation
  link =
    process.env.ENV === "production" ? `https://flowonline.app/invited-user?${query}` :
      process.env.ENV === "staging"
        ? `https://my-flow-dev/invited-user?${query}`
        : `http://localhost:3000/invited-user?${query}`;
  // }
  const transporter = nodemailer.createTransport({
    service: EMAIL_USER,
    secure: true,
    auth: {
      pass: EMAIL_PASS,
      user: EMAIL,
    },
  });

  await transporter.sendMail({
    from: EMAIL,
    to: email,
    subject: "FLOW For Schools Course Invitation",
    html: ` <b> Hi!, </b></br>
              <p><b>${childName}</b> has been invited to enroll in the <b style="color: #2a9d8f;">${course_name}</b> course on FLOW by <b style="color: #264653;">${school_name}</b>.</p><br>
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

};

exports.school_course_invite_teacher = async (
  teacherName,
  status,
  grade,
  enrollment_id,
  school_name,
  course_name,
  email,
  token
) => {
  let query = `t=${token}&s=${enrollment_id}&email=${email}&status=${status}&grade=${grade}&schoolName=${school_name}&coursName=${course_name}`;
  let link;
  // if (status === "new") {
  //     // This is a new user
  //     link = process.env.ENV === 'staging' ? `https://my-flow-dev/register?${query}` : `http://localhost:3000/register?${query}`

  // } else {
  // This is for users that are already registered.
  // They just need to accept and confirm the invitation
  link =
    process.env.ENV === "production" ? `https://flowonline.app/invited-educator?${query}` :
      process.env.ENV === "staging"
        ? `https://my-flow-dev/invited-educator?${query}`
        : `http://localhost:3000/invited-educator?${query}`;
  // }

  try {
    const transporter = nodemailer.createTransport({
      service: EMAIL_USER,
      secure: true,
      auth: {
        pass: EMAIL_PASS,
        user: EMAIL,
      },
    });

    await transporter.sendMail({
      from: EMAIL,
      to: email,
      subject: "FLOW For Schools Course Invitation",
      html: ` <b> Hello ${teacherName}, </b></br>
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

exports.welcome_new_user = async (
  userName,
  student_id,
  email // Make sure to include email in the parameters
) => {
  let link;

  link =
    process.env.ENV === "production" ? `https://flowonline.app/invited-educator` :
      process.env.ENV === "staging"
        ? `https://my-flow-dev.netlify.app/invited-educator`
        : `http://localhost:3000/invited-educator`;

  try {
    const transporter = nodemailer.createTransport({
      service: EMAIL_USER,
      secure: true,
      auth: {
        pass: EMAIL_PASS,
        user: EMAIL,
      },
    });

    await transporter.sendMail({
      from: EMAIL,
      to: email,
      subject: "Welcome to FLOW! Your Journey Begins Here",
      html: `
        <b>Dear ${userName},</b></br>
        <p>Welcome to FLOW! We’re thrilled to have you as part of our growing community.</p>
        <p>You can access your page by visiting <a href="https://flowonline.app">flowonline.app</a>.</p>
        <p>To help you get started, here’s your unique User ID: <b>${student_id}</b>.</p>
        <p>Please keep this for your records as it will help you easily access your account and any support you may need in the future.</p>
        <p>We’ve designed FLOW to make learning fun, engaging, and easy for both students and educators. As you explore our platform, feel free to:</p>
        <ul>
          <li>Browse through our wide selection of courses</li>
          <li>Track your learning progress</li>
          <li>Reach out to our support team if you have any questions or need assistance</li>
          <li>If you're ever unsure about your next step, we're here to guide you every step of the way!</li>
        </ul>
        <p>Once again, welcome to FLOW, and we look forward to supporting your educational journey!</p>
        <p>Best regards,<br/>Flow Team</p>
      `,
    });
    console.log("Email sent successfully");
  } catch (error) {
    console.log(error, "Email not sent");
  }
};

