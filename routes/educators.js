const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();
const educatorController = require("../controller/educatorController");
const { loginValidator, validate } = require("../middleware/validate");
const auth = require("../middleware/auth");
const { validateEducator, validateInvitedEducator, validateEducatorUpdate } = require("../models/educators");
// const upload = require("../utils/multer");

router.get("/", async (req, res) => {
  res.json("Hello! welcome to Qwique Educator");
});
router.get("/me", auth, educatorController.getLoggedEducator);

router.post("/register", validate(validateEducator), educatorController.registerEducator);

router.post(
  "/invited-user",
  auth,
  validate(validateInvitedEducator),
  educatorController.registerInvitedEducator
);
router.post('/login', validate(loginValidator), educatorController.login);
// router.post(
//   "/invited-school-admin",
//   auth,
//   validate(validateInvitedEducator),
//   educatorController.registerSchoolInvitedAdmin
// );
router.post('/forgot-password', educatorController.forgotPassword);
// //Verify OTP
router.post('/verify-token', auth, educatorController.verify_otp_forgotPassword)

router.put("/password", auth, educatorController.resetPassword);

router.patch("/verify-account", auth, educatorController.verifyAccount);

router.put(
  "/profile",
  auth,
  validate(validateEducatorUpdate),
  educatorController.updateProfile
);


module.exports = router;
