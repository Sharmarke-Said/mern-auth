import bcrypt from "bcryptjs"; // Make sure bcrypt is imported correctly
import jwt from "jsonwebtoken"; // Assuming you're using JWT for token generation
import userModel from "../models/userModel.js"; // Adjust the path if needed
import transporter from "../config/nodemailer.js";
import {
  EMAIL_VERIFY_TEMPLATE,
  PASSWORD_RESET_TEMPLATE,
} from "../config/emailTemplates.js";

export const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.json({
      success: false,
      message: "Missing details!",
    });
  }

  try {
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.json({
        success: false,
        message: "User already exists!",
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10); // Fix here

    // Create and save the new user
    const user = new userModel({
      name,
      email,
      password: hashedPassword,
    });
    await user.save();

    // Create JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // Set cookie with JWT token
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite:
        process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Send the welcome email
    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: email,
      subject: "Welcome to MERN_AUTH App!",
      text: `Welcome to MERN_AUTH App!, your account has been created with email id: ${email} `,
    };

    await transporter.sendMail(mailOptions);

    return res.json({
      success: true,
    });
  } catch (err) {
    return res.json({
      success: false,
      message: err.message,
    });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.json({
      success: false,
      message: "Email and password are required",
    });
  }
  try {
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.json({
        success: false,
        message: "Invalid email",
      });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.json({
        success: false,
        message: "Incorrect password!",
      });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite:
        process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      message: "successfully logged in!",
    });
  } catch (error) {
    res.jsom({
      success: false,
      message: err.message,
    });
  }
};

export const logout = (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite:
        process.env.NODE_ENV === "production" ? "none" : "strict",
    });
    return res.json({ success: true, message: "Logged out" });
  } catch (error) {
    res.json({
      success: false,
      message: error.message,
    });
  }
};

// Send verification OTP to user's email
export const sendVerifyOtp = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await userModel.findById(userId);
    if (user.isAccountVerified) {
      return res.json({
        success: false,
        message: "Account already verified!",
      });
    }

    // OTP verification
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    user.verifyOtp = otp;
    user.verifyOtpExpireAt = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();

    // Send the Verfication email
    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: user.email,
      subject: "Account Verification OTP",
      text: `Your OTP is ${otp}, verify your account with this OTP`,
      html: EMAIL_VERIFY_TEMPLATE.replace("{{otp}}", otp).replace(
        "{{email}}",
        user.email
      ),
    };

    await transporter.sendMail(mailOptions);

    return res.json({
      success: true,
      message: "Verification OTP sent successfully!",
    });
  } catch (error) {
    res.json({
      success: false,
      message: error.message,
    });
  }
};

// Verify user's email using the OTP
export const verifyEmail = async (req, res) => {
  const { userId, otp } = req.body;
  if (!userId || !otp) {
    return res.json({
      success: false,
      message: "Missing Details",
    });
  }

  try {
    const user = await userModel.findById(userId);
    if (!user) {
      return res.json({
        success: false,
        message: "User not found",
      });
    }

    // Check if OTP is valid
    if (user.verifyOtp === "" || user.verifyOtp !== otp) {
      return res.json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // Ensure verifyOtpExpireAt is stored in milliseconds and compare correctly
    if (user.verifyOtpExpireAt < Date.now()) {
      return res.json({
        success: false,
        message: "OTP expired",
      });
    }

    // Update user verification status
    user.isAccountVerified = true;
    user.verifyOtp = "";
    user.verifyOtpExpireAt = 0; // Reset OTP and expiration time
    await user.save();

    return res.json({
      success: true,
      message: "Email verified successfully!",
    });
  } catch (error) {
    res.json({
      success: false,
      message: error.message,
    });
  }
};

// Check if user is authenticated

export const isAuthenticated = (req, res, next) => {
  try {
    return res.json({
      success: true,
      message: "AUthenticated",
    });
  } catch (error) {
    return res.json({
      success: false,
      message: error.message,
    });
  }
};

// Send password reset OTP
export const sendResetOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.json({
      success: false,
      message: "Email is required",
    });
  }
  try {
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.json({
        success: false,
        message: "User not found",
      });
    }
    // OTP verification
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    user.resetOtp = otp;
    user.resetOtpExpireAt = Date.now() + 15 * 60 * 1000;
    await user.save();

    // Send the Verfication email
    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: user.email,
      subject: "Password reset OTP",
      text: `Your OTP for resseting your password is ${otp}, Use this OTP for resetting your password`,
      html: PASSWORD_RESET_TEMPLATE.replace("{{otp}}", otp).replace(
        "{{email}}",
        user.email
      ),
    };

    await transporter.sendMail(mailOptions);

    return res.json({
      success: true,
      message: "OTP sent to your email",
    });
  } catch (error) {
    res.json({
      success: false,
      message: error.message,
    });
  }
};

// Reset password using the OTP
export const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return res.json({
      success: false,
      message: "Email OTP and newPassword are required",
    });
  }
  try {
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.json({
        success: false,
        message: "User not found",
      });
    }
    // Check if OTP is valid
    if (user.resetOtp === "" || user.resetOtp !== otp) {
      return res.json({
        success: false,
        message: "Invalid OTP",
      });
    }
    // Ensure resetOtpExpireAt is stored in milliseconds and compare correctly
    if (user.resetOtpExpireAt < Date.now()) {
      return res.json({
        success: false,
        message: "OTP expired",
      });
    }
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetOtp = "";
    user.resetOtpExpireAt = 0; // Reset OTP and expiration time
    await user.save();

    return res.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    res.json({
      success: false,
      message: error.message,
    });
  }
};
