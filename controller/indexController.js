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

  // Helper function to find a user in the specified model
  const findUser = async (Model, query) => {
    return await Model.findOne(query).select(
      "-isVerified -isDeleted -resetPassword"
    );
  };

  let account;
  let accountType = "";

  // Search for a School by email
  const school = await findUser(Schools, {
    email: usernameOrEmail,
    isVerified: true,
  });

  if (school) {
    account = school;
    accountType = "School";
  } else {
    // Search for an Educator by email if no School was found
    const educator = await findUser(Educator, {
      email: usernameOrEmail,
      isVerified: true,
    });

    if (educator) {
      account = educator;
      accountType = "Educator";
    } else {
      // Search for an Individual user by userId if no School or Educator was found
      const user = await findUser(User, {
        userId: usernameOrEmail,
        isVerified: true,
      });

      if (user) {
        account = user;
        accountType = "Individual";
      }
    }
  }

  // If no account is found, return an error response
  if (!account) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Invalid credentials." });
  }

  // Verify the password
  const validPassword = await bcrypt.compare(password, account.password);
  if (!validPassword) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Invalid credentials." });
  }

  // Generate the auth token
  const token = await account.generateAuthToken();
  const { password: _, ...accountData } = account.toObject();

  // Return the success response
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

  // Helper function to find a user by a specified field in the specified model
  const findUser = async (Model, field) => {
    return await Model.findOne({ [field]: usernameOrEmail, isVerified: true });
  };

  let account = null;
  let accountType = "";

  // Check Individual User by userId
  const user = await findUser(User, "userId");
  if (user) {
    account = user;
    accountType = "User";
  } else {
    // Check Educator by email
    const educator = await findUser(Educator, "email");
    if (educator) {
      account = educator;
      accountType = "Educator";
    } else {
      // Check School by email
      const school = await findUser(Schools, "email");
      if (school) {
        account = school;
        accountType = "School";
      }
    }
  }

  // If no account is found, return an error response
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

  // Create and save the OTP record
  const otp = new OTP({
    user: account._id,
    email: account.email,
    checkModel: accountType,
    code,
    type: "ForgotPassword",
    expiresIn: Date.now() + 3600000, // 1 hour expiration
  });

  await otp.save();

  // Generate authentication token
  const token = account.generateAuthToken();

  // Send OTP email
  await Otp_ForgotPassword(account.fullName, account.email, code, token);

  // Return success response
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

  const findUserByIdAndResetPassword = async (Model, id) => {
    return await Model.findOne({ _id: id });
  };

  const user = await findUserByIdAndResetPassword(User, req.user._id);
  const educator = await findUserByIdAndResetPassword(Educator, req.user._id);
  const schoolAdmin = await findUserByIdAndResetPassword(Schools, req.user._id);

  const account = user || educator || schoolAdmin;
  let accountType = "";

  if (!account) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: "failed",
      error: "Invalid credentials or reset password token expired.",
    });
  }

  if (user) {
    accountType = "User";
  } else if (educator) {
    accountType = "Educator";
  } else if (schoolAdmin) {
    accountType = "School Admin";
  }

  // Hash the new password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Update the account's password and reset the resetPassword flag
  account.password = hashedPassword;
  account.resetPassword = false;

  // Save the updated account
  await account.save();

  // Return a success response
  res.status(StatusCodes.OK).json({
    status: "success",
    message: "Your password has been successfully reset.",
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
