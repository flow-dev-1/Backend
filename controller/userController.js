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
const { Educator } = require("../models/educators");
const { Admin } = require("../models/admin");
const { Parents } = require("../models/parentGuardian");

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
  const { guardianFullName, phone, email, country, state, lga, student } =
    req.body;

  if (!type) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "User type is required!" });
  }

  for (const studentItem of student) {
    if (!studentItem.fullName || !studentItem.userId) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Each student must have a full name and userId!" });
    }

    const nameParts = studentItem.fullName.toLowerCase().split(" ");

    let query = {
      email: email,
      // "student.userId": studentItem.userId,
      $and: nameParts.map((name) => ({
        "student.fullName": new RegExp(`\\b${name}\\b`, "i"),
      })),
    };

    let user = await User.findOne(query);

    if (user && user.isVerified) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "User already registered." });
    }

    // Handle the case where the user exists but is not verified
    if (user && !user.isVerified) {
      const code = otpGenerator.generate(6, {
        lowerCaseAlphabets: false,
        upperCaseAlphabets: false,
        specialChars: false,
      });

      const otp = new OTP({
        user: user._id,
        checkModel: "User",
        email,
        code,
        type: "RegisterUser",
        expiresIn: Date.now() + 3600000, // 1 hour expiration
      });

      const token = user.generateAuthToken();
      await otp.save();
      await Otp_VerifyAccount(user.email, user.fullName, code);

      return res.status(StatusCodes.OK).json({
        message: "Please enter the code sent to your email.",
        token,
      });
    }

    if (student && student.length > 0) {
      const code = otpGenerator.generate(6, {
        lowerCaseAlphabets: false,
        upperCaseAlphabets: false,
        specialChars: false,
      });

      // Variable to hold the first student's ID
      let firstStudentId;

      await Promise.all(
        student.map(
          async ({ userId, fullName, grade, gender, DOB, password }, index) => {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Create the new student account
            const newStudent = new User({
              userId,
              fullName,
              grade,
              gender,
              DOB,
              password: hashedPassword,
              guardianFullName,
              phone,
              email,
              country,
              state,
              lga,
              userType: "Individual",
            });

            await newStudent.save();

            // Store the first student's ID for OTP
            if (index === 0) {
              firstStudentId = newStudent._id;
            }
          }
        )
      );

      // Create OTP using the first student's ID
      const otp = new OTP({
        user: firstStudentId,
        checkModel: "User",
        code,
        type: "RegisterUser",
        expiresIn: Date.now() + 3600000, // 1 hour expiration
      });

      await otp.save();

      // Send OTP email once for the guardian email
      await Otp_VerifyAccount(email, guardianFullName, code);

      // Generate token using the first student's ID
      const firstStudent = await User.findById(firstStudentId);
      const token = firstStudent.generateAuthToken();

      return res.status(StatusCodes.OK).json({
        message: "Students registered successfully",
        token,
      });
    }

    // In case no students are passed in the request body
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "No students provided in the request." });
  }
};

exports.registerInvitedUser = async (req, res) => {
  const { guardianFullName, phone, email, country, state, lga, students } =
    req.body;

  // Check if this parent exist
  const checkParent = await Parents.findOneAndUpdate({ email: item.email }, {
    $set: {
      fullName: guardianFullName,
      phone,
      country,
      state,
      lga
    }
  })

  // Only parent with Valid invite can use dis
  if (!checkParent) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Un-Authorized Action!" });
  }

  let stdToken; // Initialize a variable to store the token
  let isFirstStudent = true;

  for (const student of students) {

    const stdData = await User.findById(student._id)

    stdData.fullName = student?.fullName
    stdData.guardianFullName = guardianFullName
    stdData.email = email
    stdData.gender = student.gender
    stdData.DOB = student.DOB


    // Only add the password field if it's present
    if (student.password) {
      const salt = await bcrypt.genSalt(10);
      stdData.password = await bcrypt.hash(student.password, salt);
    }

    // Check for course enrollment
    const studentEnrollment = await StudentEnrollments.findOne({
      school: stdData?.newCourseInvite.school,
      user: stdData._id,
      status: "Pending",
    });

    if (studentEnrollment) {
      studentEnrollment.status = "Confirmed";

      await Courses.findByIdAndUpdate(studentEnrollment.course, {
        $push: {
          courseEnrollment: studentEnrollment._id,
        },
      });

      stdData.newCourseInvite = null


      await studentEnrollment.save();
    }

    // Generate token only for the first student
    if (isFirstStudent) {
      stdToken = stdData.generateAuthToken();
      isFirstStudent = false; // Set the flag to false after generating the token
    }
    await stdData.save()
  }
  res
    .status(StatusCodes.OK)
    .json({ message: "Accounts created successfully!", stdToken });
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

exports.getParentWithNewCourseInvite = async (req, res) => {
  const { email } = req.body;

  const parent = await Parents.findOne({ email });

  if (!parent) {
    return res.status(StatusCodes.NOT_FOUND).json({
      status: "failed",
      message: "Parent not found",
    });
  }
  const usersWithInvite = await User.find({
    email: parent.email,
    newCourseInvite: { $exists: true },
  }).select("-password");
  if (!usersWithInvite.length) {
    return res.status(StatusCodes.NOT_FOUND).json({
      status: "failed",
      message: "No students found with a new course invite for this parent",
    });
  }

  parent.students = usersWithInvite;

  res.status(StatusCodes.OK).json({
    status: "success",
    data: parent,
  });
};



