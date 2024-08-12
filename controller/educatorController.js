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
  const user = await User.findById(req.user._id).select(
    "-password -isDeleted -resetPassword"
  );
  res.status(StatusCodes.OK).json({ user });
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
  if (!type)
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Educator type is required!" });
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

    const token = educator.generateAuthToken();
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

  const token = newEducator.generateAuthToken();

  res.status(StatusCodes.OK).json({ token });
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

// Verify Account route
exports.verifyAccount = async (req, res) => {
  const { code } = req.body;
  const { _id } = req.user;

  if (!code)
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Code is required." });

  const otp = await OTP.findOne({
    user: _id,
    code,
    type: "RegisterEducator",
  }).populate("user");

  if (!otp) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({
        message: "Wrong code or code expired. Please request for a new code.",
      });
  }

  await Educator.findByIdAndUpdate(_id, { isVerified: true });
  await OTP.deleteMany({ user: otp.user }).exec();

  res.status(StatusCodes.OK).json({ message: "Your account is now verified" });
};

// Login Route
exports.login = async (req, res) => {
  const { email, password } = req.body;

  // Check if this is a school account
  let school = await Educator.findOne({ email, isVerified: true }).select(
    "-isVerified -isDeleted -resetPassword"
  );

  if (school) {
    const validPassword = await bcrypt.compare(password, school.password);
    if (!validPassword)
      return res.status(400).send("Invalid email or password.");

    const token = await school.generateAuthToken();

    // Remove password from the school object before sending the response
    const { password: _, ...schoolData } = school.toObject();

    return res.status(StatusCodes.OK).json({
      accountType: "Educator",
      message: "Educator Login successful!",
      token,
      user: schoolData,
    });
  }

  const educator = await Educator.findOne({ email, isVerified: true });

  if (!educator)
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Invalid credentials." });

  const validPassword = await bcrypt.compare(password, educator.password);

  if (!validPassword)
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Invalid credentials." });

  const token = educator.generateAuthToken();
  // Remove password from the school object before sending the response
  const { password: _, ...educatorData } = educator.toObject();

  res
    .status(StatusCodes.OK)
    .json({
      accountType: "Individual",
      token,
      message: "Login Successful.",
      user: educatorData,
    });
};

// Forgot Password Route
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  const educator = await Educator.findOne({ email, isVerified: true });

  if (!educator)
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Educator not found." });

  const code = otpGenerator.generate(6, {
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  });

  const otp = new OTP({
    user: educator._id,
    checkModel: "Educator",
    code,
    type: "ForgotPassword",
    expiresIn: Date.now() + 3600000,
  });

  await otp.save();
  const token = educator.generateAuthToken();
  await Otp_ForgotPassword(educator.fullName, educator.email, code, token);

  res
    .status(StatusCodes.OK)
    .json({ message: "Please enter the code sent to your email." });
};

exports.verify_otp_forgotPassword = async (req, res) => {
  const { code } = req.body;

  if (!code)
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Code is required." });

  //check otp code
  const otp = await OTP.findOne({ code }).exec();

  if (otp === null) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: "failed",
      error: "Invalid OTP Token",
    });
  }

  if (otp.educator.toString() !== req.user._id) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: "failed",
      message: "Invalid educator Credentials",
    });
  }

  // Check if the otp has expired
  const otp_valid = otp.expiresIn > Date.now();
  //  < Date.now();
  if (!otp_valid) {
    // delete otp code
    await OTP.findOneAndDelete({ code }).exec();
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: "failed",
      message: "Invalid or Expired Token.",
    });
  }

  // delete otp code
  await OTP.deleteMany({ user: otp.user }).exec();

  await Educator.findByIdAndUpdate(
    otp.user._id,
    {
      resetPassword: true,
    },
    {
      new: true,
    }
  );

  return res.status(StatusCodes.OK).json({
    status: "success",
    message: "OTP verified, You can now reset Password",
  });
};

exports.resetPassword = async (req, res) => {
  const { password } = req.body;

  // Only users with valid OTP can reset password. hence resetPassword=true
  let educator = await Educator.findOne({
    email: req.user.email,
    resetPassword: true,
  }).exec();

  // This educator is not on the app
  if (!educator) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: "failed",
      error: "Invalid credentials",
    });
  }

  // hash the password
  const hashed_password = await bcrypt.hash(password, 10);

  educator.password = hashed_password;
  educator.resetPassword = false;

  await educator.save();
  res.status(StatusCodes.OK).json({
    status: "success",
    message: "You have successfully reset your password",
  });
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

