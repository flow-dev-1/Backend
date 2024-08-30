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
const doesFullNameMatch = require("../utils/fullNameCheck");
const findStudentByEmailAndFullName = require("../utils/findStudentBymail");
const Course = require("../models/course");
const { default: mongoose } = require("mongoose");
const Payment = require("../models/payment");
const Activity = require("../models/activity");
const Assesment = require("../models/assessment.model");

exports.getLoggedUser = async (req, res) => {
  const user = await User.findById(req.user._id).select(
    "-password -isDeleted -resetPassword"
  );
  res.status(StatusCodes.OK).json({ user });
};

exports.getPayments = async (req, res) => {
  const payments = await Payment.find({ user: req.user._id }).select(
    "-paymentDetails"
  );
  res.status(StatusCodes.OK).json({ payments });
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

  if (!student || student.length === 0) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "No students provided in the request." });
  }

  let newParent = await Parents.findOne({ email }).populate(
    "students",
    "-password"
  );

  if (!newParent) {
    // Create new parent if not found
    newParent = new Parents({
      fullName: guardianFullName,
      email,
      phone,
      country,
      state,
      students: []
    });
  }

  let firstStudentToken = null;

  for (const studentItem of student) {
    const { userId, fullName, grade, gender, DOB, password } = studentItem;

    // Check if the student is already registered under this parent
    const existingStudent = newParent.students.find(
      (s) => s.fullName === fullName && s.DOB === DOB
    );

    if (existingStudent) {
      if (existingStudent.isVerified) {
        continue; // Skip the student if already registered and verified
      } else {
        // Handle case where student exists but is not verified
        const code = otpGenerator.generate(6, {
          lowerCaseAlphabets: false,
          upperCaseAlphabets: false,
          specialChars: false
        });

        const otp = new OTP({
          user: existingStudent._id,
          checkModel: "User",
          email,
          code,
          type: "RegisterUser",
          expiresIn: Date.now() + 3600000 // 1 hour expiration
        });

        await otp.save();
        await Otp_VerifyAccount(email, guardianFullName, code);

        firstStudentToken = existingStudent.generateAuthToken();
      }
    } else {
      // Register new student
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      const foundStudent = await findStudentByEmailAndFullName(
        email,
        studentItem.fullName,
        newParent.students
      );

      if (foundStudent) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          sucess: "failed",
          message: "Student already exists"
        });
      }
      const newStudent = new User({
        _id: new mongoose.Types.ObjectId(),
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
        userType: "Individual"
      });

      await newStudent.save();
      newParent.students.push(newStudent._id);

      if (!firstStudentToken) {
        firstStudentToken = newStudent.generateAuthToken();
      }

      const code = otpGenerator.generate(6, {
        lowerCaseAlphabets: false,
        upperCaseAlphabets: false,
        specialChars: false
      });

      const otp = new OTP({
        user: newStudent._id,
        checkModel: "User",
        email,
        code,
        type: "RegisterUser",
        expiresIn: Date.now() + 3600000 // 1 hour expiration
      });

      await otp.save();
      await Otp_VerifyAccount(email, guardianFullName, code);
    }
  }

  await newParent.save();

  return res.status(StatusCodes.OK).json({
    message: "Students registered successfully",
    token: firstStudentToken
  });
};

exports.registerInvitedUser = async (req, res) => {
  const {
    guardianFullName,
    phone,
    email,
    country,
    state,
    lga,
    students,
    userId
  } = req.body;

  if (!students || students.length === 0) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "No students provided in the request." });
  }

  let newParent = await Parents.findOne({ email }).populate(
    "students",
    "-password"
  );

  if (!newParent) {
    // Create new parent if not found
    newParent = new Parents({
      fullName: guardianFullName,
      email,
      phone,
      country,
      state,
      students: []
    });
  }

  // Update parent details
  newParent.fullName = guardianFullName;
  newParent.email = email;
  newParent.phone = phone;
  newParent.country = country;
  newParent.state = state;

  let firstStudentToken = null;
  let emailError = null;

  for (const studentItem of students) {
    const { userId, fullName, grade, gender, DOB, password } = studentItem;

    // Check if the student is already registered under this parent
    const existingStudent = newParent.students.find(
      (s) => s.fullName === fullName && s.DOB === DOB
    );

    if (existingStudent) {
      if (existingStudent.isVerified) {
        continue; // Skip if the student is already registered and verified
      } else {
        // Handle unverified existing student
        const code = otpGenerator.generate(6, {
          lowerCaseAlphabets: false,
          upperCaseAlphabets: false,
          specialChars: false
        });

        const otp = new OTP({
          user: existingStudent._id,
          checkModel: "User",
          email,
          code,
          type: "RegisterUser",
          expiresIn: Date.now() + 3600000 // 1 hour expiration
        });

        await otp.save();

        const emailResult = await Otp_VerifyAccount(
          email,
          guardianFullName,
          code
        ).catch((error) => {
          emailError = error;
        });

        firstStudentToken = existingStudent.generateAuthToken();
      }
    } else {
      // Attempt to find the student by userId
      const foundStudent = await User.findOne({ userId });

      if (foundStudent) {
        // Update student details
        for (const key in studentItem) {
          if (studentItem.hasOwnProperty(key)) {
            foundStudent[key] = studentItem[key];
          }
        }

        if (password) {
          const salt = await bcrypt.genSalt(10);
          foundStudent.password = await bcrypt.hash(password, salt);
        }
        await foundStudent.save();

        const code = otpGenerator.generate(6, {
          lowerCaseAlphabets: false,
          upperCaseAlphabets: false,
          specialChars: false
        });

        const otp = new OTP({
          user: foundStudent._id,
          checkModel: "User",
          email,
          code,
          type: "RegisterUser",
          expiresIn: Date.now() + 3600000 // 1 hour expiration
        });

        await otp.save();

        await Otp_VerifyAccount(email, guardianFullName, code).catch(
          (error) => {
            emailError = error;
          }
        );

        if (!newParent.students.includes(foundStudent._id)) {
          newParent.students.push(foundStudent._id);
        }

        firstStudentToken = foundStudent.generateAuthToken();
      } else {
        // Skip creating a new student
        continue;
      }
    }
  }

  await newParent.save();

  if (emailError) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: "Account update successful, but email sending failed.",
      error: emailError.message || emailError
    });
  }

  return res.status(StatusCodes.OK).json({
    message: "Accounts updated successfully!",
    token: firstStudentToken
  });
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
    grade
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
    select: "-password -isVerified -isDeleted -resetPassword"
  });
  // This user is not on the app
  if (!updateProfile) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: "failed",
      error: "Invalid credentials"
    });
  }

  res.status(StatusCodes.OK).json({
    status: "success",
    message: "You have successfully updated your profile",
    data: updateProfile
  });
};

exports.courseEnrollment = async (req, res) => {
  const { fullName, email, phone } = req.body;
  const { id } = req.params;

  // Check if student is already enrolled in this course
  const isEnrolled = await CourseEnrollment.findOne({
    course: id,
    user: req.user._id,
    status: "Confirmed"
  });

  if (isEnrolled) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: "failed",
      message: "You are already enrolled in this course!"
    });
  }
  const course = await Course.findById(id);

  console.log(course);
  const enrollment = new CourseEnrollment({
    _id: new mongoose.Types.ObjectId(),
    course: id,
    user: req.user._id,
    checkModel: course.grade === "Educator" ? "Educator" : "User"
  });

  const { data } = await initiatePaystackPayment(
    course.cost,
    email,
    `${fullName}`,
    enrollment._id
  );

  // If Paystack doesn't initiate payment stop the payment
  if (!data)
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: "failed",
      message: "Operation Failed"
    });

  const amount = Number(course.cost);

  // Generate payment Ticket
  const payment = new Payment({
    user: req.user._id,
    checkModel: "User",
    courseEnrollment: enrollment._id,
    fullName,
    amount,
    phone,
    email,
    reference: data?.reference
  });

  await Promise.all([payment.save(), enrollment.save()]);

  return res.status(StatusCodes.CREATED).json({
    status: "success",
    message: "Opening Payment Window please do not close the page!",
    data
  });
};

exports.getParentWithNewCourseInvite = async (req, res) => {
  const { email } = req.user;

  const parent = await Parents.findOne({ email });

  if (!parent) {
    return res.status(StatusCodes.NOT_FOUND).json({
      status: "failed",
      message: "Parent not found"
    });
  }

  const studentsWithInvite = await User.find({
    email: email,
    newCourseInvite: { $exists: true, $ne: null },
    isVerified: false
  });

  if (!studentsWithInvite.length) {
    return res.status(StatusCodes.NOT_FOUND).json({
      status: "failed",
      message: "No students found with a new course invite for this parent"
    });
  }

  parent.students = studentsWithInvite;

  return res.status(StatusCodes.OK).json({
    status: "success",
    data: parent
  });
};

exports.getCourses = async (req, res) => {
  let { type } = req.query;

  let courses;
  if (type === "Enrolled") {
    courses = await CourseEnrollment.find({
      user: req.user._id,
      status: "Confirmed"
    }).populate("course");
    console.log(req.user._id);
  } else {
    courses = await Courses.find({ status: "published" });
  }
  res.status(StatusCodes.OK).json({ courses });
};

exports.activityData = async (req, res) => {
  const { id } = req.params;
  const user = req.user._id;
  const email = req.user.email;
  // const course = await Sc
  const checkModel = "User";

  req.body.user = user;
  req.body.email = email;
  req.body.checkModel = checkModel;
  req.body.courseEnrollment = id;
  const courseEnrollmentForActivity = await Course.findById(id);

  console.log(courseEnrollmentForActivity);
  // Update Activity for this course
  // If no activity has been created create it.
  const activity = await Activity.findOneAndUpdate(
    { courseEnrollment: id },
    req.body,
    { new: true, upsert: true }
  );
  res.status(StatusCodes.OK).json({ activity });
};

exports.getactivityData = async (req, res) => {
  const { id, week } = req.params;
  const user = req.user._id;
  const activity = await Activity.findOne({ courseEnrollment: id, user, week:week });
  console.log({courseEnrollment: id, user, week:week})
  if (!activity) {
    return res.status(StatusCodes.NOT_FOUND).json({
      status: "failed",
      message: "No activity for this student"
    });
  }

  res.status(StatusCodes.OK).json({ activity });
};

exports.assessmentData = async (req, res) => {
  const { id } = req.params;
  const user = req.user._id;
  const email = req.user.email;
  const checkModel = "User";

  const assessmentData = {
    user: user,
    email: email,
    checkModel: checkModel,
    courseEnrollment: id,
    ...req.body
  };

  // Check if an assessment already exists for the user
  const existingAssessment = await Assesment.findOne({
    user,
    email,
    week: req.body.week,
    courseEnrollment: id
  });

  if (existingAssessment) {
    return res.status(StatusCodes.CONFLICT).json({
      success: "failed",
      message: "You have already taken the assessment"
    });
  }

  // Create a new assessment if none exists
  const assessment = await Assesment.create(assessmentData);

  res.status(StatusCodes.OK).json({ assessment });
};

exports.getAssessmentData = async (req, res) => {
  const { id, week } = req.params;
  const user = req.user._id;
  const email = req.user.email;

  // Find the assessment for the user
  const existingAssessment = await Assesment.findOne({
    user,
    email,
    week,
  });

  if (existingAssessment) {
    return res.status(StatusCodes.OK).json({ existingAssessment });
  }

  // Return a 404 if no assessment is found
  res.status(StatusCodes.NOT_FOUND).json({
    success: "failed",
    message: "No assessment found for the given criteria"
  });
};

