const Admin = require("../models/admin");
const Schools = require("../models/school");
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
const SchoolCourses = require("../models/schoolCourseEnrollment");
const StudentEnrollments = require("../models/courseEnrollment")
const { User } = require("../models/user");
const { Educator } = require("../models/educators");
const Payment = require("../models/payment");

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
exports.getCurrentAdmin = async (req, res) => {
    // Use findOneAndUpdate with upsert: true to either update or create the document
    const admin = await Admin.findById(req.user._id)
        .select("-password -resetPassword -isDeleted -deletedAt")
        .populate("adminType", "type");
    res.status(StatusCodes.OK).json({ admin });
}

exports.getAdmins = async (req, res) => {
    // Use findOneAndUpdate with upsert: true to either update or create the document
    const admins = await Admin.find({})
        .select("-password -resetPassword -isDeleted -deletedAt")
        .populate("adminType", "type");
    res.status(StatusCodes.OK).json({ admins });
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

exports.changePassword = async (req, res) => {
    const { oldPassword, newPassword } = req.body

    // Only users with valid OTP can reset password. hence resetPassword=true
    let admin = await Admin.findOne({ email: req.user.email }).exec();

    // This user is not on the app
    if (!admin) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: "failed",
            error: "Invalid credentials",
        });
    }

    const validPassword = await bcrypt.compare(oldPassword, admin.password);
    if (!validPassword) return res.status(400).send('Your old password is incorrect!');
    // hash the password
    const hashed_password = await bcrypt.hash(newPassword, 10);

    admin.password = hashed_password;

    await admin.save();
    res.status(StatusCodes.OK).json({
        status: 'success',
        message: 'You have successfully changed your password!',

    });
};

exports.updateProfile = async (req, res) => {

    // Find and update the user's profile
    const updateProfile = await Admin.findByIdAndUpdate(req.user._id, req.body, {
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

exports.deleteAdmin = async (req, res) => {

    // Check if course already exist
    let admin = await Admin.findOne({ _id: req.params.id });

    if (!admin) return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
        message: "Admin does not exist!"
    })


    await Admin.findOneAndDelete({ _id: req.params.id })

    res.status(StatusCodes.OK).json({
        status: 'success',
        message: "Admin Deleted successfully!",
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

    const { title, description, cost, currency, status, grade, access, url } = req.body

    // Check if course already exist
    let course = await Courses.findOne({ title, grade, access });

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
        grade,
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

    const { title, description, cost, currency, status, grade, access, url } = req.body

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
    course.grade = grade
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


    await Courses.softDeleteOne({ _id: req.params.id })

    res.status(StatusCodes.OK).json({
        status: 'success',
        message: "Course Deleted successfully!",
    });
};

exports.getUsers = async (req, res) => {

    const users = await User.find({
        userType: "Individual"
    })
        .select('-password -isVerified -isDeleted -resetPassword');
    res.status(StatusCodes.OK).json({
        status: 'success',
        users
    });
};


exports.getSchools = async (req, res) => {

    const schools = await Schools.find()
    // .select('-password -isVerified -isDeleted -resetPassword');
    res.status(StatusCodes.OK).json({
        status: 'success',
        schools
    });
};

exports.getSingleSchool = async (req, res) => {

    const school = await Schools.findById(req.params.id)
        .select('-password -isVerified -isDeleted -resetPassword')
        .populate("team", "first_name last_name email school schoolAdminStatus schoolAdminPermission schoolAdminDate newInvite");
    res.status(StatusCodes.OK).json({
        status: 'success',
        school
    });
};

exports.getSchoolEnrolledCourses = async (req, res) => {
    const courses = await SchoolCourses.find({ school: req.params.id, status: "Active" })
        .populate("course");

    const filteredCourses = courses.filter(
        (course, index, self) =>
            index === self.findIndex((c) => c.course._id.toString() === course.course._id.toString())
    );

    res.status(StatusCodes.OK).json({ courses: filteredCourses });
};



exports.deleteAdminFromSchool = async (req, res) => {

    const { id, userId } = req.params
    console.log(id, userId)

    const school = await Schools.findById(id)
        .select('-password -isVerified -isDeleted -resetPassword')

    // Check if the student is enrolled in the course
    const userIndex = school.team.findIndex(user => user.toString() === userId);

    if (userIndex === -1) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: "Email not found in this list!" });
    }

    // Remove the student from the enrollment
    school.team.splice(userIndex, 1);

    // Save the updated enrollment
    await school.save();


    res.status(StatusCodes.OK).json({
        status: 'success',
        message: "You have successfully deleted this email from the team."
    });
};

exports.deleteEmailFromSchool = async (req, res) => {

    const { id, emailId } = req.params

    const school = await Schools.findById(id)
        .select('-password -isVerified -isDeleted -resetPassword')

    // Check if the student is enrolled in the course
    const emailIndex = school.email_notification.findIndex(email => email._id.toString() === emailId);

    if (emailIndex === -1) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: "Email not found in this list!" });
    }

    // Remove the student from the enrollment
    school.email_notification.splice(emailIndex, 1);

    // Save the updated enrollment
    await school.save();


    res.status(StatusCodes.OK).json({
        status: 'success',
        message: "You have successfully deleted this email from receiving notification."
    });
};

exports.allGraphData = async (req, res) => {

    // Fetch necessary data from your models
    const totalTeac = await Educator.find({ isVerified: true });
    const totalPupils = await User.find({ isVerified: true });
    const schoolTotal = await Schools.find({ isVerified: true });
    const income = await Payment.find({ status: "Confirmed" });
    const enrollments = await SchoolCourses.find({ status: "Active" })
        .populate("course")
        .populate("school")
        .populate("enrolledBy");

    let totalStudents = totalPupils.length;
    let totalTeachers = totalTeac.length; // From Educators model
    let totalSchools = schoolTotal.length;
    let totalAmount = 0;
    let active = 0;
    let notActive = 0;
    let totalMales = 0;
    let totalFemales = 0;
    let busyDays = {};
    let busyHours = {};
    const courseEngagement = {};
    const locationStats = {};

    // Enrollment data for line graph
    const dataEnrollment = {};

    // Gender analysis from Users model
    totalPupils.forEach(user => {
        if (user.gender === "male") {
            totalMales++;
        } else if (user.gender === "female") {
            totalFemales++;
        }
    });

    // Process each enrollment entry
    for (const enrollment of enrollments) {
        const { enrolledBy, course, status, dayOfWeek, startTime } = enrollment;
        const docModel = enrollment.docModel;

        if (status === "Active") {
            if (docModel === "User") {
                // Count students
                active++;

                // Location stats
                const locationKey = `${enrolledBy.country}-${enrolledBy.state}-${enrolledBy.lga}`;
                locationStats[locationKey] = (locationStats[locationKey] || 0) + 1;

                // Course engagement
                if (course && course.title) {
                    if (dataEnrollment[course.title]) {
                        dataEnrollment[course.title] += 1;
                    } else {
                        dataEnrollment[course.title] = 1;
                    }
                }
            }

            // Busy days (Pie chart)
            busyDays[dayOfWeek] = (busyDays[dayOfWeek] || 0) + 1;

            // Busy hours (Line chart)
            const hour = startTime.split(':')[0]; // Get the hour from startTime
            busyHours[hour] = (busyHours[hour] || 0) + 1;

            // Total income from courses
            if (course && course.cost) {
                totalAmount += course.cost;
            }
        } else {
            notActive++;
        }
    }

    // Prepare data for the charts
    const genderAnalysis = [
        { name: "Male", value: totalMales },
        { name: "Female", value: totalFemales },
    ];

    const courseEngagementArray = Object.keys(dataEnrollment).map((key) => ({
        name: key,
        value: dataEnrollment[key],
    }));

    const locationArray = Object.keys(locationStats).map((key) => ({
        name: key,
        value: locationStats[key],
    }));

    const busyDaysArray = Object.keys(busyDays).map((key) => ({
        name: key,
        value: busyDays[key],
    }));

    const busyHoursArray = Object.keys(busyHours).map((key) => ({
        hour: key,
        value: busyHours[key],
    }));

    // Send the response with calculated values
    res.status(200).json({
        status: "success",
        totalStudents,
        totalTeachers,
        totalSchools,
        totalAmount,
        dataEnrollment,
        genderAnalysis,
        courseEngagement: courseEngagementArray,
        locationStats: locationArray,
        busyDays: busyDaysArray,
        busyHours: busyHoursArray,
    });
};


exports.getPayments = async (req, res) => {
    const payments = await Payment.find({ user: req.user._id }).select(
        "-paymentDetails"
    );
    res.status(StatusCodes.OK).json({ payments });
};

exports.getIndividuals = async (req, res) => {
    const individual = await User.find({ userType: "Individual" });;
    const educator = await Educator.find({userType:"Individual"});

    const combinedUsers = [...individual, ...educator];

    res.status(StatusCodes.OK).json({
        status: 'success',
        users: combinedUsers,
    });
};

exports.getSingleEducator = async (req, res) => {
    const educator = await Educator.findById(req.params.id)
        .select('-password -isVerified -isDeleted -resetPassword')
        .populate("school", "name address")
        .populate("courses", "title description");

    res.status(StatusCodes.OK).json({
        status: 'success',
        educator
    });
};

exports.getSingleUser = async (req, res) => {
    const user = await User.findById(req.params.id)
        .select('-password -isVerified -isDeleted -resetPassword')
        .populate("school", "name address")
        .populate("courses", "title description");
    res.status(StatusCodes.OK).json({
        status: 'success',
        user
    });
};

