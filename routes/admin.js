const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const isAdmin = require("../middleware/isAdmin")
const auth = require("../middleware/auth")
const { inviteAdminValidator, validate, registerAdminValidator, createCourseValidator, validateAdminUpdate, schoolCourseEnrollmentValidator, schoolCourseAddStudentsValidator } = require("../middleware/validate");
const adminController = require("../controller/adminController")
const schoolsController = require("../controller/schoolsController")
const userController = require("../controller/userController")
const upload = require("../utils/multer");
const optionalUpload = require('../utils/optionalUpload');
const checkAdminRole = require('../middleware/checkAdminRole');

router.get('/', async (req, res) => {
    res.json('Hello! welcome to FLOW ADMIN');
})

router.get('/me', auth, isAdmin, adminController.getCurrentAdmin);

router.post('/roles', auth, isAdmin, adminController.createAdminRoles);

router.put('/password', auth, isAdmin, adminController.resetPassword);

router.get('/roles', auth, isAdmin, adminController.getAdminRoles);

router.get('/all', auth, isAdmin, adminController.getAdmins);


router.post('/invitation',
    // auth, 
    // isAdmin, validate(inviteAdminValidator),
    adminController.inviteFlowAdmin);

router.post('/register', auth, isAdmin, validate(registerAdminValidator), adminController.registerFlowAdmin);

router.patch('/verify-account', auth, isAdmin, adminController.verifyAccount);

router.post('/login', validate(registerAdminValidator), adminController.loginFlowAdmin);

router.post('/forgot-password', adminController.forgotPassword);
// //Verify OTP
router.patch('/verify-token', auth, isAdmin, adminController.verify_otp_forgotPassword)


router.patch('/password', auth, isAdmin, adminController.changePassword);

router.put('/profile', auth, isAdmin, validate(validateAdminUpdate), adminController.updateProfile);

router.delete('/:id', [auth, isAdmin, checkAdminRole(["Super-Admin"])], adminController.deleteAdmin);

/********************** Courses Routes *********************/
router.get('/courses', auth, isAdmin, adminController.getCourses);

router.post('/courses', auth, isAdmin, upload.single('image'), validate(createCourseValidator), adminController.createCourses);

router.put('/courses/:id', auth, isAdmin, optionalUpload.single('image'), validate(createCourseValidator), adminController.updateCourses);

router.delete('/courses/:id', auth, isAdmin, adminController.deleteCourse);


/********************** Individual Routes *********************/
router.get('/users', auth, isAdmin, adminController.getUsers);

router.get('/users/:userId', auth, isAdmin, schoolsController.getSingleUser);

router.get('/payments', auth, isAdmin, adminController.getPayments);

router.get("/graph", auth, isAdmin, adminController.allGraphDataAdmin);

router.get('/get-student/:id', auth, isAdmin, adminController.getSingleUser);

router.get('/get-educator/:id', auth, isAdmin, adminController.getSingleEducator);

router.get('/get-individuals', auth, isAdmin, adminController.getIndividuals);

// router.post('/courses', auth, isAdmin, upload.single('image'), validate(createCourseValidator), adminController.createCourses);

// router.put('/courses/:id', auth, isAdmin, optionalUpload.single('image'), validate(createCourseValidator), adminController.updateCourses);

// router.delete('/courses/:id', auth, isAdmin, adminController.deleteCourse);


/********************** Schools Routes *********************/
router.get('/schools', auth, isAdmin, adminController.getSchools);

router.get(
    "/school/graph/:id",
    auth,
    isAdmin,
    adminController.allGraphData
);

router.get(
    "/school/payments/:id",
    auth,
    isAdmin,
    adminController.getPayments
);

router.get('/schools/:id', auth, isAdmin, adminController.getSingleSchool);

router.get('/schools/:id/courses', auth, isAdmin, adminController.getSchoolEnrolledCourses);

router.get('/schools/:id/courses/enrolled/:enrolledCourseId', auth, isAdmin, schoolsController.getSingleEnrolledCourse);

router.get('/schools/:id/users/:userId', auth, isAdmin, schoolsController.getSingleUser);

router.post('/schools/:id/courses/:courseId/enroll', auth, isAdmin, validate(schoolCourseEnrollmentValidator), schoolsController.courseEnrollment);

router.put('/schools/:id/courses/:enrolledCourseId/users', auth, isAdmin, validate(schoolCourseAddStudentsValidator), schoolsController.addStudentsToCourseEnrollment);

router.post('/schools/:id/teams', auth, isAdmin, validate(inviteAdminValidator), adminController.adminInviteSchoolTeamMember);

router.delete('/schools/:id/teams/:userId', auth, isAdmin, adminController.deleteAdminFromSchool);

router.delete('/schools/:id/emails/:emailId', auth, isAdmin, adminController.deleteEmailFromSchool);

router.delete('/schools/:enrolledCourseId/users/:userId/enrollment/:userEnrollmentId', auth, isAdmin, schoolsController.deleteStudentFromCourseEnrollment);

// student routes

router.get('/courses/:id', auth, adminController.getStudentCourses);


router.post(
    "/schools/:schoolId/course-togle/:id",
    auth,
    schoolsController.toggleForCourse
);

router.get(
    "/course-enrollment/:id/get-assesment/:week/:userId",
    auth,
    adminController.getAssessmentData
);


router.get("/course-enrollment/:id/get-activity/:week/:userId", auth, adminController.getactivityData);

// APIS for Getting Other courses Data
router.get("/course-enrollment/:id/:week", auth, userController.getUserCourseData);

router.get("/course-enrollment/:id/percentile", auth, userController.getAssessmentPercentile);

router.patch("/course-enrollment/:id/post-activity/:week/:userId", auth, adminController.activityUpdateData);
router.patch("/course-enrollment/:id/post-assessment/:week/:userId", auth, adminController.assessmentFeedbackUpdate);

// Deactivate a school course and all its confirmed enrollments
router.patch('/school-course/:schoolCourseId/deactivate', auth, isAdmin, schoolsController.deactivateSchoolCourse);


// AI feedback proxy
router.post('/generate-ai-feedback', auth, isAdmin, adminController.generateAIFeedback);

module.exports = router;  