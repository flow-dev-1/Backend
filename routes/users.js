const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const userController = require("../controller/userController");
const { loginValidator,courseSubmissionValidator, validate, } = require("../middleware/validate");
const { validateUser, validateUserUpdate, validateInvitedUser } = require('../models/user');
const auth = require("../middleware/auth")
// const upload = require("../utils/multer");

router.get('/', async (req, res) => {
  res.json('Hello! welcome to Qwique User');
})
router.get('/me', auth, userController.getLoggedUser);

router.get('/single-user/:id', auth, userController.getLoggedUser);

router.get('/parent', auth, userController.getParentWithNewCourseInvite);

router.get('/courses', auth, userController.getCourses);

router.get('/courses/:id/completed', auth, userController.getCompletedWeeks);

router.get('/payments', auth, userController.getPayments);

router.post('/register', validate(validateUser), userController.registerUser);

router.post('/invited-user', validate(validateInvitedUser), userController.registerInvitedUser);


// toDo: Update the invited school admin validator
router.post('/invited-school-admin', auth, validate(validateInvitedUser), userController.registerSchoolInvitedAdmin);

router.patch('/profile', auth, validate(validateUserUpdate), userController.updateProfile);

router.post('/courses/:id/enroll', auth, userController.courseEnrollment);

// End of course feedback. Likes or dislikes
router.put("/courses/:id/reaction", auth, userController.activityData);

/********************************These APIs work for Self Awarenes course alone until they are modifed to use the general APIs. Find General once Below these ************/

router.put("/course-enrollment/:id/activity", auth, userController.activityData);
router.post(
  "/course-enrollment/:id/assesment",
  auth,
  userController.assessmentData
);
router.get(
  "/course-enrollment/:id/get-assesment/:week",
  auth,
  userController.getAssessmentData
);

router.get("/course-enrollment/:id/get-activity/:week", auth, userController.getactivityData);

// ***********************************************************************************************************************************/

// APIS for Getting Other courses
router.get("/course-enrollment/:id/:week", auth, userController.getUserCourseData);

// APIS for updating student course Activities and Assessment
router.post("/course/submission", auth, validate(courseSubmissionValidator), userController.submitUserCourseData);
module.exports = router; 