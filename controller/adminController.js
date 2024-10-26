const Admin = require("../models/admin");
const Schools = require("../models/school");
const AdminRoles = require("../models/adminRole");
const OTP = require("../models/OTP");
const StatusCodes = require("../utils/status-codes");
const bcrypt = require("bcrypt");
const _ = require("lodash");
const { Otp_VerifyAccount, Otp_ForgotPassword, admin_invite, Admin_Otp_ForgotPassword } = require("../utils/sendmail");
const otpGenerator = require("otp-generator");
const CourseEnrollment = require("../models/courseEnrollment");
const cloudinary = require("../utils/cloudinary");
const Courses = require("../models/course");
const SchoolCourses = require("../models/schoolCourseEnrollment");
const StudentEnrollments = require("../models/courseEnrollment")
const { User } = require("../models/user");
const { Educator } = require("../models/educators");
const Payment = require("../models/payment");
const Activity = require("../models/activity");
const Assesment = require("../models/assessment.model");
const { Parents } = require("../models/parentGuardian");

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
    await Admin_Otp_ForgotPassword(admin.first_name, admin.email, code, token);


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
        .populate("team");
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

exports.allGraphDataAdmin = async (req, res) => {
    const totalTeac = await Educator.find({ isVerified: true });
    const totalPupils = await User.find({ isVerified: true });
    const schoolTotal = await Schools.find({ isVerified: true });
    const courseActivities = await StudentEnrollments.find();
    const Outstanding = await Payment.find({ user: req.user._id });
    const CourseTotal = await Courses.find();
    const income = await Payment.find({ status: "Confirmed" });
    const enrollments = await SchoolCourses.find({ status: "Active" })
        .populate("course")
        .populate("school")
        .populate("enrolledBy");

    let totalStudents = totalPupils.length;
    let totalTeachers = totalTeac.length;
    let totalSchools = schoolTotal.length;

    // Calculate totalAmount from Outstanding payments
    let totalAmount = 0;
    if (Outstanding.length > 0) {
        totalAmount = Outstanding.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    }

    let totalOutstanding = 0;
    let active = 0;
    let notActive = 0;
    let totalMales = 0;
    let totalFemales = 0;
    let busyDays = {};
    let busyHours = {};
    const dataEnrollment = {};
    const locationStats = {};

    const daysOfWeek = ['Mon', 'Tues', 'Wed', 'Thurs', 'Fri'];

    const studentCountByDay = {
        Mon: 0,
        Tues: 0,
        Wed: 0,
        Thurs: 0,
        Fri: 0,
    };

    courseActivities.forEach((activity) => {
        const dayMapping = {
            Monday: 'Mon',
            Tuesday: 'Tues',
            Wednesday: 'Wed',
            Thursday: 'Thurs',
            Friday: 'Fri',
        };
        const dayAbbreviation = dayMapping[activity.dayOfWeek];
        if (daysOfWeek.includes(dayAbbreviation)) {
            studentCountByDay[dayAbbreviation] += activity.studentEnrollments.length;
        }
    });

    const studentEnrollmentByDay = daysOfWeek.map((day) => ({
        name: day,
        students: studentCountByDay[day],
    }));

    totalPupils.forEach(user => {
        if (user.gender === "male") {
            totalMales++;
        } else if (user.gender === "female") {
            totalFemales++;
        }
    });

    schoolTotal.forEach((school) => {
        const { lga } = school;
        if (lga) {
            locationStats[lga] = (locationStats[lga] || 0) + 1;
        }
    });

    for (const enrollment of enrollments) {
        const { enrolledBy, course, status, dayOfWeek, startTime } = enrollment;
        const docModel = enrollment.docModel;

        if (status === "Active") {
            if (docModel === "User") {
                active++;
                if (course && course.title) {
                    dataEnrollment[course.title] = (dataEnrollment[course.title] || 0) + 1;
                }
            }

            busyDays[dayOfWeek] = (busyDays[dayOfWeek] || 0) + 1;

            const hour = parseInt(startTime.split(':')[0], 10);
            let period = 'AM';
            let formattedHour = hour;

            if (hour === 0) {
                formattedHour = 12;
            } else if (hour === 12) {
                period = 'PM';
            } else if (hour > 12) {
                formattedHour = hour - 12;
                period = 'PM';
            }

            const hourKey = `${formattedHour} ${period}`;
            busyHours[hourKey] = (busyHours[hourKey] || 0) + 1;

            if (course && course.cost) {
                totalOutstanding += course.cost;
            }
        } else {
            notActive++;
        }
    }

    const genderAnalysis = [
        { name: "Male", value: totalMales },
        { name: "Female", value: totalFemales },
    ];

    const courseEngagementArray = CourseTotal.map((course) => ({
        name: course.title,
        students: course.courseEnrollment.length,
    }));

    const locationArray = Object.keys(locationStats).map((key) => ({
        name: key,
        students: locationStats[key],
    }));

    const busyDaysArray = Object.keys(busyDays).map((key) => ({
        name: key,
        value: busyDays[key],
    }));

    const busyHoursArray = Object.keys(busyHours)
        .map((key) => ({
            name: key,
            students: busyHours[key],
        }))
        .sort((a, b) => timeTo24Hour(a.name) - timeTo24Hour(b.name));

    function timeTo24Hour(timeStr) {
        const [hour, period] = timeStr.split(' ');
        let hourNumber = parseInt(hour, 10);

        if (period === 'PM' && hourNumber !== 12) {
            hourNumber += 12;
        } else if (period === 'AM' && hourNumber === 12) {
            hourNumber = 0;
        }

        return hourNumber;
    }

    res.status(200).json({
        status: "success",
        totalStudents,
        totalTeachers,
        totalSchools,
        totalAmount,
        income,
        totalOutstanding,
        genderAnalysis,
        courseEngagement: courseEngagementArray,
        courseActivity: studentEnrollmentByDay,
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
    const educator = await Educator.find({ userType: "Individual" });

    const combinedUsers = [...individual, ...educator];

    res.status(StatusCodes.OK).json({
        status: 'success',
        users: combinedUsers,
    });
};

exports.getSingleEducator = async (req, res) => {
    const educator = await Educator.findById(req.params.id)
        .select('-password -isVerified -isDeleted -resetPassword')
        .populate({
            path: 'newCourseInvite',
            populate: {
                path: 'school',
                model: 'School',
                select: "school_name"
            }
        });

    res.status(StatusCodes.OK).json({
        status: 'success',
        educator
    });
};

exports.getSingleUser = async (req, res) => {
    const userId = req.params.id
    const user = await User.findById(userId)
    .select("-password -isDeleted -resetPassword")
    .populate({
      path: 'school',
      model: 'School',
      select: "school_name lga"
    });

  if (!user.phone || !user.lga) {
    const parentData = await Parents.findOne({ email: user.email });
    user.country = parentData.country
    user.lga = parentData.lga
    user.phone = parentData.phone
    user.state = parentData.state

    await user.save()
  }

    res.status(StatusCodes.OK).json({
        status: 'success',
        user
    });
};


exports.allGraphData = async (req, res) => {
    const school = req.params.id;
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
        totalAmount,
        // userAmount,
        dataEnrollment: dataEnrollmentArray,
        validGraphData: graphData,
    });
};

exports.getPayments = async (req, res) => {
    const payments = await Payment.find({ user: req.params.id }).select(
        "-paymentDetails"
    );
    res.status(StatusCodes.OK).json({ payments });
};

exports.getStudentCourses = async (req, res) => {
    let { type } = req.query;
    let courses;

    if (type === "Enrolled") {
        courses = await CourseEnrollment.find({
            user: req.params.id,
            status: "Confirmed",
        })
            .populate("course")
            .populate("schoolCourseEnrollment");

        for (let courseEnrollment of courses) {
            let courseId = courseEnrollment.course._id;
            let user = req.params.id
            let courseProgress = await Activity.find({
                user,
                courseEnrollment: courseId,
            });

            let progressPercentage = (courseProgress.length / 5) * 100;
            courseEnrollment.progress = progressPercentage;
        }
    }
    res.status(StatusCodes.OK).json({ courses });
};

// Get Activity Data
exports.getactivityData = async (req, res) => {
    const { id, week } = req.params;
    const user = req.params.userId;

    const activity = await Activity.findOne({
        courseEnrollment: id,
        user,
        week
    });

    if (!activity) {
        return res.status(StatusCodes.NOT_FOUND).json({
            status: "failed",
            message: "No activity for this student"
        });
    }

    res.status(StatusCodes.OK).json({ activity });
};

// Get Assessment Data
exports.getAssessmentData = async (req, res) => {
    const { week, id } = req.params;
    const user = req.params.userId;

    const existingAssessment = await Assesment.findOne({
        user,
        courseEnrollment: id,
        week
    });

    if (existingAssessment) {
        return res.status(StatusCodes.OK).json({ existingAssessment });
    }

    // Return 404 if no assessment found
    res.status(StatusCodes.NOT_FOUND).json({
        status: "failed",
        message: "No assessment found for the given criteria"
    });
};

exports.activityUpdateData = async (req, res) => {
    const { id, week } = req.params;
    const user = req.params.userId;

    const activity = await Activity.findOne({ courseEnrollment: id, week, user });

    if (!activity) {
        return res.status(StatusCodes.NOT_FOUND).json({
            status: "failed",
            message: "No activity found for the given criteria"
        });
    }

    // Update the activity's activities field
    await Activity.updateOne({ _id: activity._id }, req.body);

    // Respond with success after updating
    return res.status(StatusCodes.OK).json({
        success: "true",
        message: "Activity data has been updated successfully."
    });
};

