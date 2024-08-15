const mongoose = require("mongoose");
const OTP = require("../models/OTP");
const StatusCodes = require("../utils/status-codes");
const bcrypt = require("bcrypt");
const _ = require("lodash");
const { Otp_VerifyAccount, Otp_ForgotPassword, school_admin_invite, school_course_invite } = require("../utils/sendmail");
const otpGenerator = require("otp-generator");
// const { initiatePaystackPayment } = require("../utils/paystack");
// const CourseEnrollment = require("../models/courseEnrollment");
const cloudinary = require("../utils/cloudinary");
const { User } = require("../models/user");
const { Schools } = require("../models/school");

const Courses = require("../models/course")
const SchoolCourses = require("../models/schoolCourseEnrollment")
const StudentEnrollments = require("../models/courseEnrollment")

exports.getCurrentSchool = async (req, res) => {
    let school = await Schools.findOne({ _id: req.user._id })
        .select('-password -isVerified -isDeleted -resetPassword');
    res.status(StatusCodes.OK).json({ school });
}

exports.getSingleSchool = async (req, res) => {

    const school = await Schools.findById(req.params.id)
        .select('-password -isVerified -isDeleted -resetPassword')
    // .populate("team", "first_name last_name email school schoolAdminStatus schoolAdminPermission schoolAdminDate newInvite");
    res.status(StatusCodes.OK).json({
        status: 'success',
        school
    });
};

exports.getSchoolAdminTeam = async (req, res) => {

    let teams = await Schools.findOne({ _id: req.params.id })
        .select('team')
        .populate("team", "first_name last_name email school schoolAdminStatus schoolAdminPermission schoolAdminDate newInvite");
    res.status(StatusCodes.OK).json({ teams });
}

exports.getSchoolEmailTeam = async (req, res) => {

    let teams = await Schools.findOne({ _id: req.params.id })
        .select('email_notification')
    res.status(StatusCodes.OK).json({ teams });
}

exports.getCourses = async (req, res) => {
    let { type } = req.query

    let courses;

    if (type === 'Enrolled') {

        courses = await SchoolCourses.find({ school: req.params.id, status: "Active" })
            .populate("course")
    } else {
        courses = await Courses.find({ status: "published" })
    }
    res.status(StatusCodes.OK).json({ courses });
}

exports.getSingleEnrolledCourse = async (req, res) => {
    let { enrolledCourseId } = req.params

    const course = await SchoolCourses.findOne({ _id: enrolledCourseId })
        .populate("course", "title image")
        .populate({
            path: "studentEnrollments",
            populate: {
                path: "user",
                select: "first_name last_name email phone gender DOB"
            }
        });

    // console.log(course)

    course.studentEnrollments = course.studentEnrollments.filter(item => item.status === "Confirmed")

    res.status(StatusCodes.OK).json({ course });
}

exports.getSingleUser = async (req, res) => {
    let { userId } = req.params

    const user = await User.findById(userId)
        .select("-password -isVerified -isDeleted -resetPassword");
    res.status(StatusCodes.OK).json({ user });

}

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
        return res
            .status(StatusCodes.BAD_REQUEST)
            .json({ message: "School already registered." });
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

    res
        .status(StatusCodes.OK)
        .json({
            message: `Enter OTP sent to ${email} to verify your account.`,
            token,
        });
};



exports.verifyAccount = async (req, res) => {
    const { code } = req.body;

    const { _id } = req.user;

    if (!code) return res.status(StatusCodes.BAD_REQUEST).json({ message: "Code is required." });


    const otp = await OTP.findOne({ user: _id, code, type: "RegisterSchool" }).populate("user");

    if (!otp) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: "Wrong code or code expired. Please request for a new code." });
    }

    await Schools.findByIdAndUpdate(_id, { isVerified: true });
    await OTP.deleteMany({ user: otp.user }).exec();

    res.status(StatusCodes.OK).json({ message: "Your account is now verified, please proceed to login!" });
}

exports.loginFlowSchool = async (req, res) => {
    const { email, password } = req.body

    let school = await Schools.findOne({ email, isVerified: true })
        .select("-isVerified -isDeleted -resetPassword");
    if (!school) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: "School Account not found! Please contact FLOW support." })
    }

    const validPassword = await bcrypt.compare(password, school.password);
    if (!validPassword) return res.status(400).send('Invalid email or password.');


    const token = await school.generateAuthToken();

    // Remove password from the school object before sending the response
    const { password: _, ...schoolData } = school.toObject();

    res.status(StatusCodes.OK).json({ message: "School Login successful!", token, user: schoolData });
}


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
}

exports.verify_otp_forgotPassword = async (req, res) => {
    const { code } = req.body

    if (!code) return res.status(StatusCodes.BAD_REQUEST).json({ message: "Code is required." });

    //check otp code
    const otp = await OTP.findOne({ code })
        .exec();

    if (otp === null) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: 'failed',
            error: 'Invalid OTP Token'
        });
    }

    if (otp.user.toString() !== req.user._id) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: 'failed',
            message: 'Invalid User Credentials'
        });
    }

    // Check if the otp has expired
    const otp_valid = (otp.expiresIn > Date.now())
    //  < Date.now(); 
    if (!otp_valid) {
        // delete otp code
        await OTP.findOneAndDelete({ code }).exec();
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: 'failed',
            message: 'Invalid or Expired Token.'
        });

    }

    // delete otp code
    await OTP.deleteMany({ user: otp.user }).exec();

    await Schools.findByIdAndUpdate(otp.user._id, {
        resetPassword: true
    }, {
        new: true
    })

    return res.status(StatusCodes.OK).json({
        status: 'success',
        message: 'OTP verified, You can now reset Password'
    });
}

exports.resetPassword = async (req, res) => {
    const { password } = req.body

    // Only users with valid OTP can reset password. hence resetPassword=true
    let school = await Schools.findOne({ email: req.user.email, resetPassword: true }).exec();

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
        status: 'success',
        message: 'You have successfully reset your password',

    });
};

exports.changePassword = async (req, res) => {
    const { oldPassword, newPassword } = req.body

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
    if (!validPassword) return res.status(400).send('Your old password is incorrect!');
    // hash the password
    const hashed_password = await bcrypt.hash(newPassword, 10);

    school.password = hashed_password;

    await school.save();
    res.status(StatusCodes.OK).json({
        status: 'success',
        message: 'You have successfully changed your password!',

    });
};

exports.updateProfile = async (req, res) => {

    // Check if a file is uploaded
    if (req.file?.path) {
        const result = await cloudinary.uploader.upload(req.file.path);
        req.body.photo = result.secure_url;
    }


    // Find and update the user's profile
    const updateProfile = await Schools.findByIdAndUpdate(req.user._id,
        req.body,

        {
            new: true,
            select: '-password -isVerified -isDeleted -resetPassword',
        });
    // This user is not on the app
    if (!updateProfile) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: "failed",
            error: "Invalid credentials",
        });
    }

    res.status(StatusCodes.OK).json({
        status: 'success',
        message: 'You have successfully updated your profile',
        data: updateProfile
    });
};

exports.inviteSchoolAdmin = async (req, res) => {
    const { first_name, last_name, email, position } = req.body

    const school = await Schools.findById(req.user._id)

    if (!school) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: "School not found!" });
    }

    let user = await User.findOne({ email })
    if (user) {
        //  Send Invitation Link
        // Check if user is already in the team
        const existingTeamMember = school.team.some(teamMemberId => {
            return teamMemberId.toString() === user._id.toString();
        });
        if (existingTeamMember) {
            return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({ message: "User is already in the team" });
        }

        // Because user already may have admin details store new invite details seperately.
        user.newInvite = {
            school: school._id,
            schoolAdminDate: Date.now(),
            schoolAdminPermission: position
        }
        const token = await user.generateAuthToken();
        await school_admin_invite("old", first_name, last_name, req.user._id, req.user.schoolName, email, token)
        // Add the new user to the school's team
        school.team.push(user._id);
        await school.save();
        await user.save();
        return res.status(StatusCodes.OK).json({ message: "Admin invite sent successfully!" });
    }
    // Save Admin record
    user = new User({
        first_name,
        last_name,
        email,
        userType: "Educator",
        newInvite: {
            school: req.user._id,
            isSchoolAdmin: true,
            schoolAdminStatus: "Pending",
            schoolAdminPermission: position,
            schoolAdminDate: Date.now(),
        }
    })
    await user.save()
    const token = await user.generateAuthToken();

    // Send Invite
    await school_admin_invite("new", first_name, last_name, req.user._id, req.user.schoolName, email, token)
    school.team.push(user._id);
    await school.save();
    res.status(StatusCodes.OK).json({ message: "Admin invite sent successfully!" });
};

exports.addEmailNotificationadmin = async (req, res) => {
    const school = await Schools.findById(req.user._id)

    if (!school) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: "School not found!" });
    }
    // Check if email already exists in the email_notification array
    const emailExists = school.email_notification.some(user => user.email === req.body.email);

    if (emailExists) {
        return res.status(StatusCodes.CONFLICT).json({ message: "Email already exists in notifications list!" });
    }

    // Add email to email_notification array
    school.email_notification.push(req.body);

    // Save changes
    await school.save();
    res.status(StatusCodes.OK).json({ message: "Admin email notification added successfully!" });
};

exports.courseEnrollment = async (req, res) => {
    const { stdClass, dayOfWeek, startTime, endTime, students } = req.body
    const { id, courseId } = req.params

    const existingEnrollment = await SchoolCourses.findOne({
        course: courseId, // Assuming you have some course ID here
        school: id,
        status: "Active"
    });

    if (existingEnrollment) {
        return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({ message: "School is already enrolled in this course!" })
    }

    // Use Promise.all to fetch course and school simultaneously
    const [course, school] = await Promise.all([
        Courses.findById(courseId),
        Schools.findById(id),
    ]);

    if (!course || !school) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: "School or course not found!" });
    }

    const newEnrollment = new SchoolCourses({
        _id: new mongoose.Types.ObjectId(),
        enrolledBy: req.user._id,
        docModel: req.user.isSchool ? "School" : req.user.isAdmin ? "Admin" : "User",
        course: courseId, // Assuming you have some course ID here
        school: id,
        status: "Active",//Active becos the courses will be deactivated @ end of term
        stdClass,
        dayOfWeek,
        startTime,
        endTime,
        studentEnrollments: []
    })

    // Not relevant comm
    // const uniqueEmails = new Set(students);


    for (const item of students) {

        // toDo: Check if the item.email already exist i.e old parent
        //if exist dont create new parent else create parent info


        //toDo: Check if student already exist e.g new class
        // if exist dont create new else create new and prefill with parentInfo and fullname
        // let user = await User.findOne({ email });


        // ToDo uncomment below

        // if (!user) {

        //     // Create a new user
        //     user = new User({
        //         _id: new mongoose.Types.ObjectId(),
        //         first_name: "N/A",
        //         last_name: "N/A",
        //         email,
        //         userType: "School",
        //         grade: stdClass.substring(0, 3) === "Pri" ? "Primary" : stdClass.substring(0, 3) === "Sec" ? "Secondary" : "Educator",
        //         newCourseInvite: {
        //             school: id,
        //         },
        //     });

        //     // Create a new enrollment
        //     const newStudentEnrollment = new StudentEnrollments({
        //         _id: new mongoose.Types.ObjectId(),
        //         course: courseId, // Assuming you have some course ID here
        //         school: id,
        //         schoolCourseEnrollment: newEnrollment._id,
        //         user: user._id
        //     })

        //     newEnrollment.studentEnrollments.push(newStudentEnrollment._id);
        //     const token = user.generateAuthToken();

        //     await Promise.all([
        //         newStudentEnrollment.save(),
        //         user.save()
        //     ]);
        //     let stdGrade = stdClass.substring(0, 3) === "Pri" ? "Primary" : stdClass.substring(0, 3) === "Sec" ? "Secondary" : "Educator"
        //     // Send email to student
        //     // console.log("new", stdGrade, newStudentEnrollment._id, school.school_name, course.title, email, token)
        //     await school_course_invite("new", stdGrade, newStudentEnrollment._id, school.school_name, course.title, email, token);

        // } else {

        //     // Check if the user is already enrolled in this course
        //     const studentEnrollment = await StudentEnrollments.findOne({

        //         course: courseId, // Assuming you have some course ID here
        //         school: id,
        //         schoolCourseEnrollment: newEnrollment._id,
        //         user: user._id
        //     })

        //     if (!studentEnrollment) {
        //         // Create a new enrollment
        //         const newStudentEnrollment = new StudentEnrollments({
        //             _id: new mongoose.Types.ObjectId(),
        //             course: courseId, // Assuming you have some course ID here
        //             school: id,
        //             schoolCourseEnrollment: newEnrollment._id,
        //             user: user._id
        //         })

        //         newEnrollment.studentEnrollments.push(newStudentEnrollment._id);
        //         const token = user.generateAuthToken();

        //         user.newCourseInvite = { school: id };
        //         await Promise.all([
        //             newStudentEnrollment.save(),
        //             user.save()
        //         ]);
        //         // await school_course_invite("new", stdGrade, newStudentEnrollment._id, school.school_name, course.title, email, token);
        //         let stdGrade = stdClass.substring(0, 3) === "Pri" ? "Primary" : stdClass.substring(0, 3) === "Sec" ? "Secondary" : "Educator"
        //         // Send email to student
        //         await school_course_invite("old", stdGrade, newStudentEnrollment._id, school.school_name, course.title, email, token);
        //     }

        // }
    }

    await newEnrollment.save();

    res.status(StatusCodes.OK).json({ message: "Course enrolled successfully!" });
};

exports.addStudentsToCourseEnrollment = async (req, res) => {
    const { stdClass, students } = req.body
    const { id, enrolledCourseId } = req.params

    const existingEnrollment = await SchoolCourses.findOne({ _id: enrolledCourseId })
        .populate("course", "title")
        .populate("school", "school_name");


    if (!existingEnrollment) {
        return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({ message: "You are not enrolled in this course!" })
    }

    const uniqueEmails = new Set(students);
    for (const email of uniqueEmails) {
        let user = await User.findOne({ email });

        if (!user) {
            // Create a new user
            user = new User({
                _id: new mongoose.Types.ObjectId(),
                first_name: "N/A",
                last_name: "N/A",
                email,
                userType: "School",
                grade: stdClass.substring(0, 3) === "Pri" ? "Primary" : stdClass.substring(0, 3) === "Sec" ? "Secondary" : "Educator",
                newCourseInvite: {
                    school: id,
                },
            });
            // Create a new enrollment
            const newStudentEnrollment = new StudentEnrollments({
                _id: new mongoose.Types.ObjectId(),
                course: existingEnrollment.course._id, // Assuming you have some course ID here
                school: id,
                schoolCourseEnrollment: existingEnrollment._id,
                user: user._id
            })

            existingEnrollment.studentEnrollments.push(newStudentEnrollment._id);
            const token = user.generateInviteToken();

            await Promise.all([
                newStudentEnrollment.save(),
                user.save()
            ]);
            let stdGrade = stdClass.substring(0, 3) === "Pri" ? "Primary" : stdClass.substring(0, 3) === "Sec" ? "Secondary" : "Educator"
            // Send email to student

            await school_course_invite("new", stdGrade, newStudentEnrollment._id, existingEnrollment.school.school_name, existingEnrollment.course.title, email, token);

        } else {
            // Check if the user is already enrolled in this course
            const studentEnrollment = await StudentEnrollments.findOne({

                course: existingEnrollment.course._id, // Assuming you have some course ID here
                school: id,
                schoolCourseEnrollment: existingEnrollment._id,
                user: user._id
            })


            if (!studentEnrollment) {
                // Create a new enrollment
                const newStudentEnrollment = new StudentEnrollments({
                    _id: new mongoose.Types.ObjectId(),
                    course: existingEnrollment.course._id, // Assuming you have some course ID here
                    school: id,
                    schoolCourseEnrollment: existingEnrollment._id,
                    user: user._id
                })

                existingEnrollment.studentEnrollments.push(newStudentEnrollment._id);
                const token = user.generateInviteToken();

                user.newCourseInvite = { school: id };
                await Promise.all([
                    newStudentEnrollment.save(),
                    user.save()
                ]);
                let stdGrade = stdClass.substring(0, 3) === "Pri" ? "Primary" : stdClass.substring(0, 3) === "Sec" ? "Secondary" : "Educator"
                // Send email to student
                await school_course_invite("new", stdGrade, newStudentEnrollment._id, existingEnrollment.school.school_name, existingEnrollment.course.title, email, token);
            }

        }
    }
    await existingEnrollment.save();

    res.status(StatusCodes.OK).json({ message: "Students invited to course successfully!" });
};

exports.removeSchoolAdmin = async (req, res) => {

    // Find the school by ID
    const school = await Schools.findById(req.user._id);
    if (!school) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: "School not found!" });
    }

    // Find the user by ID
    const user = await User.findById(req.params.id);
    if (!user) {
        return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({ message: "User not found" });
    }

    // Remove the user from the school's team
    const teamMembers = school.team.filter(teamMemberId => teamMemberId.toString() !== user._id.toString());
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
    const emailMembers = school.email_notification.filter(emailMember => emailMember._id.toString() !== req.params.id.toString());
    school.email_notification = emailMembers;

    // Save changes concurrently
    await school.save();

    res.status(StatusCodes.OK).json({ message: "School admin removed successfully!" });
};

exports.deactivateAccount = async (req, res) => {

    const { reason } = req.body

    if (!reason || reason.length < 2) return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({ message: "Deactivation reason is required!" });

    // Find the school by ID
    let school = await Schools.findById(req.user._id);

    if (!school) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: "School not found!" });
    }
    school.deletionProperties.reason = reason
    await school.save()
    // Soft delete the account using the plugin method
    await Schools.softDeleteOne({ _id: req.user._id }).exec();;

    res.status(StatusCodes.OK).json({ message: "Account deactivated successfully!" });
};

exports.deleteStudentFromCourseEnrollment = async (req, res) => {
    const { enrolledCourseId, userId, userEnrollmentId } = req.params

    // ToDo: Must not delete student already active on course

    const existingEnrollment = await SchoolCourses.findOne({ _id: enrolledCourseId })
        .populate("course", "title")
        .populate("school", "school_name");


    if (!existingEnrollment) {
        return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({ message: "You are not enrolled in this course!" })
    }


    // Check if the student is enrolled in the course
    const studentIndex = existingEnrollment.studentEnrollments.findIndex(enrollment => enrollment.toString() === userEnrollmentId);


    if (studentIndex === -1) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: "Student not found in this enrollment!" });
    }
    // Remove the student from the enrollment
    existingEnrollment.studentEnrollments.splice(studentIndex, 1);

    // Save the updated enrollment
    await existingEnrollment.save();

    // Find the user and remove the newInvite related to the course
    let user = await User.findById(userId);

    if (user) {
        user.newCourseInvite = null
        await user.save();
    }

    res.status(StatusCodes.OK).json({ message: "User deleted successfully!" });
};
