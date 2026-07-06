const { User } = require("../models/user");

const OTP = require("../models/OTP");
const StatusCodes = require("../utils/status-codes");
const bcrypt = require("bcrypt");
const _ = require("lodash");
const { Otp_VerifyAccount, Otp_ForgotPassword, welcome_new_user } = require("../utils/sendmail");
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
const { courseEnrollment } = require("./schoolsController");
const course = require("../models/course");

const TEASER_COURSE_IDS = [
  "6a4b61506661e58365e9ceb4",
  "6a4b616d6661e58365e9ceb5",
];
const TEASER_ALLOWED_SCHOOL_ID = "673210c0f28242d1d71ba39f";

const normalizeId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value._id && value._id !== value) return normalizeId(value._id);
  return value.toString();
};

const isTeaserCourse = (courseData) => {
  const courseId = normalizeId(courseData?._id || courseData?.course?._id);
  return TEASER_COURSE_IDS.includes(courseId);
};

const getViewerSchoolId = async (viewer) => {
  if (viewer?.school) return normalizeId(viewer.school);

  const foundUser = await User.findById(viewer?._id).select("school");
  if (foundUser?.school) return normalizeId(foundUser.school);

  const foundEducator = await Educator.findById(viewer?._id).select("school");
  return normalizeId(foundEducator?.school);
};

const filterTeaserCoursesForViewer = (courses, schoolId) => {
  if (schoolId === TEASER_ALLOWED_SCHOOL_ID) return courses;
  return courses.filter((courseData) => !isTeaserCourse(courseData));
};


exports.getLoggedUser = async (req, res) => {
  let userId = req.params.id ? req.params.id : req.user._id
  const user = await User.findById(userId)
    .select("-password -isDeleted -resetPassword")
    .populate({
      path: 'school',
      model: 'School',
      select: "school_name"
    });

  if (!user.phone || !user.lga) {
    const parentData = await Parents.findOne({ email: user.email });
    user.country = parentData.country
    user.lga = parentData.lga
    user.phone = parentData.phone
    user.state = parentData.state
  }

  res.status(StatusCodes.OK).json({ user });
};

exports.getPayments = async (req, res) => {
  const payments = await Payment.find({ user: req.user._id }).select(
    "-paymentDetails"
  );
  res.status(StatusCodes.OK).json({ payments });
};

exports.registerUser = async (req, res) => {

  try {

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
        lga,
        students: []
      });
    }


    const studentItem = student[0];
    const { userId, stdEmail, fullName, grade, gender, DOB, password } = studentItem;

    const existingStudent = await User.findOne({ email: stdEmail })

    if (existingStudent && existingStudent?.isVerified) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        sucess: "failed",
        message: "A user with this credentials already exists!"
      });
    }

    if (existingStudent && !existingStudent?.isVerified) {
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

      await Promise.all([
        otp.save(),
        Otp_VerifyAccount(stdEmail, fullName, code)
      ]);

      const token = existingStudent.generateAuthToken();
      return res.status(StatusCodes.OK).json({
        message: `please enter token sent to ${stdEmail}`,
        token,
      });
    }
    // Register new student
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

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
      email: stdEmail,
      country,
      state,
      lga,
      userType: "Individual"
    });

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

    await Promise.all([
      await newStudent.save(),
      otp.save(),
      Otp_VerifyAccount(stdEmail, fullName, code)
    ]);
    newParent.students.push(newStudent._id);

    await newParent.save();
    const token = newStudent.generateAuthToken();

    return res.status(StatusCodes.OK).json({
      message: "Students registered successfully",
      token
    });
  } catch (error) {
    console.error("Error in registerUser:", error);
    return res.status(StatusCodes.SERVER_ERROR).json({
      message: "An error occurred while processing your request.",
      error: error.message
    });

  }

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
    enrollmentId
  } = req.body;


  // Find and update parent data
  const updatedParentData = await Parents.findOneAndUpdate({ email }, {
    fullName: guardianFullName,
    email,
    phone,
    country,
    lga,
    state,
  }, {
    new: true
  })

  if (!updatedParentData) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: "No data found with the provided email!",
    });
  }

  const [studentData, enrollmentUpdate] = await Promise.all([
    User.findOne({ userId: students.userId }).select("-password"),
    StudentEnrollments.findByIdAndUpdate(
      enrollmentId,
      {
        status: "Accepted", // Update the enrollment status
      },
      {
        new: true, // Return the updated document
      }
    )
  ]);

  // Check if student data is not found
  if (!studentData) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: `No student found with userId: ${students.userId}`,
    });
  }

  // Check if the enrollment update failed
  if (!enrollmentUpdate) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: `Failed to update enrollment with id: ${enrollmentId}`,
    });
  }


  if (students.password) {
    const salt = await bcrypt.genSalt(10);
    studentData.password = await bcrypt.hash(students.password, salt);
    studentData.phone = phone
    studentData.lga = lga
    studentData.state = state
    studentData.DOB = students.DOB
    studentData.gender = students.gender
    studentData.grade = students.grade
  }

  studentData.newCourseInvite = null

  if (studentData.isVerified) {
    // This is a case where the student is already verified
    // and the parent is trying to accept the course invite
    // Update the enrollment status to "Confirmed"
    enrollmentUpdate.status = "Confirmed";

    await Promise.all([
      studentData.save(),
      Course.findOneAndUpdate({ _id: enrollmentUpdate.course }, { $addToSet: { courseEnrollment: enrollmentUpdate._id } }),
      enrollmentUpdate.save(),
      welcome_new_user(
        studentData.fullName, studentData.userId, email,
      )
    ]);

    return res.status(StatusCodes.OK).json({
      status: "redirect",
      message: `Course enrollment successful. Please proceed to sign in.`,
    });
  }

  const code = otpGenerator.generate(6, {
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false
  });

  const otp = new OTP({
    user: studentData._id,
    checkModel: "User",
    email,
    code,
    type: "RegisterUser",
    expiresIn: Date.now() + 3600000 // 1 hour expiration
  });

  await Promise.all([
    studentData.save(),
    otp.save(),
    Otp_VerifyAccount(email, guardianFullName, code)
  ]);

  return res.status(StatusCodes.OK).json({
    message: `Course enrollment successful. Please enter OTP sent to ${email}`,
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

  // Check if the student is already enrolled in this course
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

  // Fetch the course details
  const course = await Course.findById(id);
  if (!course) {
    return res.status(StatusCodes.NOT_FOUND).json({
      status: "failed",
      message: "Course not found!"
    });
  }

  // Create a new course enrollment record
  const enrollment = new CourseEnrollment({
    _id: new mongoose.Types.ObjectId(),
    course: id,
    user: req.user._id,
    checkModel: req.user.isSchool
      ? "School"
      : req.user.isEducator
        ? "Educator"
        : "User"
  });

  // Initiate payment through Paystack
  const { data } = await initiatePaystackPayment(
    course.cost,
    email,
    fullName,
    enrollment._id
  );

  // If Paystack payment initiation fails, return an error
  if (!data) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: "failed",
      message: "Operation Failed"
    });
  }

  // Prepare payment information
  const amount = Number(course.cost);
  const payment = new Payment({
    user: req.user._id,
    checkModel: "User",
    courseEnrollment: enrollment._id,
    fullName,
    amount,
    phone,
    email,
    reference: data.reference
  });

  // Save the enrollment and payment records concurrently
  await Promise.all([payment.save(), enrollment.save()]);

  return res.status(StatusCodes.CREATED).json({
    status: "success",
    message: "Opening Payment Window please do not close the page!",
    data
  });
};

exports.getParentWithNewCourseInvite = async (req, res) => {
  const { email } = req.user;
  const { enrollmentId } = req.query

  if (!enrollmentId) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: "failed",
      message: "No student found in the request!"
    });
  }

  const parent = await Parents.findOne({ email }).populate("students", "-password");

  if (!parent) {
    return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
      status: "failed",
      message: "No parent found with this email!"
    });
  }

  const enrolledStudent = await CourseEnrollment.findById(enrollmentId);

  if (!enrolledStudent) {
    return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
      status: "failed",
      message: "This student has no course invite for this course!"
    });
  }

  if (enrolledStudent.status !== "Pending" && enrolledStudent.status !== "Accepted") {
    return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
      status: "failed",
      message: "Student is already enrolled in this course!"
    });
  }

  const foundStudent = parent.students.find(item => item._id.toString() === enrolledStudent.user.toString());

  if (!foundStudent) {
    return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
      status: "failed",
      message: "No student with a pending invite was found for this email."
    });
  }

  parent.students = [foundStudent]

  return res.status(StatusCodes.OK).json({
    status: "success",
    data: parent
  });
};

exports.getCourses = async (req, res) => {
  let { type } = req.query;
  let courses;
  const viewerSchoolId = await getViewerSchoolId(req.user);

  if (type === "Enrolled") {
    courses = await CourseEnrollment.find({
      user: req.user._id,
      status: "Confirmed",
    })
      .populate("course")
      .populate("schoolCourseEnrollment");

    // // Filter out courses where `schoolCourseEnrollment` exists but is not active
    // Filter the courses to include only those where the schoolCourseEnrollment is either non-existent or has an "Active" status
    courses = courses.filter(
      (courseEnrollment) => !courseEnrollment.schoolCourseEnrollment || courseEnrollment.schoolCourseEnrollment.status === "Active"
    );

    courses = filterTeaserCoursesForViewer(courses, viewerSchoolId);

    // for (let courseEnrollment of courses) {
    //   let courseId = courseEnrollment.course._id;
    //   let courseProgress = await Activity.find({
    //     user: req.user._id,
    //     courseEnrollment: courseId,
    //   });

    //   let progressPercentage = (courseProgress.length / 5) * 100;
    //   courseEnrollment.progress = progressPercentage;
    // }
  } else {
    courses = await Courses.find({ status: "published" });
    courses = filterTeaserCoursesForViewer(courses, viewerSchoolId);
  }

  res.status(StatusCodes.OK).json({ courses });
};


exports.getCompletedWeeks = async (req, res) => {
  let weeks = await Assesment.distinct("week", {
    user: req.user._id,
    courseEnrollment: req.params.id
  });

  res.status(StatusCodes.OK).json({ weeks });
};

exports.getSingleEnrollment = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: `Invalid enrollment ID: ${id}`
    });
  }

  const enrollment = await CourseEnrollment.findOne({
    _id: id,
    user: req.user._id
  }).populate("course")
    .populate("schoolCourseEnrollment");

  if (!enrollment) {
    return res.status(StatusCodes.NOT_FOUND).json({
      success: false,
      message: "Enrollment not found or access denied"
    });
  }

  res.status(StatusCodes.OK).json({ enrollment });
};

exports.submitUserCourseData = async (req, res) => {

  try {
    const user = req.user._id;
    const email = req.user.email;
    const { courseEnrollmentId, week } = req.body;

    // Validate courseEnrollmentId
    if (!mongoose.Types.ObjectId.isValid(courseEnrollmentId)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: `Invalid course enrollment ID: ${courseEnrollmentId}`,
      });
    }

    req.body.user = user;
    req.body.email = email;
    req.body.checkModel = req.user.isEducator ? "Educator" : "User";

    const courseEnrollmentForActivity = await CourseEnrollment.findOne({
      _id: courseEnrollmentId,
      user,
    }).populate({
      path: "course",
      select: "weeks"
    });

    if (!courseEnrollmentForActivity) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Student not enrolled in course!" });
    }


    // Check if Activity and Assessment for this course already exist
    // Look for the existing activity and assessment using both potential field names
    const [existingActivity, existingAssessment] = await Promise.all([
      Activity.findOne({
        user,
        week,
        $or: [{ courseEnrollmentId }, { courseEnrollment: courseEnrollmentId }]
      }),
      Assesment.findOne({
        user,
        email,
        week,
        $or: [{ courseEnrollmentId }, { courseEnrollment: courseEnrollmentId }]
      })
    ]);

    if (existingActivity && existingAssessment) {
      return res.status(StatusCodes.OK).json({
        success: false,
        message: "You have already taken the activity and assessment"
      });
    }
    // The current code does prevent the assessment from saving if the activity fails.
    // This is because the `newActivity.save()` operation is awaited, and if it throws an error,
    // the catch block will handle it and return a response with an error message.
    // The code for saving the assessment (`newAssessment.save()`) is only reached if the activity is successfully saved.
    // Therefore, if the activity fails to save, the assessment will not be attempted to be saved.
    if (!existingActivity && !existingAssessment) {
      const newActivity = new Activity(req.body);
      await newActivity.save();
      const newAssessment = new Assesment(req.body);
      await newAssessment.save()
        .then(async () => {
          // Increase the progress
          courseEnrollmentForActivity.progress = Math.min(100, Math.ceil(courseEnrollmentForActivity.progress + (100 / courseEnrollmentForActivity?.course?.weeks)))

          // Update lastWeekIndex to unlock next week, using Math.max to prevent regression
          const currentWeekNum = parseInt(week);
          if (!isNaN(currentWeekNum)) {
            courseEnrollmentForActivity.lastWeekIndex = Math.max(courseEnrollmentForActivity.lastWeekIndex || 1, currentWeekNum + 1);
          }

          await courseEnrollmentForActivity.save()
          return res.status(StatusCodes.OK).json({
            success: true,
            message: "Activity and Assessment have been successfully saved!",
            newAssessment,
            newActivity
          });
        })
        .catch((error) => {

          console.log(error)
          return res.status(StatusCodes.SERVER_ERROR).json({
            success: false,
            message: "Failed to save assessment after activity was saved",
            error: error.message
          });
        });
    }

    if (existingActivity) {
      // Update the existing activity with the complete data from the final submission
      // This ensures the DB always has the full set of activities, even if the
      // last fire-and-forget progressive save lost the race to the assessment creation
      if (req.body.activities && req.body.activities.length > (existingActivity.activities?.length || 0)) {
        existingActivity.activities = req.body.activities;
        await existingActivity.save();
      }

      const newAssessment = new Assesment(req.body);
      await newAssessment.save();
      // Increase course progress
      courseEnrollmentForActivity.progress = Math.min(100, Math.ceil(courseEnrollmentForActivity.progress + (100 / courseEnrollmentForActivity?.course?.weeks)))

      // Update lastWeekIndex to unlock next week, using Math.max to prevent regression
      const currentWeekNum = parseInt(week);
      if (!isNaN(currentWeekNum)) {
        courseEnrollmentForActivity.lastWeekIndex = Math.max(courseEnrollmentForActivity.lastWeekIndex || 1, currentWeekNum + 1);
      }

      await courseEnrollmentForActivity.save()
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Activity and Assessment have been successfully saved!",
        newAssessment
      });
    }

    if (existingAssessment) {
      const newActivity = new Activity(req.body);
      await newActivity.save();
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Assessment already exists. Activity has been successfully saved!",
        newActivity
      });
    }

  } catch (error) {
    console.log(error)
    return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }

};

exports.getUserCourseData = async (req, res) => {
  const { id, week } = req.params;

  // Validate ID
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: "failed",
      message: `Invalid ID: ${id}`
    });
  }
  // Find the assessment and activity for the user
  const [assessment, activity] = await Promise.all([
    Assesment.findOne({
      week,
      $or: [{ courseEnrollmentId: id }, { courseEnrollment: id }],
    }),
    Activity.findOne({
      $or: [{ courseEnrollmentId: id }, { courseEnrollment: id }],
      week
    })
  ]);

  if (!assessment && !activity) {
    return res.status(StatusCodes.NOT_FOUND).json({
      status: "failed",
      message: "No assessment or activity for this student"
    });
  }

  res.status(StatusCodes.OK).json({ assessment, activity });

};

exports.activityData = async (req, res) => {
  const { id } = req.params; // This is the course ID (or enrollment ID depending on usage, but users.js says :id)

  const user = req.user._id;
  const email = req.user.email;

  req.body.user = user;
  const week = req.body.week;

  req.body.email = email;
  req.body.checkModel = req.user.isSchool
    ? "School"
    : req.user.educatorType
      ? "Educator"
      : "User";

  // Try to find the enrollment to update progress
  const enrollment = await CourseEnrollment.findOne({
    $or: [{ course: id }, { _id: id }],
    user,
    status: "Confirmed"
  });

  if (enrollment) {
    let updateNeeded = false;
    if (enrollment.progress === 0) {
      enrollment.progress = 1; // Trigger "Ongoing" status for Admin-Client
      updateNeeded = true;
    }

    // Update lastWeekIndex if the current week is higher
    const weekNum = parseInt(week);
    if (!isNaN(weekNum) && weekNum > (enrollment.lastWeekIndex || 0)) {
      enrollment.lastWeekIndex = weekNum;
      updateNeeded = true;
    }

    if (updateNeeded) {
      await enrollment.save();
    }
  }

  // Safety net: Do NOT overwrite activity data for a completed week
  const existingAssessment = await Assesment.findOne({
    user,
    week,
    $or: [{ courseEnrollment: id }, { courseEnrollmentId: id }]
  });

  if (existingAssessment) {
    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Week already completed. Activity not updated."
    });
  }

  // Upsert Activity data
  const updatedActivity = await Activity.findOneAndUpdate(
    {
      $or: [{ courseEnrollment: id }, { courseEnrollmentId: id }],
      week,
      user
    },
    {
      ...req.body,
      courseEnrollment: enrollment ? enrollment.course : id,
      courseEnrollmentId: enrollment ? enrollment._id : id
    },
    { new: true, upsert: true }
  );

  return res.status(StatusCodes.OK).json({
    success: true,
    message: "Your progress has been successfully saved!",
    newActivity: updatedActivity
  });
};

exports.getactivityData = async (req, res) => {
  const { id, week } = req.params;
  const user = req.user._id;
  const email = req.user.email;

  const activity = await Activity.findOne({
    $or: [{ courseEnrollment: id }, { courseEnrollmentId: id }],
    user,
    week,
    email
  });

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
  const { enrollmentId } = req.query;

  // Validate ID
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: "failed",
      message: `Invalid course ID: ${id}`
    });
  }

  // Validate enrollmentId if provided
  if (enrollmentId && !mongoose.Types.ObjectId.isValid(enrollmentId)) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: "failed",
      message: `Invalid enrollment ID: ${enrollmentId}`
    });
  }
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
  })


  if (existingAssessment) {
    return res.status(StatusCodes.CONFLICT).json({
      status: "failed",
      message: "You have already taken the Quiz"
    });
  }

  const course = await CourseEnrollment.findById(enrollmentId)
    .populate({
      path: "course",
      select: "weeks"
    });


  course.progress = Math.min(100, Math.ceil(course.progress + (100 / course?.course?.weeks)))
  const currentWeekNum = parseInt(req.body.week);
  if (!isNaN(currentWeekNum)) {
    course.lastWeekIndex = Math.max(course.lastWeekIndex || 1, currentWeekNum + 1);
  }

  // Save course progress and create assessment in parallel
  const [savedCourse, assessment] = await Promise.all([
    course.save(),
    Assesment.create(assessmentData)
  ]);

  res.status(StatusCodes.OK).json({
    status: "success",
    message: "Quiz submited successfully!", assessment
  });
};

exports.getAssessmentData = async (req, res) => {
  const { id, week } = req.params;
  const user = req.user._id;
  const email = req.user.email;

  // Validate ID
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: "failed",
      message: `Invalid course ID: ${id}`
    });
  }

  // Find the assessment for the user
  const existingAssessment = await Assesment.findOne({
    user,
    email,
    week,
    courseEnrollment: id,
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

exports.getAssessmentPercentile = async (req, res) => {
  const { id } = req.params;
  const user = req.user._id;


  const [findEnrollment, existingAssessment] = await Promise.all([
    CourseEnrollment.findById(id).populate("course", "title"),
    Assesment.find({
      user,
      $or: [{ courseEnrollment: id }, { courseEnrollmentId: id }]
    }).select("rating")
  ]);



  if (!existingAssessment.length || (findEnrollment?.course?.title === "Transition" && existingAssessment.length < 10) || existingAssessment.length < 5) {
    return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
      status: "failed",
      message: "Please complete all activities and assessment to see feedback!"
    });
  }

  const totalRating = existingAssessment.reduce((sum, assessment) => sum + parseInt(assessment.rating), 0);
  const averageRating = totalRating / existingAssessment.length;

  res.status(StatusCodes.OK).json({
    status: "success",
    averagePercent: averageRating
  });


};

exports.endOfCourseReaction = async (req, res) => {
  const { reaction } = req.query;
  const { id } = req.params; // Assuming courseId is passed as a URL parameter
  const userId = req.user._id; // Assuming `req.user` contains the authenticated user's details

  // Find the course by ID
  const course = await Courses.findById(id);

  if (!course) {
    return res.status(404).json({ message: "Course not found" });
  }

  // Check if user has already reacted (in likes or dislikes)
  const hasLiked = course.likes.some((id) => id.toString() === userId.toString());
  const hasDisliked = course.dislikes.some((id) => id.toString() === userId.toString());

  if (hasLiked || hasDisliked) {
    return res.status(200).json({ message: "Reaction already recorded" });
  }

  if (reaction === "neutral") {
    return res.status(200).json({ message: "Success" });
  }

  if (!["like", "dislike"].includes(reaction)) {
    return res.status(400).json({ message: "Invalid reaction" });
  }

  // Add the userId to the appropriate array
  if (reaction === "like") {
    course.likes.push(userId);
  } else if (reaction === "dislike") {
    course.dislikes.push(userId);
  }
  // Save the updated course
  await course.save();

  res.status(200).json({ message: "Reaction updated successfully" });

}

