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
const { courseEnrollment } = require("./schoolsController");
const course = require("../models/course");

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
    userId,
    enrollmentId
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
      lga,
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
  newParent.lga = lga

  let firstStudentToken = null;
  let emailError = null;

  for (const studentItem of students) {
    const { userId, fullName, grade, gender, DOB, password } = studentItem;

    // Check if the student is already registered under this parent
    const existingStudent = newParent.students.find(
      (s) => s.fullName === fullName && s.DOB === DOB
    );

    // console.log(existingStudent,"Existing student")

    if (existingStudent) {
      if (existingStudent.isVerified) {
        // toDo: For a verified student check if he has new course invite
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
          foundStudent.phone = phone
          foundStudent.lga = lga
          foundStudent.state = state
        }

        await foundStudent.save();
        await StudentEnrollments.findByIdAndUpdate(enrollmentId,
          {
            status: "Confirmed" // Update object
          },
          {
            new: true, // Return the updated document
          }
        );

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
      : req.user.educatorType
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

  const parent = await Parents.findOne({ email });

  if (!parent) {
    return res.status(StatusCodes.NOT_FOUND).json({
      status: "failed",
      message: "Parent not found"
    });
  }

  // toDo we need to modify this to indicate the student to send to.
  const studentsWithInvite = await User.find({
    email: email,
    newCourseInvite: { $exists: true, $ne: null }
  }).select('-password');

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
      status: "Confirmed",
    })
      .populate("course")
      .populate("schoolCourseEnrollment");

    // // Filter out courses where `schoolCourseEnrollment` exists but is not active
    // Filter the courses to include only those where the schoolCourseEnrollment is either non-existent or has an "Active" status
    courses = courses.filter(
      (courseEnrollment) => !courseEnrollment.schoolCourseEnrollment || courseEnrollment.schoolCourseEnrollment.status === "Active"
    );

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

exports.submitUserCourseData = async (req, res) => {
  const user = req.user._id;
  const email = req.user.email;
  const week = req.body.week;

  req.body.user = user;
  req.body.email = email;
  req.body.checkModel = req.user.educatorType
    ? "Educator"
    : "User";

  // const activities = req.body.activities;
  // const assesment = req.body.assesment;

  const courseEnrollmentForActivity = await CourseEnrollment.findOne({
    _id: req.body.courseEnrollmentId,
    user,
  }).populate({
    path: "course",
    select: "weeks"
  });
  ;

  if (!courseEnrollmentForActivity) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Student not enrolled in course!" });
  }


  // Check if Activity and Assessment for this course already exist
  // Look for the existing activity
  const [existingActivity, existingAssessment] = await Promise.all([
    Activity.findOne({ courseEnrollmentId: req.body.courseEnrollmentId, week, user }),
    Assesment.findOne({
      user,
      email,
      week: req.body.week,
      courseEnrollmentId: req.body.courseEnrollmentId
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
        courseEnrollmentForActivity.progress += 100 / courseEnrollmentForActivity?.course?.weeks
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
    const newAssessment = new Assesment(req.body);
    await newAssessment.save();
    // Increase course progress
    courseEnrollmentForActivity.progress += 100 / courseEnrollmentForActivity?.course?.weeks
    await courseEnrollmentForActivity.save()
    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Activity already exists. Assessment has been successfully saved!",
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

};

exports.getUserCourseData = async (req, res) => {
  const { id, week } = req.params;
  // Find the assessment and activity for the user
  const [assessment, activity] = await Promise.all([
    Assesment.findOne({
      week,
      courseEnrollmentId: id,
    }),
    Activity.findOne({
      courseEnrollmentId: id,
      week
    })
  ]);

  if (!assessment || !activity) {
    return res.status(StatusCodes.NOT_FOUND).json({
      status: "failed",
      message: "No assessment or activity for this student"
    });
  }

  res.status(StatusCodes.OK).json({ assessment, activity });

};

exports.activityData = async (req, res) => {
  const { id } = req.params;

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
  req.body.courseEnrollment = id;
  const activities = req.body.activities;

  const courseEnrollmentForActivity = await Course.findById(id);
  if (!courseEnrollmentForActivity) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "Course not found" });
  }

  // Look for the existing activity
  const activity = await Activity.findOne({ courseEnrollment: id, week, user });

  // If no activity is found, create a new one
  if (!activity) {
    const newActivity = new Activity(req.body);
    await newActivity.save();
    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Your progress has been successfully saved!",
      newActivity
    });
  }

  // If an activity is found, respond with a conflict
  return res.status(StatusCodes.OK).json({
    success: true,
    message: "You have already taken the activity"
  });
};

exports.getactivityData = async (req, res) => {
  const { id, week } = req.params;
  const user = req.user._id;
  const email = req.user.email;

  const activity = await Activity.findOne({
    courseEnrollment: id,
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
  const { enrollmentId } = req.query
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


  course.progress += 100 / course?.course?.weeks

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

exports.endOfCourseReaction = async (req, res) => {
  const { reaction } = req.query;
  const { id } = req.params; // Assuming courseId is passed as a URL parameter
  const userId = req.user._id; // Assuming `req.user` contains the authenticated user's details

  // Find the course by ID
  const course = await Courses.findById(id);

  if (!course) {
    return res.status(404).json({ message: "Course not found" });
  }

  if (reaction === "neutral") {
    return res.status(200).json({ message: "Success" });
  }

  if (!["like", "dislike"].includes(reaction)) {
    return res.status(400).json({ message: "Invalid reaction" });
  }

  // Remove the userId from both arrays to ensure no duplicates
  course.likes = course.likes.filter((id) => id.toString() !== userId.toString());
  course.dislikes = course.dislikes.filter((id) => id.toString() !== userId.toString());

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
