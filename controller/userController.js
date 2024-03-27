const { User } = require("../models/user");
const OTP = require("../models/OTP");
const StatusCodes = require("../utils/status-codes");
const bcrypt = require("bcrypt");
const _ = require("lodash");
const { Otp_VerifyAccount, Otp_ForgotPassword } = require("../utils/sendmail");
const otpGenerator = require("otp-generator");
const { initiatePaystackPayment } = require("../utils/paystack");
const CourseEnrollment = require("../models/courseEnrollment");



exports.getLoggedUser = async (req, res) => {
    const user = await User.findById(req.user._id)
        .select("-password -isVerified -isDeleted -resetPassword");
    res.status(StatusCodes.OK).json({ user });
}

exports.registerUser = async (req, res) => {
    let user = await User.findOne({ email: req.body.email });

    if (user && user.isVerified) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: "User already registered." });
    }

    if (user && !user.isVerified) {
        const code = otpGenerator.generate(6, {
            lowerCaseAlphabets: true,
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
        await Otp_VerifyAccount(user.email, user.first_name, code);

        return res.status(StatusCodes.OK).json({
            message: "Please enter the code sent to your email.",
            token
        });
    }

    // Handle user registration if not already registered
    const newUser = new User(_.pick(req.body, ["first_name", "last_name", "phone", "email", "gender", "age", "country", "state", "password"]));
    const salt = await bcrypt.genSalt(10);
    newUser.password = await bcrypt.hash(newUser.password, salt);
    await newUser.save();

    const code = otpGenerator.generate(6, {
        lowerCaseAlphabets: true,
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
    await Otp_VerifyAccount(newUser.email, newUser.first_name, code);

    const token = newUser.generateAuthToken();

    res.status(StatusCodes.OK).json({ token });
}

// Verify Account route
exports.verifyAccount = async (req, res) => {
    const { code } = req.body;
    const { _id } = req.user;

    if (!code) return res.status(StatusCodes.BAD_REQUEST).json({ message: "Code is required." });


    const otp = await OTP.findOne({ user: _id, code, type: "RegisterUser" }).populate("user");

    if (!otp) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: "Wrong code or code expired. Please request for a new code." });
    }

    await User.findByIdAndUpdate(_id, { isVerified: true });
    await OTP.deleteMany({ user: otp.user }).exec();

    res.status(StatusCodes.OK).json({ message: "Your account is now verified" });
}


// Login Route
exports.login = async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email, isVerified: true });

    if (!user) return res.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid credentials." });

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) return res.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid credentials." });

    const token = user.generateAuthToken();

    res.status(StatusCodes.OK).json({ token, message: "Login Successful." });
}

// Forgot Password Route
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email, isVerified: true });

    if (!user) return res.status(StatusCodes.BAD_REQUEST).json({ message: "User not found." });

    const code = otpGenerator.generate(6, {
        lowerCaseAlphabets: true,
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
    await Otp_ForgotPassword(user.first_name, user.email, code, token);


    res.status(StatusCodes.OK).json({ message: "Please enter the code sent to your email." });
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

    await User.findByIdAndUpdate(otp.user._id, {
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
    let user = await User.findOne({ email: req.user.email, resetPassword: true }).exec();

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
        status: 'success',
        message: 'You have successfully reset your password',

    });
};

exports.updateProfile = async (req, res) => {

    // Find and update the user's profile
    const updateProfile = await User.findByIdAndUpdate(req.user._id, req.body, {
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

exports.courseEnrollment = async (req, res) => {

    const { first_name, last_name, email, phone, } = req.body;
    let amount = 10000; //Will fix this later
    const enrollment = new CourseEnrollment({
        first_name,
        last_name,
        email,
        phone,
        amount,
        user: req.user._id
    })
    const { data } = await initiatePaystackPayment(amount, email, `${first_name} ${last_name}`, "course._id");

    // If Paystack doesn't initiate payment stop the payment
    if (!data) return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'failed',
        message: 'Operation Failed',
    });

    await enrollment.save();
    return res.status(StatusCodes.CREATED).json({
        status: 'success',
        message: 'Opening Payment Window please do not close the page!',
        data

    })
}


