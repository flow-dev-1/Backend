const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  loginValidator,
  validate,
  registerSchoolValidator,
  updateSchoolValidator,
  inviteAdminValidator,
  schoolCourseEnrollmentValidator,
  schoolCourseAddStudentsValidator,
} = require("../middleware/validate");
const schoolsController = require("../controller/schoolsController");
const optionalUpload = require("../utils/optionalUpload");
const schoolAccess = require("../middleware/schoolAccess"); //This middleware allows users with access 2 a school

router.get("/", async (req, res) => {
  res.json("Hello! welcome to FLOW SCHOOLS");
});

router.get("/me", auth, schoolAccess, schoolsController.getCurrentSchool);

router.get("/teachers", auth, schoolAccess, schoolsController.schoolTeachers);

router.get("/courses-active", auth, schoolAccess, schoolsController.schoolCoursesActiveGraph);


router.get(
  "/enrolled-courses",
  auth,
  schoolAccess,
  schoolsController.schoolCoursesEnrollemnt
);

router.get(
  "/enrolled",
  auth,
  schoolAccess,
  schoolsController.schoolEnrolledStudents
);

router.get("/:id", auth, schoolAccess, schoolsController.getSingleSchool);

router.get(
  "/:id/team",
  auth,
  schoolAccess,
  schoolsController.getSchoolAdminTeam
);

router.get(
  "/:id/email-list",
  auth,
  schoolAccess,
  schoolsController.getSchoolEmailTeam
);

router.get("/:id/courses", auth, schoolAccess, schoolsController.getCourses);

router.get(
  "/:id/courses/enrolled/:enrolledCourseId",
  auth,
  schoolAccess,
  schoolsController.getSingleEnrolledCourse
);

router.get(
  "/:id/users/:userId",
  auth,
  schoolAccess,
  schoolsController.getSingleUser
);

router.post(
  "/",
  optionalUpload.single("image"),
  validate(registerSchoolValidator),
  schoolsController.registerSchool
);

router.patch(
  "/verify-account",
  auth,
  schoolAccess,
  schoolsController.verifyAccount
);

router.patch("/password", auth, schoolAccess, schoolsController.changePassword);

router.patch(
  "/profile",
  auth,
  schoolAccess,
  optionalUpload.single("image"),
  validate(updateSchoolValidator),
  schoolsController.updateProfile
);

router.post(
  "/invitation",
  auth,
  validate(inviteAdminValidator),
  schoolsController.inviteSchoolAdmin
);

router.post(
  "/email-notification",
  auth,
  validate(inviteAdminValidator),
  schoolsController.addEmailNotificationadmin
);

router.post(
  "/:id/courses/:courseId/enroll",
  auth,
  schoolAccess,
  validate(schoolCourseEnrollmentValidator),
  schoolsController.courseEnrollment
);

router.put(
  "/:id/courses/:enrolledCourseId/users",
  auth,
  schoolAccess,
  validate(schoolCourseAddStudentsValidator),
  schoolsController.addStudentsToCourseEnrollment
);

router.delete(
  "/teams/:id",
  auth,
  schoolAccess,
  schoolsController.removeSchoolAdmin
);

router.delete(
  "/email-list/:id",
  auth,
  schoolAccess,
  schoolsController.removeEmailAdmin
);

router.put("/", auth, schoolAccess, schoolsController.deactivateAccount);

router.delete(
  "/:enrolledCourseId/users/:userId/enrollment/:userEnrollmentId",
  auth,
  schoolAccess,
  schoolsController.deleteStudentFromCourseEnrollment
);

// router.delete('/:id', [auth, schoolAccess], schoolsController.deleteAdmin);

router.get("/payments", auth, schoolAccess, schoolsController.getPayments);

module.exports = router;
