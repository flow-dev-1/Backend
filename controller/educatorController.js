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
const Payment = require("../models/payment");

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
  const { educators } = req.body;

  if (!educators || educators.length === 0) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "No educators provided in the request." });
  }

  const results = [];

  for (const educatorData of educators) {
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
    } = educatorData;

    // Find the educator in the database
    let foundEducator = await Educator.findOne({ email });

    if (!foundEducator) {
      // Create a new educator if not present
      foundEducator = new Educator({
        fullName,
        phone,
        email,
        gender,
        DOB,
        country,
        state,
        lga,
        grade,
        educatorType: "School",
        isVerified: false,
        newCourseInvite: null,
      });
    } else {
      if (!foundEducator.newCourseInvite) {
        results.push({ email, message: "Expired or invalid invite link!" });
        continue;
      }
   
      // Update the educator's details if they exist
      foundEducator.fullName = fullName;
      foundEducator.phone = phone;
      foundEducator.email = email;
      foundEducator.gender = gender;
      foundEducator.DOB = DOB;
      foundEducator.country = country;
      foundEducator.state = state;
      foundEducator.lga = lga;
      foundEducator.educatorType = "School";
      foundEducator.grade = grade;
      foundEducator.school = foundEducator.newCourseInvite.school;
      foundEducator.newCourseInvite = null;
    }

    if (!foundEducator.isVerified) {
      const code = otpGenerator.generate(6, {
        lowerCaseAlphabets: false,
        upperCaseAlphabets: false,
        specialChars: false,
      });

      const otp = new OTP({
        user: foundEducator._id,
        checkModel: "Educator",
        email,
        code,
        type: "RegisterEducator",
        expiresIn: Date.now() + 3600000, // 1 hour expiration
      });

      await otp.save();

      await Otp_VerifyAccount(email, fullName, code).catch((error) => {
        results.push({ email, message: "Failed to send OTP email.", error });
      });

      firstStudentToken = foundEducator.generateAuthToken();
    }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      foundEducator.password = await bcrypt.hash(password, salt);
    }

    // Update or create the student enrollment status
    let studentEnrollment = await StudentEnrollments.findOne({
      school: foundEducator.school,
      user: foundEducator._id,
      status: "Pending",
    });

    if (!studentEnrollment) {
      studentEnrollment = new StudentEnrollments({
        school: foundEducator.school,
        user: foundEducator._id,
        course: foundEducator.newCourseInvite.course,
        status: "Pending",
      });
    }

    studentEnrollment.status = "Confirmed";

    await studentEnrollment.save();

    await Courses.findByIdAndUpdate(studentEnrollment.course, {
      $push: {
        courseEnrollment: studentEnrollment._id,
      },
    });

    await foundEducator.save();

    const token = foundEducator.generateAuthToken();

    results.push({
      email,
      message: "Account created/updated successfully!",
      token,
    });
  }

  res.status(StatusCodes.OK).json({ results });
};


exports.updateProfile = async (req, res) => {
  // Find and update the user's profile
  const updateProfile = await Educator.findByIdAndUpdate(
    req.user._id,
    req.body,
    {
      new: true,
      select: "-password -isVerified -isDeleted -resetPassword",
    }
  );
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

exports.getCourses = async (req, res) => {
  let { type } = req.query;

  let courses;

  if (type === "Enrolled") {
    courses = await SchoolCourses.find({
      school: req.params.id,
      status: "Active",
    }).populate("course");
  } else {
    courses = await Courses.find({ status: "published" });
  }
  res.status(StatusCodes.OK).json({ courses });
};

exports.getPayments = async (req, res) => {
  const payments = await Payment.find({ user: req.user._id }).select(
    "-paymentDetails"
  );
  res.status(StatusCodes.OK).json({ payments });
};

exports.getInvitedEducator = async (req, res) => {
  const { email } = req.user;

  const educator = await Educator.findOne({ email });

  if (!educator) {
    return res.status(StatusCodes.NOT_FOUND).json({
      status: "failed",
      message: "Educator not found"
    });
  }

  const educatorInvited = await Educator.find({
    email: email,
    newInvite: { $exists: true, $ne: null },
    isVerified: false
  });

  if (!educatorInvited.length) {
    return res.status(StatusCodes.NOT_FOUND).json({
      status: "failed",
      message: "No students found with a new course invite for this parent"
    });
  }



  return res.status(StatusCodes.OK).json({
    status: "success",
    data: educatorInvited
  });
};

exports.registerInvitedEducatorAdmin = async (req, res) => {
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
    grade
  } = req.body;

  const salt = await bcrypt.genSalt(10);
  const hashed_password = await bcrypt.hash(password, salt)
  // Check if the educator already exists
  let foundEducator = await Educator.findOne({ email });

  if (!foundEducator) {
    foundEducator = new Educator({
      fullName,
      phone,
      email,
      gender,
      DOB,
      country,
      state,
      lga,
      grade,
      educatorType: "School",
      isVerified: false,
      newCourseInvite: null,
      password: hashed_password
    });
  } else {

    // Update the educator's details if they already exist
    foundEducator.fullName = fullName;
    foundEducator.phone = phone;
    foundEducator.email = email;
    foundEducator.gender = gender;
    foundEducator.DOB = DOB;
    foundEducator.country = country;
    foundEducator.state = state;
    foundEducator.lga = lga;
    foundEducator.grade = grade;
    foundEducator.educatorType = "School";d
  }

  // Hash and set password if provided
  if (password) {
    const salt = await bcrypt.genSalt(10);
    foundEducator.password = await bcrypt.hash(password, salt);
  }

  // If the educator is not verified, generate and send OTP
  if (!foundEducator.isVerified) {
    const code = otpGenerator.generate(6, {
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false,
    });

    const otp = new OTP({
      user: foundEducator._id,
      checkModel: "Educator",
      email,
      code,
      type: "RegisterEducator",
      expiresIn: Date.now() + 3600000, // OTP expires in 1 hour
    });

    await otp.save();

    // Send the OTP email
    await Otp_VerifyAccount(email, fullName, code);
  }



  // Save the educator's updated details
  await foundEducator.save();

  // Generate the token for the newly registered educator
  const token = foundEducator.generateAuthToken();

  // Return the results
  res.status(StatusCodes.OK).json({
    message: "Please enter the code sent to your email.",
    token, });
};