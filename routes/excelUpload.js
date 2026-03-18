const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const StatusCodes = require('../utils/status-codes');

// Multer config for Excel files
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        let ext = path.extname(file.originalname).toLowerCase();
        if (ext !== '.xlsx' && ext !== '.xls') {
            cb(new Error('Only Excel files are allowed'), false);
            return;
        }
        cb(null, true);
    }
});

const XLSX = require('xlsx');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const { User } = require('../models/user');
const { Parents } = require('../models/parentGuardian');
const CourseEnrollment = require('../models/courseEnrollment');
const SchoolCourseEnrollment = require('../models/schoolCourseEnrollment');
const Course = require('../models/course');
const generateId = require('../utils/generateId');

router.post('/', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: 'No file uploaded' });
    }

    try {
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);

        const SCHOOL_ID = "66ea7ff154d898ec66826d3b";
        // const SCHOOL_ID = "66ea00cc54d898ec66826d32";
        const COURSE_ID = "68b601bf6bb8a34106e96e68";
        const STD_CLASS = "Year 9 (JSS 3)";
        const DEFAULT_PHONE = "08012345678";
        const DEFAULT_COUNTRY = "Nigeria";
        const DEFAULT_PASSWORD = "12345678";
        const today = new Date();

        const results = {
            total: data.length,
            created: 0,
            updated: 0,
            errors: []
        };

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, salt);

        // Helper to generate a unique ID
        const usedInBatch = new Set();
        const generateUniqueIdLocal = async () => {
            let attempts = 0;
            while (attempts < 50) {
                const newId = generateId();
                if (usedInBatch.has(newId)) {
                    attempts++;
                    continue;
                }
                const existing = await User.findOne({ userId: newId }).select('userId');
                if (!existing) {
                    usedInBatch.add(newId);
                    return newId;
                }
                attempts++;
            }
            throw new Error("Could not generate a unique User ID after 50 attempts");
        };

        for (const item of data) {

            try {
                const name = (item.name || item.Name || "").trim();
                const email = (item.email || item.Email || "").toLowerCase().trim();
                const genderVal = (item.gender || item.Gender || "M").toUpperCase().trim();
                const gender = genderVal === "F" ? "female" : "male";
                const classTag = item.tag || item.Tag;

                if (!email || !name) {
                    results.errors.push({ name, email, error: "Missing name or email" });
                    continue;
                }

                // 1. User Processing
                let user = await User.findOne({ email });
                if (user) {
                    user.fullName = name;
                    user.password = hashedPassword;
                    user.isVerified = true;
                    user.userType = "School";
                    user.grade = "Secondary";
                    user.phone = DEFAULT_PHONE;
                    user.country = DEFAULT_COUNTRY;
                    user.DOB = today;
                    user.guardianFullName = name;
                    user.school = SCHOOL_ID;
                    user.newCourseInvite = null;
                    user.gender = gender;
                    await user.save();
                    results.updated++;
                } else {
                    const uniqueId = await generateUniqueIdLocal();
                    user = new User({
                        fullName: name,
                        email: email,
                        userId: uniqueId,
                        password: hashedPassword,
                        isVerified: true,
                        userType: "School",
                        grade: "Secondary",
                        phone: DEFAULT_PHONE,
                        country: DEFAULT_COUNTRY,
                        DOB: today,
                        guardianFullName: name,
                        school: SCHOOL_ID,
                        newCourseInvite: null,
                        gender: gender
                    });
                    await user.save();
                    results.created++;
                }

                // 2. Parent Processing
                await Parents.findOneAndUpdate(
                    { email: email },
                    {
                        fullName: name,
                        email: email,
                        phone: DEFAULT_PHONE,
                        country: DEFAULT_COUNTRY,
                        $addToSet: { students: user._id }
                    },
                    { upsert: true, new: true, strict: false }
                );

                // 3. SchoolCourseEnrollment Lookup
                const schoolEnrollment = await SchoolCourseEnrollment.findOne({
                    school: SCHOOL_ID,
                    course: COURSE_ID,
                    stdClass: STD_CLASS,
                    classTag: classTag
                });

                // 4. Enrollment Processing
                let enrollment = await CourseEnrollment.findOne({
                    user: user._id,
                    course: COURSE_ID
                });

                if (enrollment) {
                    enrollment.status = "Confirmed";
                    enrollment.school = SCHOOL_ID;
                    enrollment.stdClass = STD_CLASS;
                    enrollment.classTag = classTag;
                    enrollment.schoolCourseEnrollment = schoolEnrollment?._id || enrollment.schoolCourseEnrollment;
                    await enrollment.save();
                } else {
                    enrollment = new CourseEnrollment({
                        user: user._id,
                        course: COURSE_ID,
                        school: SCHOOL_ID,
                        status: "Confirmed",
                        stdClass: STD_CLASS,
                        classTag: classTag,
                        schoolCourseEnrollment: schoolEnrollment?._id,
                        checkModel: "User"
                    });
                    await enrollment.save();
                }

                // 5. Sync Links
                if (schoolEnrollment) {
                    await SchoolCourseEnrollment.findByIdAndUpdate(schoolEnrollment._id, {
                        $addToSet: { studentEnrollments: enrollment._id }
                    });
                }

                await Course.findByIdAndUpdate(COURSE_ID, {
                    $addToSet: { courseEnrollment: enrollment._id }
                });

            } catch (err) {
                results.errors.push({ item, error: err.message });
            }
        }

        res.status(StatusCodes.OK).json({
            message: 'Excel data processed successfully',
            summary: results
        });
    } catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: 'Error processing Excel file',
            error: error.message
        });
    }
});

module.exports = router;
