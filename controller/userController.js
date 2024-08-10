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
const Schools = require("../models/school");
const Counter = require("../models/counter");

exports.getLoggedUser = async (req, res) => {
  const user = await User.findById(req.user._id).select(
    "-password -isDeleted -resetPassword"
  );
  res.status(StatusCodes.OK).json({ user });
};

exports.getCourses = async (req, res) => {
  let { type } = req.query;

  let courses;

  if (type === "Enrolled") {
    // courses = await SchoolCourses.find({ school: req.params.id, status: "Active" })
    // .populate("course")
  } else {
    courses = await Courses.find({ status: "published" });
  }
  res.status(StatusCodes.OK).json({ courses });
};

exports.registerUser = async (req, res) => {
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
      .json({ message: "User type is required!" });
  let user = await User.findOne({ email: req.body.email });

  if (user && user.isVerified) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "User already registered." });
  }

  // Check if user has incomplete data. i.e a user was invited but didnt use link

  // if (user && !user.password) {
  //     user.fullName = fullName
  //     user.last_name = last_name
  //     user.phone = phone
  //     user.email = email
  //     user.gender = gender
  //     user.age = age
  //     user.country = country
  //     user.state = state
  //     user.userType = type
  //     user.grade = grade

  //     const salt = await bcrypt.genSalt(10);
  //     user.password = await bcrypt.hash(password, salt);
  //     await user.save();

  //     const code = otpGenerator.generate(6, {
  //         lowerCaseAlphabets: true,
  //         upperCaseAlphabets: false,
  //         specialChars: false,
  //     });

  //     const otp = new OTP({
  //         user: user._id,
  //         checkModel: "User",
  //         code,
  //         type: "RegisterUser",
  //         expiresIn: Date.now() + 3600000,
  //     });

  //     await otp.save();
  //     await Otp_VerifyAccount(user.email, user.fullName, code);

  //     const token = user.generateAuthToken();

  //     return res.status(StatusCodes.OK).json({ token });

  // }

  if (user && !user.isVerified) {
    const code = otpGenerator.generate(6, {
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false,
    });

    const otp = new OTP({
      user: user._id,
      checkModel: "User",
      code,
      type: "RegisterUser",
      expiresIn: Date.now() + 3600000,
    });

    const token = user.generateAuthToken();
    await otp.save();
    await Otp_VerifyAccount(user.email, user.fullName, code);

    return res.status(StatusCodes.OK).json({
      message: "Please enter the code sent to your email.",
      token,
    });
  }
const counter = await Counter.findOneAndUpdate(
  { name: "userId" },
  { $inc: { seq: 1 } },
  { new: true, upsert: true, strict: true } 
);


const userId = `FLS${counter.seq
  .toString()
  .padStart(Math.max(3, counter.seq.toString().length), "0")}`;

  // Handle user registration if not already registered
  const newUser = new User({
    fullName,
    phone,
    email,
    gender,
    DOB,
    country,
    state,
    lga,
    grade,
    userId,
  });
  const salt = await bcrypt.genSalt(10);
  newUser.password = await bcrypt.hash(password, salt);
  newUser.userType = type;
  await newUser.save();

  const code = otpGenerator.generate(6, {
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  });

  const otp = new OTP({
    user: newUser._id,
    checkModel: "User",
    code,
    type: "RegisterUser",
    expiresIn: Date.now() + 3600000,
  });

  await otp.save();
  await Otp_VerifyAccount(newUser.email, newUser.fullName, code);

  const token = newUser.generateAuthToken();

  res.status(StatusCodes.OK).json({ token });
};

exports.registerInvitedUser = async (req, res) => {
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

  let user = await User.findOne({ _id: req.user._id });

  if (!user)
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Un-Authorized Action!" });

  if (user && !user.newCourseInvite) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Expired or Invalid invite link!" });
  }

  if (!user.password && !password) {
    return res
      .status(StatusCodes.UNPROCESSABLE_ENTITY)
      .json({ message: "Password is required!" });
  }

  // Check for course enrollment
  const studentEnrollment = await StudentEnrollments.findOne({
    school: user?.newCourseInvite.school,
    user: user._id,
    status: "Pending",
  });

  if (!studentEnrollment) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Expired or Invalid invite link!" });
  }
  const counter = await Counter.findOneAndUpdate(
    { name: "userId" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, strict: true }
  );

  const userId = `FLS${counter.seq
    .toString()
    .padStart(Math.max(3, counter.seq.toString().length), "0")}`;

  user.fullName = fullName;
  user.phone = phone;
  user.email = email;
  user.gender = gender;
  user.DOB = DOB;
  user.country = country;
  user.state = state;
  user.lga = lga;
  user.userType = "School";
  user.grade = grade;
  user.school = user.newCourseInvite.school;
  user.newCourseInvite = null;
  user.userId = userId

  if (!user.isVerified) {
    user.isVerified = true;
  }

  if (password) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
  }
  studentEnrollment.status = "Confirmed";

  await Courses.findByIdAndUpdate(studentEnrollment.course, {
    $push: {
      courseEnrollment: studentEnrollment._id,
    },
  });

  await studentEnrollment.save();
  await user.save();

  const token = user.generateAuthToken();

  res
    .status(StatusCodes.OK)
    .json({ message: "Account created successfully!", token });
};

exports.registerSchoolInvitedAdmin = async (req, res) => {
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

  let user = await User.findOne({ _id: req.user._id });

  if (!user)
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Un-Authorized Action!" });

  if (user && !user.newInvite) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Expired or Invalid invite link!" });
  }

  if (!user.password && !password) {
    return res
      .status(StatusCodes.UNPROCESSABLE_ENTITY)
      .json({ message: "Password is required!" });
  }

  user.fullName = fullName;
  user.phone = phone;
  user.email = email;
  user.gender = gender;
  user.DOB = DOB;
  user.country = country;
  user.state = state;
  user.lga = lga;
  user.userType = "School";
  user.grade = grade;
  user.school = user.newInvite.school;
  user.isSchoolAdmin = true;
  user.schoolAdminStatus = "Confirmed";
  user.schoolAdminDate = user.newInvite.schoolAdminDate;
  user.schoolAdminPermission = user.newInvite.schoolAdminPermission;
  user.newInvite = null;

  if (!user.isVerified) {
    user.isVerified = true;
  }

  if (password) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
  }

  await user.save();

  const token = user.generateAuthToken();

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
    type: "RegisterUser",
  }).populate("user");

  if (!otp) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({
        message: "Wrong code or code expired. Please request for a new code.",
      });
  }

  await User.findByIdAndUpdate(_id, { isVerified: true });
  await OTP.deleteMany({ user: otp.user }).exec();

  res.status(StatusCodes.OK).json({ message: "Your account is now verified" });
};

// Login Route
exports.login = async (req, res) => {
  const { userId, password } = req.body;

  // Check if this is a school account
  let school = await Schools.findOne({ userId, isVerified: true }).select(
    "-isVerified -isDeleted -resetPassword"
  );

  if (school) {
    const validPassword = await bcrypt.compare(password, school.password);
    if (!validPassword)
      return res.status(400).send("Invalid ID or password.");

    const token = await school.generateAuthToken();

    // Remove password from the school object before sending the response
    const { password: _, ...schoolData } = school.toObject();

    return res
      .status(StatusCodes.OK)
      .json({
        accountType: "School",
        message: "School Login successful!",
        token,
        user: schoolData,
      });
  }

  const user = await User.findOne({ userId, isVerified: true });

  if (!user)
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Invalid credentials." });

  const validPassword = await bcrypt.compare(password, user.password);

  if (!validPassword)
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Invalid credentials." });

  const token = user.generateAuthToken();
  // Remove password from the school object before sending the response
  const { password: _, ...userData } = user.toObject();

  res
    .status(StatusCodes.OK)
    .json({
      accountType: "Individual",
      token,
      message: "Login Successful.",
      user: userData,
    });
};

// Forgot Password Route
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email, isVerified: true });

  if (!user)
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "User not found." });

  const code = otpGenerator.generate(6, {
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  });

  const otp = new OTP({
    user: user._id,
    checkModel: "User",
    code,
    type: "ForgotPassword",
    expiresIn: Date.now() + 3600000,
  });

  await otp.save();
  const token = user.generateAuthToken();
  await Otp_ForgotPassword(user.fullName, user.email, code, token);

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

  if (otp.user.toString() !== req.user._id) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: "failed",
      message: "Invalid User Credentials",
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

  await User.findByIdAndUpdate(
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
  let user = await User.findOne({
    email: req.user.email,
    resetPassword: true,
  }).exec();

  // This user is not on the app
  if (!user) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: "failed",
      error: "Invalid credentials",
    });
  }

  // hash the password
  const hashed_password = await bcrypt.hash(password, 10);

  user.password = hashed_password;
  user.resetPassword = false;

  await user.save();
  res.status(StatusCodes.OK).json({
    status: "success",
    message: "You have successfully reset your password",
  });
};

exports.updateProfile = async (req, res) => {
  // Find and update the user's profile
  const updateProfile = await User.findByIdAndUpdate(req.user._id, req.body, {
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

exports.courseEnrollment = async (req, res) => {
  const { fullName, email, phone } = req.body;
  let amount = 10000; //Will fix this later
  const enrollment = new CourseEnrollment({
    fullName,
    email,
    phone,
    amount,
    user: req.user._id,
  });
  const { data } = await initiatePaystackPayment(
    amount,
    email,
    `${fullName} ${last_name}`,
    "course._id"
  );

  // If Paystack doesn't initiate payment stop the payment
  if (!data)
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: "failed",
      message: "Operation Failed",
    });

  await enrollment.save();
  return res.status(StatusCodes.CREATED).json({
    status: "success",
    message: "Opening Payment Window please do not close the page!",
    data,
  });
};
