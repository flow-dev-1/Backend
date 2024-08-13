const { Educator } = require("../models/educators");
const { Admin } = require("../models/admin");
const OTP = require("../models/OTP");
const { User } = require("../models/user");
const StatusCodes = require("../utils/status-codes");
const Schools = require("../models/school");
const bcrypt = require("bcrypt");
const _ = require("lodash");
const { Otp_ForgotPassword } = require("../utils/sendmail");
const otpGenerator = require("otp-generator");
const Counter = require("../models/counter");
// Login Route
exports.login = async (req, res) => {
  const { usernameOrEmail, password } = req.body;
  const findUser = async (Model, query) => {
    return await Model.findOne(query).select(
      "-isVerified -isDeleted -resetPassword"
    );
  };
  let user = await findUser(User, {
    userId: usernameOrEmail,
    isVerified: true,
  });
  let educator = await findUser(Educator, {
    $or: [{ email: usernameOrEmail }, { userId: usernameOrEmail }],
    isVerified: true,
  });
  let school = await findUser(Schools, {
    $or: [{ email: usernameOrEmail }, { userId: usernameOrEmail }],
    isVerified: true,
  });
  let account = user || educator || school;
  let accountType = "";
  if (user) {
    accountType = "Individual";
  } else if (educator) {
    accountType = "Educator";
  } else if (school) {
    accountType = "School";
  }
  if (!account) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Invalid credentials." });
  }
  const validPassword = await bcrypt.compare(password, account.password);
  if (!validPassword) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Invalid credentials." });
  }
  const token = await account.generateAuthToken();
  const { password: _, ...accountData } = account.toObject();
  return res.status(StatusCodes.OK).json({
    accountType,
    message: `${accountType} Login successful!`,
    token,
    user: accountData,
  });
};


// Forgot Password Route
exports.forgotPassword = async (req, res) => {
  const { usernameOrEmail } = req.body;

  const findUserByUsernameOrEmail = async (Model, field) => {
    return await Model.findOne({ [field]: usernameOrEmail, isVerified: true });
  };

  let user = await findUserByUsernameOrEmail(User, "userId");

  // Check Educator and School by usernameOrEmail as email
  let educator = await findUserByUsernameOrEmail(Educator, "email");
  let school = await findUserByUsernameOrEmail(Schools, "email");

  let account = user || educator || school;
  let accountType = "";

  if (user) {
    accountType = "User";
  } else if (educator) {
    accountType = "Educator";
  } else if (school) {
    accountType = "School";
  }

  if (!account) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "User not found." });
  }

  // Generate OTP
  const code = otpGenerator.generate(6, {
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  });

  const otp = new OTP({
    user: account._id,
    email: account.email,
    checkModel: accountType,
    code,
    type: "ForgotPassword",
    expiresIn: Date.now() + 3600000,
  });

  await otp.save();

  const token = account.generateAuthToken();

  await Otp_ForgotPassword(account.fullName, account.email, code, token);

  res.status(StatusCodes.OK).json({
    message: "Please enter the code sent to your email.",
  });
};


exports.verify_otp_forgotPassword = async (req, res) => {
  const { code } = req.body;

  if (!code)
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Code is required." });

  //check otp code
  const otp = await OTP.findOne({ code }).exec();

  if (otp === null) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: "failed",
      error: "Invalid OTP Token",
    });
  }

  if (otp.user.toString() !== req.user._id) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: "failed",
      message: "Invalid User Credentials",
    });
  }

  // Check if the otp has expired
  const otp_valid = otp.expiresIn > Date.now();
  //  < Date.now();
  if (!otp_valid) {
    // delete otp code
    await OTP.findOneAndDelete({ code }).exec();
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: "failed",
      message: "Invalid or Expired Token.",
    });
  }

  // delete otp code
  await OTP.deleteMany({ user: otp.user }).exec();

  await User.findByIdAndUpdate(
    otp.user._id,
    {
      resetPassword: true,
    },
    {
      new: true,
    }
  );

  return res.status(StatusCodes.OK).json({
    status: "success",
    message: "OTP verified, You can now reset Password",
  });
};

exports.resetPassword = async (req, res) => {
  const { password } = req.body;

  // Only users with a valid OTP can reset the password, hence resetPassword=true
  const findUserByEmailAndResetPassword = async (Model, id) => {
    return await Model.findOne({
      id: id,
      resetPassword: true,
    }).exec();
  };

  let user = await findUserByEmailAndResetPassword(User, req.user._id);
  let educator = await findUserByEmailAndResetPassword(
    Educator,
    req.user._id
  );
  let schoolAdmin = await findUserByEmailAndResetPassword(
    Schools,
    req.user._id
  );

  let account = user || educator || schoolAdmin;
  let accountType = "";

  if (!account) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: "failed",
      error: "Invalid credentials",
    });
  }

  // Determine the type of account
  if (user) {
    accountType = "User";
  } else if (educator) {
    accountType = "Educator";
  } else if (schoolAdmin) {
    accountType = "School Admin";
  }

  // Hash the new password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Update the password and resetPassword flag for the account
  account.password = hashedPassword;
  account.resetPassword = false;

  // Save the updated account
  await account.save();

  // Return success response
  res.status(StatusCodes.OK).json({
    status: "success",
    message: "You have successfully reset your password",
    accountType: accountType,
  });
};

exports.generateUserId = async (req, res) => {
  const generateId = () => {
    const randomNum = Math.floor(Math.random() * 9999) + 1;
    const paddedNum = randomNum.toString().padStart(3, "0");

    return `FLS${paddedNum}`;
  };

  const userId = generateId();

  res.status(StatusCodes.OK).json({
    status: "success",
    message: "successfully created the id",
    userId,
  });
};

// Verify Account route
exports.verifyAccount = async (req, res) => {
  const { code } = req.body;
  const { email } = req.user;

  if (!code) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Code is required." });
  }

  // Find the OTP entry that matches the provided code, email, and type
const otp = await OTP.findOne({
  code,
});


  if (!otp) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: "Wrong code or code expired. Please request a new code.",
    });
  }

  // Determine which model the OTP is associated with
  let model;
  switch (otp.checkModel) {
    case "User":
      model = User;
      break;
    case "Educator":
      model = Educator;
      break;
    case "School":
      model = Schools;
      break;
    default:
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Invalid account type.",
      });
  }

  // Update the isVerified status for the account
  await model.updateMany({ email }, { isVerified: true });

  // Delete the OTP entry once the account is verified
  await OTP.deleteMany({ email, type: otp.type }).exec();

  res.status(StatusCodes.OK).json({ message: "Your account is now verified" });
};
