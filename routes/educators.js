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
  "/invited-educator",
  auth,
  validate(validateInvitedEducator),
  educatorController.registerInvitedEducator
);

router.get("/courses", auth, educatorController.getCourses);

router.get('/educator', auth, educatorController.getInvitedEducator);

router.post('/invited/admin-educator', auth, educatorController.registerInvitedEducatorAdmin);

router.patch(
  "/profile",
  auth,
  validate(validateEducatorUpdate),
  educatorController.updateProfile
);

router.get("/payments", auth, educatorController.getPayments);



module.exports = router;
