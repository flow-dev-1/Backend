const mongoose = require("mongoose");
const OTP = require("../models/OTP");
const StatusCodes = require("../utils/status-codes");
const bcrypt = require("bcrypt");
const _ = require("lodash");
const {
    Otp_VerifyAccount,
    Otp_ForgotPassword,
    school_admin_invite,
    school_course_invite,
    school_course_invite_teacher,
} = require("../utils/sendmail");
const otpGenerator = require("otp-generator");
const cloudinary = require("../utils/cloudinary");
const { User } = require("../models/user");
const Schools = require("../models/school");
const Payment = require("../models/payment");
const Courses = require("../models/course");
const SchoolCourses = require("../models/schoolCourseEnrollment");
const StudentEnrollments = require("../models/courseEnrollment");
const { Parents } = require("../models/parentGuardian");
const { generateUserId } = require("./indexController");
const generateId = require("../utils/generateId");
const { Educator } = require("../models/educators");
const doesFullNameMatch = require("../utils/fullNameCheck");
const findStudentByEmailAndFullName = require("../utils/findStudentBymail");
const winston = require("winston");

// Configure Winston to log errors to the courseInviteError.log file
const logger = new winston.Logger({
    level: "error",
    transports: [
        new winston.transports.File({
            filename: "courseInviteError.log",
            json: true,
            timestamp: true, // This is how you add a timestamp in Winston 2.x
        }),
    ],
});

exports.getCurrentSchool = async (req, res) => {
    let school = await Schools.findOne({ _id: req.user._id }).select(
        "-password -isVerified -isDeleted -resetPassword"
    );
    res.status(StatusCodes.OK).json({ school });
};

exports.getSingleSchool = async (req, res) => {
    const school = await Schools.findById(req.params.id).select(
        "-password -isVerified -isDeleted -resetPassword"
    );
    // .populate("team", "fullNaame email school schoolAdminStatus schoolAdminPermission schoolAdminDate newInvite");
    res.status(StatusCodes.OK).json({
        status: "success",
        school,
    });
};

exports.getSchoolAdminTeam = async (req, res) => {
    // Find the school and populate the team field
    const school = await Schools.findOne({ _id: req.params.id }).select("team").populate({
        path: "team",
        select: "fullName email newInvite.school newInvite.schoolAdminStatus newInvite.schoolAdminPermission newInvite.schoolAdminDate", // Select the fields you want from the Educator document
    });

    if (!school) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: "School not found!" });
    }

    // Send the populated team array in the response
    res.status(StatusCodes.OK).json({ teams: school.team });
};

exports.getSchoolEmailTeam = async (req, res) => {
    let teams = await Schools.findOne({ _id: req.params.id }).select("email_notification");
    res.status(StatusCodes.OK).json({ teams });
};

exports.getCourses = async (req, res) => {
    let { type } = req.query;
    let courses;

    if (type === "Enrolled") {
        let enrolledCourses = await SchoolCourses.find({
            school: req.params.id,
            // status: "Active",
        })
            .populate("course")
            .lean();

        // Filter out duplicate or unwanted courses based on the populated `course`
        courses = enrolledCourses.filter(
            (course, index, self) =>
                index ===
                self.findIndex((c) => c.course._id.toString() === course.course._id.toString())
        );
    } else {
        courses = await Courses.find({ status: "published" }).lean();
    }

    res.status(StatusCodes.OK).json({ courses });
};

exports.getSingleEnrolledCourse = async (req, res) => {
    let { enrolledCourseId } = req.params;

    const course = await SchoolCourses.findOne({ _id: enrolledCourseId })
        .populate("course", "title image")
        .populate({
            path: "studentEnrollments",
            populate: {
                path: "user",
                select: "fullName email phone gender DOB",
            },
        });

    // console.log(course)
    // Handle students wuthout phone number

    const confirmedEnrollments = course.studentEnrollments.filter(
        (item) => item.status === "Confirmed"
    );

    // Update phone numbers for students without one
    await Promise.all(confirmedEnrollments.map(async (student) => {
        if (!student?.user?.phone) {
            const parentData = await Parents.findOne({ email: student?.user?.email });
            if (parentData) {
                student.user.phone = parentData.phone;
            }
        }
    }));

    res.status(StatusCodes.OK).json({ course: { ...course.toObject(), studentEnrollments: confirmedEnrollments } });
};

exports.getAllEnrolledCourse = async (req, res) => {
    const { courseId } = req.params;
    const courses = await SchoolCourses.find({
        school: req.params.id,
        status: "Active",
        course: courseId,
    })
        .populate("course", "title image")
        .populate({
            path: "studentEnrollments",
            populate: {
                path: "user",
                select: "fullName email phone gender DOB",
            },
        });
    const filteredCourses = courses.map((course) => {
        course.studentEnrollments = course.studentEnrollments.filter(
            (item) => item.status === "Confirmed"
        );
        return course;
    });
    // Respond with the filtered courses
    res.status(StatusCodes.OK).json({ courses: filteredCourses });
};

exports.getCourselist = async (req, res) => {
    let { enrolledCourseId } = req.params;

    const course = await SchoolCourses.find({ _id: enrolledCourseId, school: req.params.id })
        .populate("course", "title image")
        .populate({
            path: "studentEnrollments",
            populate: {
                path: "user",
                select: "fullName email phone gender DOB",
            },
        });

    // console.log(course)

    course.studentEnrollments = course.studentEnrollments.filter(
        (item) => item.status === "Confirmed"
    );

    res.status(StatusCodes.OK).json({ course });
};

exports.getSingleUser = async (req, res) => {
    let { userId } = req.params;

    const user = await User.findById(userId)
        .select("-password -isDeleted -resetPassword")
        .populate({
            path: "newCourseInvite",
            populate: {
                path: "school",
                model: "School",
                select: "school_name",
            },
        });
    res.status(StatusCodes.OK).json({ user });
};

exports.getSingleEducator = async (req, res) => {
    let { userId } = req.params;

    const user = await Educator.findById(userId).select(
        "-password -isVerified -isDeleted -resetPassword"
    );
    res.status(StatusCodes.OK).json({ user });
};

exports.registerSchool = async (req, res) => {
    const {
        email,
        contact_name,
        school_name,
        password,
        grade,
        phone,
        country,
        state,
        lga,
        address,
    } = req.body;
    let photo; // Initialize photo variable

    // Check if a file is uploaded and handle it
    if (req.file?.path) {
        const result = await cloudinary.uploader.upload(req.file.path);
        photo = result.secure_url; // Set the photo URL if uploaded
    }

    let school = await Schools.findOne({ email });

    if (school && school.isVerified) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: "School already registered." });
    }

    if (school && !school.isVerified) {
        const code = otpGenerator.generate(6, {
            lowerCaseAlphabets: false,
            upperCaseAlphabets: false,
            specialChars: false,
        });

        const otp = new OTP({
            user: school._id,
            checkModel: "School",
            code,
            type: "RegisterSchool",
            expiresIn: Date.now() + 3600000,
        });

        const token = await school.generateAuthToken();
        await otp.save();
        await Otp_VerifyAccount(school.email, school.school_name, code);

        return res.status(StatusCodes.OK).json({
            message: "Please enter the code sent to your email.",
            token,
        });
    }

    // Handle School registration if not already registered
    const newSchool = new Schools({
        school_name,
        contact_name,
        email,
        grade,
        phone,
        country,
        state,
        lga,
        address,
        photo, // Include photo only if it was uploaded
    });

    const salt = await bcrypt.genSalt(10);
    newSchool.password = await bcrypt.hash(password, salt);
    await newSchool.save();

    const code = otpGenerator.generate(6, {
        lowerCaseAlphabets: false,
        upperCaseAlphabets: false,
        specialChars: false,
    });

    const otp = new OTP({
        user: newSchool._id,
        checkModel: "School",
        code,
        type: "RegisterSchool",
        expiresIn: Date.now() + 3600000,
    });

    await otp.save();
    await Otp_VerifyAccount(newSchool.email, newSchool.school_name, code);

    const token = await newSchool.generateAuthToken();

    res.status(StatusCodes.OK).json({
        message: `Enter OTP sent to ${email} to verify your account.`,
        token,
    });
};

exports.verifyAccount = async (req, res) => {
    const { code } = req.body;

    const { _id } = req.user;

    if (!code) return res.status(StatusCodes.BAD_REQUEST).json({ message: "Code is required." });

    const otp = await OTP.findOne({
        user: _id,
        code,
        type: "RegisterSchool",
    }).populate("user");

    if (!otp) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            message: "Wrong code or code expired. Please request for a new code.",
        });
    }

    await Schools.findByIdAndUpdate(_id, { isVerified: true });
    await OTP.deleteMany({ user: otp.user }).exec();

    res.status(StatusCodes.OK).json({
        message: "Your account is now verified, please proceed to login!",
    });
};

exports.loginFlowSchool = async (req, res) => {
    const { email, password } = req.body;

    let school = await Schools.findOne({ email, isVerified: true }).select(
        "-isVerified -isDeleted -resetPassword"
    );
    if (!school) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            message: "School Account not found! Please contact FLOW support.",
        });
    }

    const validPassword = await bcrypt.compare(password, school.password);
    if (!validPassword) return res.status(400).send("Invalid email or password.");

    const token = await school.generateAuthToken();

    // Remove password from the school object before sending the response
    const { password: _, ...schoolData } = school.toObject();

    res.status(StatusCodes.OK).json({
        message: "School Login successful!",
        token,
        user: schoolData,
    });
};

// Forgot Password Route
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    const school = await Schools.findOne({ email, isVerified: true });

    if (!school) return res.status(StatusCodes.BAD_REQUEST).json({ message: "School not found." });

    const code = otpGenerator.generate(6, {
        lowerCaseAlphabets: false,
        upperCaseAlphabets: false,
        specialChars: false,
    });

    const otp = new OTP({
        user: school._id,
        checkModel: "School",
        code,
        type: "ForgotPassword",
        expiresIn: Date.now() + 3600000,
    });

    await otp.save();
    const token = await school.generateAuthToken();
    await Otp_ForgotPassword(school.school_name, school.email, code, token);

    res.status(StatusCodes.OK).json({ message: `Please enter the code sent to ${email}` });
};

exports.verify_otp_forgotPassword = async (req, res) => {
    const { code } = req.body;

    if (!code) return res.status(StatusCodes.BAD_REQUEST).json({ message: "Code is required." });

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

    await Schools.findByIdAndUpdate(
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
    let school = await Schools.findOne({
        email: req.user.email,
        resetPassword: true,
    }).exec();

    // This user is not on the app
    if (!school) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: "failed",
            error: "Invalid credentials",
        });
    }

    // hash the password
    const hashed_password = await bcrypt.hash(password, 10);

    school.password = hashed_password;
    school.resetPassword = false;

    await school.save();
    res.status(StatusCodes.OK).json({
        status: "success",
        message: "You have successfully reset your password",
    });
};

exports.changePassword = async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    // Only users with valid OTP can reset password. hence resetPassword=true
    let school = await Schools.findOne({ email: req.user.email }).exec();

    // This user is not on the app
    if (!school) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: "failed",
            error: "Invalid credentials",
        });
    }

    const validPassword = await bcrypt.compare(oldPassword, school.password);
    if (!validPassword) return res.status(400).send("Your old password is incorrect!");
    // hash the password
    const hashed_password = await bcrypt.hash(newPassword, 10);

    school.password = hashed_password;

    await school.save();
    res.status(StatusCodes.OK).json({
        status: "success",
        message: "You have successfully changed your password!",
    });
};

exports.updateProfile = async (req, res) => {
    // Check if a file is uploaded
    if (req.file?.path) {
        const result = await cloudinary.uploader.upload(req.file.path);
        req.body.photo = result.secure_url;
    }

    // Find and update the user's profile
    const updateProfile = await Schools.findByIdAndUpdate(
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

exports.inviteSchoolAdmin = async (req, res) => {
    const { fullName, email, position } = req.body;

    // Fetch the school based on the logged-in user's ID
    const school = await Schools.findById(req.user._id);

    if (!school) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: "School not found!" });
    }

    // Check if the user already exists in the system
    let user = await Educator.findOne({ email });

    if (user) {
        // Check if the user is already part of the school's team
        const existingTeamMember = school.team.some((teamMemberId) =>
            teamMemberId.equals(user._id)
        );

        if (existingTeamMember) {
            return res
                .status(StatusCodes.BAD_REQUEST)
                .json({ message: "User is already in the team" });
        }

        // Update user invite details for an existing user
        user.newInvite = {
            school: school._id,
            schoolAdminDate: Date.now(),
            schoolAdminPermission: position,
        };

        // Generate an authentication token
        const token = await user.generateAuthToken();

        // Send an invitation to the existing user
        await school_admin_invite("old", fullName, req.user._id, school.school_name, email, token);

        // Add the user to the school's team
        school.team.push(user._id);

        // Persist the changes to the school and user
        await school.save();
        await user.save();

        return res.status(StatusCodes.OK).json({ message: "Admin invite sent successfully!" });
    }

    // Create a new educator record if the user does not exist
    user = new Educator({
        fullName,
        email,
        userType: "Educator",
        newInvite: {
            school: req.user._id,
            isSchoolAdmin: true,
            schoolAdminStatus: "Pending",
            schoolAdminPermission: position,
            schoolAdminDate: Date.now(),
        },
        educatorType: "School",
        school: school._id,
    });

    await user.save();

    // Generate an authentication token for the new user
    const token = await user.generateAuthToken();

    // Send an invitation to the new user
    await school_admin_invite("new", fullName, req.user._id, school.school_name, email, token);

    // Add the new user to the school's team
    school.team.push(user._id);

    // Persist the changes to the school
    await school.save();

    res.status(StatusCodes.OK).json({ message: "Admin invite sent successfully!" });
};

exports.addEmailNotificationadmin = async (req, res) => {
    const school = await Schools.findById(req.user._id);

    if (!school) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: "School not found!" });
    }
    // Check if email already exists in the email_notification array
    const emailExists = school.email_notification.some((user) => user.email === req.body.email);

    if (emailExists) {
        return res
            .status(StatusCodes.CONFLICT)
            .json({ message: "Email already exists in notifications list!" });
    }

    // Add email to email_notification array
    school.email_notification.push(req.body);

    // Save changes
    await school.save();
    res.status(StatusCodes.OK).json({ message: "Admin email notification added successfully!" });
};

exports.courseEnrollment = async (req, res) => {
    const { stdClass, dayOfWeek, startTime, endTime, students } = req.body;
    const { id, courseId } = req.params;

    const existingEnrollment = await SchoolCourses.findOne({
        course: courseId,
        school: id,
        status: "Active",
        stdClass,
    });

    if (existingEnrollment) {
        return res
            .status(StatusCodes.UNPROCESSABLE_ENTITY)
            .json({ message: "School is already enrolled in this course!" });
    }

    const [course, school] = await Promise.all([Courses.findById(courseId), Schools.findById(id)]);

    if (!course || !school) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: "School or course not found!" });
    }

    const newEnrollment = new SchoolCourses({
        _id: new mongoose.Types.ObjectId(),
        enrolledBy: req.user._id,
        docModel: req.user.isSchool ? "School" : req.user.isAdmin ? "Admin" : "User",
        course: courseId,
        school: id,
        status: "Active",
        stdClass,
        dayOfWeek,
        startTime,
        endTime,
        studentEnrollments: [],
    });

    for (const item of students) {
        try {
            // Check if this parent exist
            const existingParent = await Parents.findOne({
                email: item.email,
            }).populate("students", "-password");
            // use this for the work.
            if (!existingParent) {
                const newParent = new Parents({
                    fullName: item.guardianFullName,
                    email: item.email,
                    phone: "",
                    country: "",
                    state: "",
                    students: [],
                });

                const userId = generateId();

                const newUser = new User({
                    _id: new mongoose.Types.ObjectId(),
                    userId,
                    fullName: item?.fullName,
                    guardianFullName: item.guardianFullName,
                    email: item.email,
                    userType: "School",
                    grade: stdClass.startsWith("Pri")
                        ? "Primary"
                        : stdClass.startsWith("Year")
                            ? "Secondary"
                            : "Educator",
                    newCourseInvite: {
                        school: id,
                    },
                });

                const newStudentEnrollment = new StudentEnrollments({
                    _id: new mongoose.Types.ObjectId(),
                    course: courseId,
                    school: id,
                    schoolCourseEnrollment: newEnrollment._id,
                    user: newUser._id,
                    checkModel: "User",
                });

                newEnrollment.studentEnrollments.push(newStudentEnrollment._id);
                newParent.students = [newUser._id];
                const token = newUser.generateAuthToken();

                await Promise.all([newStudentEnrollment.save(), newUser.save(), newParent.save()]);

                let stdGrade = stdClass.startsWith("Pri")
                    ? "Primary"
                    : stdClass.startsWith("Year")
                        ? "Secondary"
                        : "Educator";

                await school_course_invite(
                    item.guardianFullName,
                    item?.fullName,
                    "new",
                    stdGrade,
                    newStudentEnrollment._id,
                    school.school_name,
                    course.title,
                    item.email,
                    token
                );
            } else {
                // the parent already exist
                // Check if the child already exist
                // Function to check if a student's full name matches the given full name with possible swaps

                const student = await findStudentByEmailAndFullName(
                    item.email,
                    item.fullName,
                    existingParent.students
                );

                // A new student
                if (!student) {
                    //
                    const userId = generateId();
                    const newUser = new User({
                        _id: new mongoose.Types.ObjectId(),
                        userId,
                        fullName: item?.fullName,
                        guardianFullName: item.guardianFullName,
                        email: item.email,
                        userType: "School",
                        grade: stdClass.startsWith("Pri")
                            ? "Primary"
                            : stdClass.startsWith("Year")
                                ? "Secondary"
                                : "Educator",
                        newCourseInvite: {
                            school: id,
                        },
                    });

                    const newStudentEnrollment = new StudentEnrollments({
                        _id: new mongoose.Types.ObjectId(),
                        course: courseId,
                        school: id,
                        schoolCourseEnrollment: newEnrollment._id,
                        user: newUser._id,
                        checkModel: "User",
                        // status: "Confirmed"
                    });

                    newEnrollment.studentEnrollments.push(newStudentEnrollment._id);
                    existingParent.students = [...existingParent.students, newUser._id];
                    const token = newUser.generateAuthToken();

                    await Promise.all([
                        newStudentEnrollment.save(),
                        newUser.save(),
                        existingParent.save(),
                    ]);

                    let stdGrade = stdClass.startsWith("Pri")
                        ? "Primary"
                        : stdClass.startsWith("Year")
                            ? "Secondary"
                            : "Educator";

                    await school_course_invite(
                        existingParent.fullName,
                        item?.fullName,
                        "new",
                        stdGrade,
                        newStudentEnrollment._id,
                        school.school_name,
                        course.title,
                        item.email,
                        token
                    );
                } else {
                    // Old student

                    // Check if the student is already enrolled in the course
                    // Check if the user is already enrolled in this course
                    const findStd = await User.findById(student._id);

                    const studentEnrollment = await StudentEnrollments.findOne({
                        course: courseId, // Assuming you have some course ID here
                        school: id,
                        schoolCourseEnrollment: newEnrollment._id,
                        status: { $ne: "Deactivated" },
                        user: findStd._id,
                    });

                    if (!studentEnrollment) {
                        findStd.newCourseInvite = {
                            school: id,
                        };

                        const newStudentEnrollment = new StudentEnrollments({
                            _id: new mongoose.Types.ObjectId(),
                            course: courseId,
                            school: id,
                            schoolCourseEnrollment: newEnrollment._id,
                            user: student._id,
                            checkModel: "User",
                        });

                        newEnrollment.studentEnrollments.push(newStudentEnrollment._id);

                        const token = findStd.generateAuthToken();
                        await Promise.all([newStudentEnrollment.save(), findStd.save()]);

                        let stdGrade = stdClass.startsWith("Pri")
                            ? "Primary"
                            : stdClass.startsWith("Year")
                                ? "Secondary"
                                : "Educator";

                        await school_course_invite(
                            existingParent.fullName,
                            findStd?.fullName,
                            "new",
                            stdGrade,
                            newStudentEnrollment._id,
                            school.school_name,
                            course.title,
                            item.email,
                            token
                        );
                    }
                }
            }
        } catch (error) {
            // console.log(error)
            logger.error({
                message: `Error processing student ${item?.fullName}`,
                error: error.message,
            });
        }
    }

    await newEnrollment.save();

    res.status(StatusCodes.OK).json({ message: "Course enrolled successfully!" });
};

const doesFullNameMatch = (studentFullName, fullName) => {
    const nameParts = fullName.toLowerCase().split(" ");
    const studentNameParts = studentFullName.toLowerCase().split(" ");

    return (
        nameParts.every((part) => studentNameParts.includes(part)) &&
        studentNameParts.every((part) => nameParts.includes(part))
    );
};

const findStudentByEmailAndFullName = async (email, fullName, students) => {
    const emailLower = email.toLowerCase();
    for (const student of students) {
        if (
            student.email.toLowerCase() === emailLower &&
            doesFullNameMatch(student.fullName, fullName)
        ) {
            return student;
        }
    }
    return null; // No match found
};

exports.addStudentsToCourseEnrollment = async (req, res) => {
    const { stdClass, students } = req.body;
    const { id, enrolledCourseId } = req.params;

    try {
        // Check if enrollment exists
        const existingEnrollment = await SchoolCourses.findOne({ _id: enrolledCourseId })
            .populate("course", "title")
            .populate("school", "school_name");

        if (!existingEnrollment) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: "You are not enrolled in this course!" });
        }

        for (const item of students) {
            try {
                // Check if the parent exists
                let existingParent = await Parents.findOne({ email: item.email }).populate("students", "-password");

                if (!existingParent) {
                    // If parent doesn't exist, create a new parent, user, and enrollment
                    const newParent = new Parents({
                        fullName: item.guardianFullName,
                        email: item.email,
                        phone: "N/A",
                        country: "N/A",
                        state: "N/A",
                        students: [],
                    });

                    const userId = generateId();
                    const newUser = new User({
                        _id: new mongoose.Types.ObjectId(),
                        userId,
                        fullName: item.fullName,
                        guardianFullName: item.guardianFullName,
                        email: item.email,
                        userType: "School",
                        grade: getStudentGrade(stdClass),
                        newCourseInvite: { school: id },
                    });

                    const newStudentEnrollment = new StudentEnrollments({
                        _id: new mongoose.Types.ObjectId(),
                        course: existingEnrollment.course._id,
                        school: id,
                        checkModel: "User",
                        schoolCourseEnrollment: existingEnrollment._id,
                        user: newUser._id,
                        stdClass,
                    });

                    existingEnrollment.studentEnrollments.push(newStudentEnrollment._id);
                    newParent.students.push(newUser._id);
                    const token = newUser.generateAuthToken();

                    await Promise.all([newStudentEnrollment.save(), newUser.save(), newParent.save()]);

                    await school_course_invite(
                        item.guardianFullName,
                        item.fullName,
                        "new",
                        getStudentGrade(stdClass),
                        newStudentEnrollment._id,
                        existingEnrollment.school.school_name,
                        existingEnrollment.course.title,
                        item.email,
                        token
                    );
                } else {
                    // Parent exists, check for existing student
                    const student = await findStudentByEmailAndFullName(item.email, item.fullName, existingParent.students);

                    if (!student) {
                        // New student creation
                        const userId = generateId();
                        const newUser = new User({
                            _id: new mongoose.Types.ObjectId(),
                            userId,
                            fullName: item.fullName,
                            guardianFullName: item.guardianFullName,
                            email: item.email,
                            userType: "School",
                            grade: getStudentGrade(stdClass),
                            newCourseInvite: { school: id },
                        });

                        const newStudentEnrollment = new StudentEnrollments({
                            _id: new mongoose.Types.ObjectId(),
                            course: existingEnrollment.course._id,
                            school: id,
                            checkModel: "User",
                            schoolCourseEnrollment: existingEnrollment._id,
                            user: newUser._id,
                        });

                        existingEnrollment.studentEnrollments.push(newStudentEnrollment._id);
                        existingParent.students.push(newUser._id);
                        const token = newUser.generateAuthToken();

                        await Promise.all([newStudentEnrollment.save(), newUser.save(), existingParent.save()]);

                        await school_course_invite(
                            existingParent.fullName,
                            item.fullName,
                            "new",
                            getStudentGrade(stdClass),
                            newStudentEnrollment._id,
                            existingEnrollment.school.school_name,
                            existingEnrollment.course.title,
                            item.email,
                            token
                        );
                    } else {
                        // Existing student, check for enrollment
                        const studentEnrollment = await StudentEnrollments.findOne({
                            course: existingEnrollment.course._id,
                            school: id,
                            schoolCourseEnrollment: existingEnrollment._id,
                            status: { $ne: "Deactivated" },
                            user: student._id,
                        });

                        if (!studentEnrollment) {
                            student.newCourseInvite = { school: id };

                            const newStudentEnrollment = new StudentEnrollments({
                                _id: new mongoose.Types.ObjectId(),
                                course: existingEnrollment.course._id,
                                school: id,
                                checkModel: "User",
                                schoolCourseEnrollment: existingEnrollment._id,
                                user: student._id,
                            });

                            existingEnrollment.studentEnrollments.push(newStudentEnrollment._id);
                            const token = student.generateAuthToken();

                            await Promise.all([newStudentEnrollment.save(), student.save()]);

                            await school_course_invite(
                                existingParent.fullName,
                                student.fullName,
                                "new",
                                getStudentGrade(stdClass),
                                newStudentEnrollment._id,
                                existingEnrollment.school.school_name,
                                existingEnrollment.course.title,
                                item.email,
                                token
                            );
                        }
                    }
                }
            } catch (error) {
                logger.error({
                    message: `Error processing student ${item.fullName}`,
                    error: error.message,
                });
            }
        }

        await existingEnrollment.save();
        res.status(StatusCodes.OK).json({ message: "Students invited to course successfully!" });
    } catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "An error occurred during the enrollment process.", error: error.message });
    }
};

// Helper function to get student grade
const getStudentGrade = (stdClass) => {
    if (stdClass.startsWith("Pri")) return "Primary";
    if (stdClass.startsWith("Year")) return "Secondary";
    return "Educator";
};


exports.removeSchoolAdmin = async (req, res) => {
    // Find the school by ID
    const school = await Schools.findById(req.user._id);
    if (!school) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: "School not found!" });
    }

    // Find the user by ID
    const user = await Educator.findById(req.params.id);
    if (!user) {
        return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({ message: "User not found" });
    }

    // Remove the user from the school's team
    const teamMembers = school.team.filter(
        (teamMemberId) => teamMemberId.toString() !== user._id.toString()
    );
    school.team = teamMembers;
    // Update user's isSchoolAdmin status
    user.isSchoolAdmin = false;

    // Save changes concurrently
    await Promise.all([user.save(), school.save()]);

    res.status(StatusCodes.OK).json({ message: "School admin removed successfully!" });
};

exports.removeEmailAdmin = async (req, res) => {
    // Find the school by ID
    const school = await Schools.findById(req.user._id);
    if (!school) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: "School not found!" });
    }

    // Remove the user from the school's team
    const emailMembers = school.email_notification.filter(
        (emailMember) => emailMember._id.toString() !== req.params.id.toString()
    );
    school.email_notification = emailMembers;

    // Save changes concurrently
    await school.save();

    res.status(StatusCodes.OK).json({ message: "School admin removed successfully!" });
};

exports.deactivateAccount = async (req, res) => {
    const { reason } = req.body;

    if (!reason || reason.length < 2)
        return res
            .status(StatusCodes.UNPROCESSABLE_ENTITY)
            .json({ message: "Deactivation reason is required!" });

    // Find the school by ID
    let school = await Schools.findById(req.user._id);

    if (!school) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: "School not found!" });
    }
    school.deletionProperties.reason = reason;
    await school.save();
    // Soft delete the account using the plugin method
    await Schools.softDeleteOne({ _id: req.user._id }).exec();

    res.status(StatusCodes.OK).json({ message: "Account deactivated successfully!" });
};

exports.deleteStudentFromCourseEnrollment = async (req, res) => {
    const { enrolledCourseId, userId, userEnrollmentId } = req.params;

    // ToDo: Must not delete student already active on course

    const existingEnrollment = await SchoolCourses.findOne({
        _id: enrolledCourseId,
    })
        .populate("course", "title")
        .populate("school", "school_name");

    if (!existingEnrollment) {
        return res
            .status(StatusCodes.UNPROCESSABLE_ENTITY)
            .json({ message: "You are not enrolled in this course!" });
    }

    // Check if the student is enrolled in the course
    const studentIndex = existingEnrollment.studentEnrollments.findIndex(
        (enrollment) => enrollment.toString() === userEnrollmentId
    );

    if (studentIndex === -1) {
        return res
            .status(StatusCodes.NOT_FOUND)
            .json({ message: "Student not found in this enrollment!" });
    }
    // Remove the student from the enrollment
    existingEnrollment.studentEnrollments.splice(studentIndex, 1);

    // Save the updated enrollment
    await existingEnrollment.save();

    // Find the user and remove the newInvite related to the course
    let user = await User.findById(userId);

    if (user) {
        user.newCourseInvite = null;
        await user.save();
    }

    res.status(StatusCodes.OK).json({ message: "User deleted successfully!" });
};

exports.schoolEnrolledStudents = async (req, res) => {
    const school = req.user._id;

    const allTeachers = await Educator.find({ school });
    const teachersCount = allTeachers.length;
    const enrolledCourses = await SchoolCourses.find({ school }).populate({
        path: "studentEnrollments",
        populate: {
            path: "user",
            select: "fullName userId email guardianFullName userType grade gender",
        },
    });

    let totalEnrolledStudents = 0;
    let totalMales = 0;
    let totalFemales = 0;
    let totalTeachers = teachersCount;

    enrolledCourses.forEach((course) => {
        if (course.studentEnrollments && course.studentEnrollments.length > 0) {
            totalEnrolledStudents += course.studentEnrollments.length;

            course.studentEnrollments.forEach((enrollment) => {
                if (enrollment.user.gender === "male") {
                    totalMales += 1;
                } else if (enrollment.user.gender === "female") {
                    totalFemales += 1;
                }
            });
        }
    });

    // Send the response
    res.status(StatusCodes.OK).json({
        status: "success",
        enrolledCourses,
        totalEnrolledStudents,
        totalMales,
        totalFemales,
        totalTeachers,
    });
};

exports.schoolCoursesEnrollemnt = async (req, res) => {
    const school = req.user._id;

    const schoolCourses = await StudentEnrollments.find({
        school,
        status: "Active",
    }).populate({
        path: "course",
        select: "title courseEnrollment",
    });

    res.status(StatusCodes.OK).json({
        status: "success",
        schoolCourses,
    });
};

exports.getPayments = async (req, res) => {
    // const useerId = new MOn
    try {
        const payments = await Payment.find({ user: req.user._id });
        res.status(StatusCodes.OK).json({ payments });
    } catch (error) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
    }
};

exports.schoolTeachers = async (req, res) => {
    const school = req.user._id;

    const allTeachers = await Educator.find({ school });

    // Send the response
    res.status(StatusCodes.OK).json({
        status: "success",
        allTeachers,
    });
};

exports.schoolCoursesActiveGraph = async (req, res) => {
    const school = req.user._id;

    const allCourses = await SchoolCourses.find({
        school,
        status: "Active",
    }).populate({
        path: "course",
        select: "title",
    });

    const { totalActive, totalNonActive } = allCourses.reduce(
        (totals, course) => {
            if (course.status === "Active") {
                totals.totalActive += 1;
            } else {
                totals.totalNonActive += 1;
            }
            return totals;
        },
        { totalActive: 0, totalNonActive: 0 }
    );

    const dataEnrollment = allCourses.reduce((acc, course) => {
        const courseTitle = course.course.title;
        const enrollmentCount = course.studentEnrollments.length;

        // Check if the course title is already in the array
        const existingCourse = acc.find((item) => item.name === courseTitle);
        if (existingCourse) {
            existingCourse.value += enrollmentCount; // Aggregate count if already exists
        } else {
            acc.push({ name: courseTitle, value: enrollmentCount });
        }
        return acc;
    }, []);

    // Send the response
    res.status(StatusCodes.OK).json({
        status: "success",
        allCourses,
        totalActive,
        totalNonActive,
        dataEnrollment, // Include the dataEnrollment array in the response
    });
};

exports.allGraphData = async (req, res) => {
    const school = req.user._id;
    // Fetch the graph data with necessary fields populated
    const graphData = await StudentEnrollments.find({
        school,
        status: { $ne: "Deactivated" },
    }).populate([
        {
            path: "course",
            select: "title status cost currency",
        },
        {
            path: "schoolCourseEnrollment",
            select: "status studentEnrollments",
        },
        {
            path: "user",
            select: "gender fullName email",
        },
    ]);

    // Initialize counters and result holders
    let totalStudents = 0;
    let totalMales = 0;
    let totalFemales = 0;
    let totalTeachers = 0; // Counter for teachers
    let completed = 0;
    let remaining = 0;
    let active = 0;
    let notActive = 0;
    let totalAmount = 0; // Total amount includes both Users and Educators
    let userAmount = 0; // Total amount specifically for users
    const dataEnrollment = {};

    // Process each entry in the graph data
    for (const entry of graphData) {
        const { user, course, progress, schoolCourseEnrollment, checkModel, status } = entry;


        if (status === "Confirmed") {
            // Accumulate total cost for courses, regardless of the checkModel
            if (course && course.cost) {
                totalAmount += course.cost;
                totalStudents++;
                active++;
            }

            if (checkModel === "User") {
                // Count gender for students
                if (user && user.gender) {
                    if (user.gender === "male") {
                        totalMales++;
                    } else if (user.gender === "female") {
                        totalFemales++;
                    }
                }
                console.log(progress,user)
                // Count completion status for students
                if (progress === 100) {
                    completed++;
                } else {
                    remaining++;
                }

                // Count students per course
                if (course && course.title) {
                    if (dataEnrollment[course.title]) {
                        dataEnrollment[course.title] += 1;
                    } else {
                        dataEnrollment[course.title] = 1;
                    }
                }

                // // Accumulate total cost for users
                // if (course && course.cost) {
                //     userAmount += course.cost;
                // }
            } else if (checkModel === "Educator") {
                // Count educators only
                totalTeachers++;
            }
        } else {
            notActive++;
        }
    }

    // Convert dataEnrollment object to an array
    const dataEnrollmentArray = Object.keys(dataEnrollment).map((key) => ({
        name: key,
        value: dataEnrollment[key],
    }));

    // Send the response with calculated values
    res.status(200).json({
        status: "success",
        totalMales,
        totalFemales,
        totalStudents,
        totalTeachers,
        completed, // Only for students
        remaining, // Only for students
        active, // Only for students
        notActive, // Only for students
        totalAmount, // Total amount includes both Users and Educators
        // userAmount,
        dataEnrollment: dataEnrollmentArray,
        validGraphData: graphData,
    });
};

exports.addTeachersToEnrolledCourse = async (req, res) => {
    const { stdClass, educators } = req.body;
    const { id, enrolledCourseId } = req.params;
    console.log(enrolledCourseId);
    // Find the existing course enrollment
    const existingEnrollment = await SchoolCourses.findOne({
        school: id,
    })
        .populate("course", "title")
        .populate("school", "school_name");

    // Check if the course enrollment exists
    if (!existingEnrollment) {
        return res
            .status(StatusCodes.UNPROCESSABLE_ENTITY)
            .json({ message: "You are not enrolled in this course!" });
    }

    // Process each educator in the request
    for (const educatorData of educators) {
        // Check if the educator already exists
        let educator = await Educator.findOne({ email: educatorData.email });

        if (!educator) {
            // If the educator doesn't exist, create a new one
            educator = new Educator({
                _id: new mongoose.Types.ObjectId(),
                fullName: educatorData.fullName,
                phone: "N/A",
                email: educatorData.email,
                educatorType: "School",
                grade: "Educator",
                newCourseInvite: { school: id },
            });
            await educator.save();
        }

        // Check if the educator is already enrolled in the course
        let studentEnrollment = await StudentEnrollments.findOne({
            course: existingEnrollment.course._id,
            school: id,
            checkModel: "Educator",
            schoolCourseEnrollment: existingEnrollment._id,
            user: educator._id,
            status: { $ne: "Deactivated" },
        });

        if (!studentEnrollment) {
            // If not enrolled, create a new enrollment
            studentEnrollment = new StudentEnrollments({
                _id: new mongoose.Types.ObjectId(),
                course: existingEnrollment.course._id,
                school: id,
                checkModel: "Educator",
                schoolCourseEnrollment: existingEnrollment._id,
                user: educator._id,
            });

            existingEnrollment.studentEnrollments.push(studentEnrollment._id);
            await studentEnrollment.save();
        }

        const token = educator.generateAuthToken();

        // Determine the grade type
        const stdGrade = stdClass.startsWith("Pri")
            ? "Primary"
            : stdClass.startsWith("Year")
                ? "Secondary"
                : "Educator";

        // Send invite to the educator
        await school_course_invite_teacher(
            educator.fullName,
            "new",
            stdGrade,
            studentEnrollment._id,
            existingEnrollment.school.school_name,
            existingEnrollment.course.title,
            educator.email,
            token
        );
    }

    await existingEnrollment.save();

    res.status(StatusCodes.OK).json({ message: "Educators invited to course successfully!" });
};

exports.toggleForCourse = async (req, res) => {
    const course = await SchoolCourses.updateMany(
        {
            course: req.params.id,
            school: req.user._id,
        },
        {
            $set: { status: req.body.status },
        },
        { new: true }
    );


    res.status(StatusCodes.OK).json({ message: "Course updated!" });
};

