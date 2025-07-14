import { Request, Response } from "express";
import { User } from "../models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendEmail } from "../services/emailService";
import { Tokens } from "../types";
import { config } from "../config/config";
import { getSignedDownloadUrl } from "../services/storageService";
import { initializeSubscription } from "./stripeController";
import { myEmitter } from "../services/eventEmitter";

export const register = async (req: Request, res: Response): Promise<any> => {
  try {
    const { firstName, lastName, email, password } = req.body;

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }

    user = new User({
      firstName,
      lastName,
      email,
      password,
    });

    const tokens = generateTokens(user._id.toString());

    // Save refresh token to user document
    user.refreshToken = tokens.refreshToken;
    await user.save();

    // Initialize Stripe customer and subscription data
    await initializeSubscription(
      user._id.toString(),
      email,
      `${firstName} ${lastName}`
    );

    myEmitter.emit("new-user", user)

    // Set refresh token as HTTP-only cookie
    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    let uri = user?.profilePicture?.fileName
      ? await getSignedDownloadUrl(
        user!.profilePicture!.fileName || "",
        user!.profilePicture!.fileType || ""
      )
      : "";

    res.json({
      accessToken: tokens.accessToken,
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        profilePicture: uri,
        subscription: user.subscription?.status || null,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const generateTokens = (userId: string): Tokens => {
  const accessToken = jwt.sign({ userId }, config.jwtSecret!, {
    expiresIn: "1d",
  });

  const refreshToken = jwt.sign({ userId }, config.jwtSecret!, {
    expiresIn: "7d",
  });

  return { accessToken, refreshToken };
};

// Update your login function
export const login = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const tokens = generateTokens(user._id.toString());

    // Save refresh token to user document
    user.refreshToken = tokens.refreshToken;
    await user.save();

    // Set refresh token as HTTP-only cookie
    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    let uri = user?.profilePicture?.fileName
      ? await getSignedDownloadUrl(
        user!.profilePicture!.fileName || "",
        user!.profilePicture!.fileType || ""
      )
      : "";

    res.json({
      accessToken: tokens.accessToken,
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        profilePicture: uri,
        subscription: user.subscription?.status || null,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error", error });
  }
};

// refresh token endpoint
export const refreshToken = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token not found" });
    }

    // Verify refresh token
    const decoded = jwt.verify(
      refreshToken,
      config.jwtSecret!
    ) as jwt.JwtPayload;

    // Find user and check if refresh token matches
    const user = await User.findById(decoded.userId);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    // Generate new tokens
    const tokens = generateTokens(user._id.toString());

    // Update refresh token in database
    user.refreshToken = tokens.refreshToken;
    await user.save();

    // Set new refresh token as HTTP-only cookie
    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({ accessToken: tokens.accessToken });
  } catch (error) {
    res.status(401).json({ message: "Invalid refresh token" });
  }
};

// Add logout endpoint
export const logout = async (req: Request, res: Response): Promise<any> => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      // Find user and clear refresh token
      await User.findOneAndUpdate(
        { refreshToken },
        { $set: { refreshToken: null } }
      );
    }

    // Clear refresh token cookie
    res.clearCookie("refreshToken");

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const forgotPassword = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 10); // OTP valid for 10 minutes

    // Save OTP to user document
    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpiry = otpExpiry;
    await user.save();

    // Send OTP via email
    await sendEmail({
      to: email,
      subject: "Password Reset OTP",
      text: `Your OTP for password reset is: ${otp}. This OTP is valid for 10 minutes.`,
    });

    res.json({ message: "OTP sent to your email" });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const verifyOTp = async (req: Request, res: Response): Promise<any> => {
  const { email, otp } = req.body;

  const user = await User.findOne({
    email,
    resetPasswordOTP: otp,
    resetPasswordOTPExpiry: { $gt: new Date() },
  });

  if (!user) {
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }

  return res.status(200).json({ message: "OTP verified" });
};

export const verifyOTPAndResetPassword = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({
      email,
      resetPasswordOTP: otp,
      resetPasswordOTPExpiry: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // console.log(newPassword);

    // Update password and clear OTP fields
    user.password = newPassword;
    user.resetPasswordOTP = "";
    user.resetPasswordOTPExpiry = new Date();
    await user.save();

    res.json({ message: "Password successfully reset" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateUser = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user?.userId; // Assuming user ID is passed as a URL parameter
    const {
      password,
      id,
      resetPasswordOTP,
      resetPasswordOTPExpiry,
      email,
      profilePicture,
      ...updates
    } = req.body;
    // Find the user by ID and update their information
    const user = await User.findByIdAndUpdate(userId, updates, { new: true });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let uri = user?.profilePicture?.fileName
      ? await getSignedDownloadUrl(
        user!.profilePicture!.fileName || "",
        user!.profilePicture!.fileType || ""
      )
      : "";

    res.json({
      message: "User updated successfully",
      user: {
        ...user.toObject(),
        profilePicture: uri,
      },
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const getUser = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user?.userId;

    // Find the user by ID and update their information
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let uri = user?.profilePicture?.fileName
      ? await getSignedDownloadUrl(
        user!.profilePicture!.fileName || "",
        user!.profilePicture!.fileType || ""
      )
      : "";

    // Add subscription info to user data
    const subscriptionInfo = user.subscription
      ? {
        status: user.subscription.status,
        trialEndsAt: user.subscription.trialEndsAt,
        currentPeriodEnd: user.subscription.currentPeriodEnd,
      }
      : null;

    res.json({
      message: "User fetched successfully",
      user: {
        ...user.toObject(),
        profilePicture: uri,
        subscription: subscriptionInfo,
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user?.userId;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    user.isUserDeleted = true;

    user.save();

    res.status(200).json({ message: "User deleted" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const updateProfilePicture = async (
  req: Request & { filesInfo?: any[]; user?: { userId: string } },
  res: Response
): Promise<any> => {
  try {
    const userId = req.user?.userId; // Assuming user ID is passed in the request

    const filesInfo: any = req.filesInfo;

    console.log(filesInfo);

    if (!filesInfo) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Update user profile picture URL in the database
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.profilePicture = filesInfo[0];

    user.save();

    let uri = await getSignedDownloadUrl(
      filesInfo[0]?.fileName,
      filesInfo[0]?.fileType
    );

    res.json({
      message: "Profile picture updated successfully",
      user: {
        ...user.toObject(),
        profilePicture: uri,
      },
    });
  } catch (error) {
    console.error("Update profile picture error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};
