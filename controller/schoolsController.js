const Schools = require("../models/school");
const OTP = require("../models/OTP");
const StatusCodes = require("../utils/status-codes");
const bcrypt = require("bcrypt");
const _ = require("lodash");
const { Otp_VerifyAccount, Otp_ForgotPassword } = require("../utils/sendmail");
const otpGenerator = require("otp-generator");
// const { initiatePaystackPayment } = require("../utils/paystack");
// const CourseEnrollment = require("../models/courseEnrollment");

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

    // Find and update the user's profile
    const updateProfile = await School.findByIdAndUpdate(req.user._id, req.body, {
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
