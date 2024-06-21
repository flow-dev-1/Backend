const Admin = require("../models/admin");
const AdminRoles = require("../models/adminRole");
const OTP = require("../models/OTP");
const StatusCodes = require("../utils/status-codes");
const bcrypt = require("bcrypt");
const _ = require("lodash");
const { Otp_VerifyAccount, Otp_ForgotPassword, admin_invite } = require("../utils/sendmail");
const otpGenerator = require("otp-generator");
const CourseEnrollment = require("../models/courseEnrollment");
const cloudinary = require("../utils/cloudinary");
const Courses = require("../models/course");

exports.createAdminRoles = async (req, res) => {
    const { type } = req.body
    // Use findOneAndUpdate with upsert: true to either update or create the document
    const updatedRole = await AdminRoles.findOneAndUpdate(
        { type },
        { type },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(StatusCodes.OK).json({ message: "Role added successfully!", updatedRole });
}

exports.getAdminRoles = async (req, res) => {
    // Use findOneAndUpdate with upsert: true to either update or create the document
    const adminRoles = await AdminRoles.find({});
    res.status(StatusCodes.OK).json({ adminRoles });
}

exports.inviteFlowAdmin = async (req, res) => {
    const { first_name, last_name, email, position } = req.body

    let admin = await Admin.findOne({ email })
    if (admin) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: "Admin with this email already exist!" })
    }
    // Save Admin record
    admin = new Admin({
        first_name,
        last_name,
        email,
        adminType: position
    })
    await admin.save()
    const token = await admin.generateAuthToken();

    // Send Invite
    await admin_invite(first_name, email, token)
    res.status(StatusCodes.OK).json({ message: "Admin invite sent successfully!" });
}

exports.registerFlowAdmin = async (req, res) => {
    const { email, password } = req.body

    let admin = await Admin.findOne({ email, isVerified: false })
    if (!admin) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: "Admin Account not found! Please contact FLOW support." })
    }

    // Update Admin record
    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(password, salt);
    // admin.isVerified = true

    admin = await admin.save()
    const token = await admin.generateAuthToken();

    const code = otpGenerator.generate(6, {
        lowerCaseAlphabets: false,
        upperCaseAlphabets: false,
        specialChars: false,
    });

    const otp = new OTP({
        user: admin._id,
        checkModel: "Admin",
        code: code,
        type: "VerifyAdmin",
        expiresIn: Date.now() + 3600000,
    });

    await otp.save();

    // emit the forgotPassword event with some data
    await Otp_VerifyAccount(admin.email, admin.first_name, code);

    res.status(StatusCodes.OK).json({ message: `Please enter the verification token sent to ${email}!`, token });
}

// Verify Account route
exports.verifyAccount = async (req, res) => {
    const { code } = req.body;
    const { _id } = req.user;

    if (!code) return res.status(StatusCodes.BAD_REQUEST).json({ message: "Code is required." });


    const otp = await OTP.findOne({ user: _id, code, type: "VerifyAdmin" }).populate("user");

    if (!otp) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: "Wrong code or code expired. Please request for a new code." });
    }

    const admin = await Admin.findByIdAndUpdate(_id, { isVerified: true });
    await OTP.deleteMany({ user: otp.user }).exec();

    res.status(StatusCodes.OK).json({ message: "Your account is now verified, please proceed to login!" });
}

exports.loginFlowAdmin = async (req, res) => {
    const { email, password } = req.body

    let admin = await Admin.findOne({ email, isVerified: true })
    if (!admin) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: "Admin Account not found! Please contact FLOW support." })
    }

    const validPassword = await bcrypt.compare(password, admin.password);
    if (!validPassword) return res.status(400).send('Invalid email or password.');


    const token = await admin.generateAuthToken();

    res.status(StatusCodes.OK).json({ message: "Admin Login successful!", token });
}

// Forgot Password Route
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    const admin = await Admin.findOne({ email, isVerified: true });

    if (!admin) return res.status(StatusCodes.BAD_REQUEST).json({ message: "Admin not found." });

    const code = otpGenerator.generate(6, {
        lowerCaseAlphabets: true,
        upperCaseAlphabets: false,
        specialChars: false,
    });

    const otp = new OTP({
        user: admin._id,
        checkModel: "Admin",
        code,
        type: "ForgotPassword",
        expiresIn: Date.now() + 3600000,
    });

    await otp.save();
    const token = await admin.generateAuthToken();
    await Otp_ForgotPassword(admin.first_name, admin.email, code, token);


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

    await Admin.findByIdAndUpdate(otp.user._id, {
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
    let admin = await Admin.findOne({ email: req.user.email, resetPassword: true }).exec();

    // This user is not on the app
    if (!admin) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: "failed",
            error: "Invalid credentials",
        });
    }

    // hash the password
    const hashed_password = await bcrypt.hash(password, 10);

    admin.password = hashed_password;
    admin.resetPassword = false;

    await admin.save();
    res.status(StatusCodes.OK).json({
        status: 'success',
        message: 'You have successfully reset your password',

    });
};


exports.getCourses = async (req, res) => {
    const { type } = req.query
    let courses;

    if (type === "draft") {
        courses = await Courses.find({ status: type })
    } else if (type === "published") {
        courses = await Courses.find({ status: type })
    } else {
        courses = await Courses.find()
    }


    res.status(StatusCodes.OK).json({
        status: 'success',
        courses

    });
};

exports.createCourses = async (req, res) => {

    // Upload course image to cloudinary

    const { title, description, cost, currency, status, access, url } = req.body

    // Check if course already exist
    let course = await Courses.findOne({ title, access });

    if (course) return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
        message: "Course already exist!"
    })
    const result = await cloudinary.uploader.upload(req.file.path);
    // Create course if it does not exist
    course = new Courses({
        createdBy: req.user._id,
        title,
        description,
        cost,
        currency,
        status,
        access,
        url,
        image: result.secure_url
    })

    course = await course.save()

    res.status(StatusCodes.OK).json({
        status: 'success',
        course
    });
};

exports.updateCourses = async (req, res) => {

    // Upload course image to cloudinary

    const { title, description, cost, currency, status, access, url } = req.body

    // Check if course already exist
    let course = await Courses.findOne({ _id: req.params.id });

    if (!course) return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
        message: "Course does not exist!"
    })


    course.title = title
    course.description = description
    course.cost = cost
    course.currency = currency
    course.status = status
    course.access = access
    course.url = url

    if (req.file?.path) {
        const result = await cloudinary.uploader.upload(req.file.path);
        course.image = result.secure_url
    }

    course = await course.save()

    res.status(StatusCodes.OK).json({
        status: 'success',
        message: "Course updated successfully!",
        course
    });
};

exports.deleteCourse = async (req, res) => {

    // Check if course already exist
    let course = await Courses.findOne({ _id: req.params.id });

    if (!course) return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
        message: "Course does not exist!"
    })


    await Courses.findOneAndDelete({ _id: req.params.id })

    res.status(StatusCodes.OK).json({
        status: 'success',
        message: "Course Deleted successfully!",
    });
};