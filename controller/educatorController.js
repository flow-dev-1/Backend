const { User } = require("../models/user");
const OTP = require("../models/OTP");
const StatusCodes = require("../utils/status-codes");
const bcrypt = require("bcrypt");
const _ = require("lodash");
const { Otp_VerifyAccount, Otp_ForgotPassword } = require("../utils/sendmail");
const otpGenerator = require("otp-generator");
const { initiatePaystackPayment } = require("../utils/paystack");
const CourseEnrollment = require("../models/courseEnrollment");
const Courses = require("../models/course");
const StudentEnrollments = require("../models/courseEnrollment");
const { Educator } = require("../models/educators");

exports.getLoggedEducator = async (req, res) => {
  const educator = await Educator.findById(req.user._id).select(
    "-password -isDeleted -resetPassword"
  );
  res.status(StatusCodes.OK).json({ educator });
};


exports.registerEducator = async (req, res) => {
  const { type } = req.query;
  const {
    fullName,
    phone,
    email,
    gender,
    DOB,
    country,
    state,
    lga,
    password,
    grade,
  } = req.body;

  if (!type) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Educator type is required!" });
  }

  let educator = await Educator.findOne({ email: req.body.email });

  if (educator && educator.isVerified) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Educator already registered." });
  }

  if (educator && !educator.isVerified) {
    const code = otpGenerator.generate(6, {
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false,
    });

    const otp = new OTP({
      user: educator._id,
      checkModel: "Educator",
      code,
      type: "RegisterEducator",
      expiresIn: Date.now() + 3600000,
    });

    const token = await educator.generateAuthToken();
    await otp.save();
    await Otp_VerifyAccount(educator.email, educator.fullName, code);

    return res.status(StatusCodes.OK).json({
      message: "Please enter the code sent to your email.",
      token,
    });
  }

  // Handle educator registration if not already registered
  const newEducator = new Educator({
    fullName,
    phone,
    email,
    gender,
    DOB,
    country,
    state,
    lga,
    grade,
  });

  const salt = await bcrypt.genSalt(10);
  newEducator.password = await bcrypt.hash(password, salt);
  newEducator.userType = type;
  await newEducator.save();

  const code = otpGenerator.generate(6, {
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  });

  const otp = new OTP({
    user: newEducator._id,
    checkModel: "Educator",
    code,
    type: "RegisterEducator",
    expiresIn: Date.now() + 3600000,
  });

  await otp.save();
  await Otp_VerifyAccount(newEducator.email, newEducator.fullName, code);

  const token = await newEducator.generateAuthToken(); // Await the token generation

  res.status(StatusCodes.OK).json({
    message:
      "Registration successful. Please enter the code sent to your email.",
    token,
  });
};


exports.registerInvitedEducator = async (req, res) => {
  const {
    fullName,
    phone,
    email,
    gender,
    DOB,
    country,
    state,
    lga,
    password,
    grade,
  } = req.body;

  let educator = await Educator.findOne({ _id: req.user._id });

  if (!educator)
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Un-Authorized Action!" });

  if (educator && !educator.newCourseInvite) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Expired or Invalid invite link!" });
  }

  if (!educator.password && !password) {
    return res
      .status(StatusCodes.UNPROCESSABLE_ENTITY)
      .json({ message: "Password is required!" });
  }

  // Check for course enrollment
  const studentEnrollment = await StudentEnrollments.findOne({
    school: educator?.newCourseInvite.school,
    user: educator._id,
    status: "Pending",
  });

  if (!studentEnrollment) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Expired or Invalid invite link!" });
  }

  educator.fullName = fullName;
  educator.phone = phone;
  educator.email = email;
  educator.gender = gender;
  educator.DOB = DOB;
  educator.country = country;
  educator.state = state;
  educator.lga = lga;
  educator.educatorType = "School";
  educator.grade = grade;
  educator.school = educator.newCourseInvite.school;
  educator.newCourseInvite = null;

  if (!educator.isVerified) {
    educator.isVerified = true;
  }

  if (password) {
    const salt = await bcrypt.genSalt(10);
    educator.password = await bcrypt.hash(password, salt);
  }
  studentEnrollment.status = "Confirmed";

  await Courses.findByIdAndUpdate(studentEnrollment.course, {
    $push: {
      courseEnrollment: studentEnrollment._id,
    },
  });

  await studentEnrollment.save();
  await educator.save();

  const token = educator.generateAuthToken();

  res
    .status(StatusCodes.OK)
    .json({ message: "Account created successfully!", token });
};



exports.updateProfile = async (req, res) => {
  // Find and update the user's profile
  const updateProfile = await Educator.findByIdAndUpdate(req.user._id, req.body, {
    new: true,
    select: "-password -isVerified -isDeleted -resetPassword",
  });
  // This user is not on the app
  if (!updateProfile) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: "failed",
      error: "Invalid credentials",
    });
  }

  res.status(StatusCodes.OK).json({
    status: "success",
    message: "You have successfully updated your profile",
    data: updateProfile,
  });
};

