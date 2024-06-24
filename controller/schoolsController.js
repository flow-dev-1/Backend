const Schools = require("../models/school");
const OTP = require("../models/OTP");
const StatusCodes = require("../utils/status-codes");
const bcrypt = require("bcrypt");
const _ = require("lodash");
const { Otp_VerifyAccount, Otp_ForgotPassword, school_admin_invite } = require("../utils/sendmail");
const otpGenerator = require("otp-generator");
// const { initiatePaystackPayment } = require("../utils/paystack");
// const CourseEnrollment = require("../models/courseEnrollment");
const cloudinary = require("../utils/cloudinary");
const { User } = require("../models/user");
const school = require("../models/school");
const Courses = require("../models/course")
const SchoolCourses = require("../models/schoolCourseEnrollment")

exports.getCurrentSchool = async (req, res) => {

    let school = await Schools.findOne({ _id: req.user._id })
        .select('-password -isVerified -isDeleted -resetPassword');


    res.status(StatusCodes.OK).json({ school });
}

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


exports.registerSchool = async (req, res) => {
    const { email, contact_name, school_name, password, grade, phone, country, state, lga, address } = req.body
    let school = await Schools.findOne({ email, school_name, grade });

    if (school && school.isVerified) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: "School already registered." });
    }

    if (school && !school.isVerified) {
        const code = otpGenerator.generate(6, {
            lowerCaseAlphabets: true,
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
            token
        });
    }

    // Handle School registration if not already registered
    school = new Schools({
        school_name,
        contact_name,
        email,
        grade,
        phone,
        country,
        state,
        lga,
        address

    });
    const salt = await bcrypt.genSalt(10);
    school.password = await bcrypt.hash(password, salt);
    await school.save();

    const code = otpGenerator.generate(6, {
        lowerCaseAlphabets: true,
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

    await otp.save();
    await Otp_VerifyAccount(school.email, school.school_name, code);

    const token = school.generateAuthToken();

    res.status(StatusCodes.OK).json({ message: `Enter OTP sent to ${email} to verify your account.`, token });
}

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
    if (!school) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: "School Account not found! Please contact FLOW support." })
    }

    const validPassword = await bcrypt.compare(password, school.password);
    if (!validPassword) return res.status(400).send('Invalid email or password.');


    const token = await school.generateAuthToken();

    res.status(StatusCodes.OK).json({ message: "School Login successful!", token });
}


// Forgot Password Route
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    const school = await Schools.findOne({ email, isVerified: true });

    if (!school) return res.status(StatusCodes.BAD_REQUEST).json({ message: "School not found." });

    const code = otpGenerator.generate(6, {
        lowerCaseAlphabets: true,
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
        const existingTeamMember = school.team.some(teamMemberId => teamMemberId.toString() === req.user._id.toString());
        if (existingTeamMember) {
            return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({ message: "User is already in the team" });
        }

        // Because user already may have admin details store new invite details seperately.
        user.newInvite = {
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
        return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({ message: "You are already enrolled in this course!" })
    }

    const newEnrollment = new SchoolCourses({
        course: courseId, // Assuming you have some course ID here
        school: id,
        status: "Active",
        stdClass,
        dayOfWeek,
        startTime,
        endTime,
        students: []
    })

    const uniqueEmails = new Set(students);
    Array.from(uniqueEmails).map(async (email) => {
        let user = await User.findOne({ email });

        if (!user) {
            user = new User({
                first_name: "N/A",
                last_name: "N/A",
                email,
                userType: stdClass === "Educator" ? "Educator" : "Student",
                newInvite: {
                    school: id,
                }
            });
            await user.save();
        } else {
            user.newInvite = { school: id };
            await user.save();
        }

        newEnrollment.students.push(user._id);
    });

    await newEnrollment.save();


    res.status(StatusCodes.OK).json({ message: "Course enrolled successfully!" });
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
    if (!reason || reason.length < 2) return res.status(StatusCodes.NOT_FOUND).json({ message: "Deactivation reason is required!" });

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