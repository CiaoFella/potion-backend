import { Request, Response } from 'express';
import { User } from '../models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendEmail } from '../services/emailService';
import { Tokens } from '../types';
import { config } from '../config/config';
import { getSignedDownloadUrl } from '../services/storageService';

import crypto from 'crypto';
import { reactEmailService } from '../services/reactEmailService';
import type { PasswordSetupProps } from '../templates/react-email/password-setup';

export const generateTokens = (userId: string): Tokens => {
  const accessToken = jwt.sign({ userId }, config.jwtSecret!, {
    expiresIn: '1d',
  });

  const refreshToken = jwt.sign({ userId }, config.jwtSecret!, {
    expiresIn: '7d',
  });

  return { accessToken, refreshToken };
};

export const setupPassword = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Validate input
    if (!password || password.length < 8) {
      return res
        .status(400)
        .json({ message: 'Password must be at least 8 characters long' });
    }

    // Find user with valid token (allow both password setup and password reset)
    const user = await User.findOne({
      passwordSetupToken: token,
      passwordSetupTokenExpiry: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        message:
          'Invalid or expired token. Please request a new password setup link.',
        expired: true,
      });
    }

    // Set password and clear setup token
    user.password = password;
    user.isPasswordSet = true;
    user.passwordSetupToken = undefined;
    user.passwordSetupTokenExpiry = undefined;
    await user.save();

    // Generate login tokens
    const tokens = generateTokens(user._id.toString());
    user.refreshToken = tokens.refreshToken;
    await user.save();

    // Set refresh token cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Get profile picture URL if exists
    let uri = user?.profilePicture?.fileName
      ? await getSignedDownloadUrl(
          user!.profilePicture!.fileName || '',
          user!.profilePicture!.fileType || '',
        )
      : '';

    res.json({
      accessToken: tokens.accessToken,
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        profilePicture: uri,
        subscription: user.subscription?.status || null,
      },
      message: 'Password set successfully',
    });
  } catch (error) {
    console.error('Setup password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Check if token is valid (for frontend validation)
export const validatePasswordToken = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      passwordSetupToken: token,
      passwordSetupTokenExpiry: { $gt: new Date() },
    }).select('firstName lastName email isPasswordSet');

    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired token',
        expired: true,
      });
    }

    res.json({
      valid: true,
      isPasswordReset: user.isPasswordSet, // true if user already has password (reset), false if new setup
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Validate password token error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Resend password setup email
export const resendPasswordSetup = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Determine if this is password setup or reset
    const isPasswordReset = user.isPasswordSet && user.password;

    // Generate new token
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    user.passwordSetupToken = token;
    user.passwordSetupTokenExpiry = expiry;
    await user.save();

    // Send new setup/reset email using React Email
    try {
      const setupUrl = `${config.frontURL}/setup-password/${token}`;

      const props: PasswordSetupProps = {
        firstName: user.firstName,
        setupUrl,
        trialDays: 7,
        monthlyPrice: 29,
        tokenExpiry: '48 hours',
      };

      const { subject, html } = await reactEmailService.renderTemplate(
        'password-setup',
        props,
      );

      await sendEmail({
        to: email,
        subject,
        html,
      });
    } catch (templateError) {
      // Fallback to React Email fallback template
      console.error('Template error, using fallback:', templateError);
      const setupUrl = `${config.frontURL}/setup-password/${token}`;
      const actionText = isPasswordReset ? 'Reset Password' : 'Set Up Password';
      const subjectText = isPasswordReset
        ? 'Reset your Potion password'
        : 'Set up your Potion password';
      const messageBody = isPasswordReset
        ? "Here's your password reset link:"
        : "Here's your password setup link:";

      try {
        const fallbackProps = {
          firstName: user.firstName,
          subject: subjectText,
          actionUrl: setupUrl,
          actionText,
          messageBody,
          tokenExpiry: '48 hours',
        };

        const { subject: fallbackSubject, html: fallbackHtml } =
          await reactEmailService.renderTemplate(
            'email-fallback',
            fallbackProps,
          );

        await sendEmail({
          to: email,
          subject: fallbackSubject,
          html: fallbackHtml,
        });
      } catch (fallbackError) {
        console.error('Fallback template also failed', fallbackError);
      }
    }

    res.json({
      message: isPasswordReset
        ? 'Password reset email sent'
        : 'Password setup email sent',
    });
  } catch (error) {
    console.error('Resend password setup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Google authentication check and login
export const googleCheck = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    const { email, googleId, name } = req.body;

    if (!email || !googleId) {
      return res
        .status(400)
        .json({ message: 'Email and Google ID are required' });
    }

    // Check if user exists (by email or googleId)
    let user = await User.findOne({
      $or: [{ email }, { googleId }],
    });

    if (user) {
      // User exists - log them in

      // If user exists but doesn't have Google auth set up, link the Google account
      if (!user.googleId) {
        user.googleId = googleId;
        // Keep the original authProvider - don't change it
        // This allows users to have both email/password AND Google auth
        await user.save();
      }

      // Generate tokens for existing user
      const tokens = generateTokens(user._id.toString());

      // Update refresh token
      user.refreshToken = tokens.refreshToken;
      await user.save();

      // Get profile picture URL if available
      let uri = user?.profilePicture?.fileName
        ? await getSignedDownloadUrl(
            user.profilePicture.fileName,
            user.profilePicture.fileType || '',
          )
        : '';

      res.json({
        userExists: true,
        accessToken: tokens.accessToken,
        user: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          profilePicture: uri,
          subscription: user.subscription?.status || null,
        },
      });
    } else {
      // User doesn't exist - they need to sign up
      res.json({
        userExists: false,
        message: 'User needs to complete signup',
      });
    }
  } catch (error) {
    console.error('Google check error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update login function to handle password setup scenarios
export const login = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check if user actually has a password
    if (!user.password || user.password.length === 0) {
      return res.status(400).json({
        message:
          'Password not set. Please check your email for setup instructions.',
        passwordNotSet: true,
        canResend: true,
      });
    }

    // If user has password but flag is wrong, fix the flag (supports current users - with old login flow)
    if (!user.isPasswordSet && user.password && user.password.length > 0) {
      user.isPasswordSet = true;
      await user.save();
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const tokens = generateTokens(user._id.toString());

    // Save refresh token to user document
    user.refreshToken = tokens.refreshToken;
    await user.save();

    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    let uri = user?.profilePicture?.fileName
      ? await getSignedDownloadUrl(
          user!.profilePicture!.fileName || '',
          user!.profilePicture!.fileType || '',
        )
      : '';

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
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};

// refresh token endpoint
export const refreshToken = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token not found' });
    }

    // Verify refresh token
    const decoded = jwt.verify(
      refreshToken,
      config.jwtSecret!,
    ) as jwt.JwtPayload;

    // Find user and check if refresh token matches
    const user = await User.findById(decoded.userId);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // Generate new tokens
    const tokens = generateTokens(user._id.toString());

    // Update refresh token in database
    user.refreshToken = tokens.refreshToken;
    await user.save();

    // Set new refresh token as HTTP-only cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({ accessToken: tokens.accessToken });
  } catch (error) {
    res.status(401).json({ message: 'Invalid refresh token' });
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
        { $set: { refreshToken: null } },
      );
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const forgotPassword = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
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
      subject: 'Password Reset OTP',
      text: `Your OTP for password reset is: ${otp}. This OTP is valid for 10 minutes.`,
    });

    res.json({ message: 'OTP sent to your email' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
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
    return res.status(400).json({ message: 'Invalid or expired OTP' });
  }

  return res.status(200).json({ message: 'OTP verified' });
};

export const verifyOTPAndResetPassword = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({
      email,
      resetPasswordOTP: otp,
      resetPasswordOTPExpiry: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Update password and clear OTP fields
    user.password = newPassword;
    user.resetPasswordOTP = '';
    user.resetPasswordOTPExpiry = new Date();
    await user.save();

    res.json({ message: 'Password successfully reset' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error' });
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
      return res.status(404).json({ message: 'User not found' });
    }

    let uri = user?.profilePicture?.fileName
      ? await getSignedDownloadUrl(
          user!.profilePicture!.fileName || '',
          user!.profilePicture!.fileType || '',
        )
      : '';

    res.json({
      message: 'User updated successfully',
      user: {
        ...user.toObject(),
        profilePicture: uri,
      },
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getUser = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user?.userId;

    // Find the user by ID and update their information
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let uri = user?.profilePicture?.fileName
      ? await getSignedDownloadUrl(
          user!.profilePicture!.fileName || '',
          user!.profilePicture!.fileType || '',
        )
      : '';

    // Add subscription info to user data
    const subscriptionInfo = user.subscription
      ? {
          status: user.subscription.status,
          trialEndsAt: user.subscription.trialEndsAt,
          currentPeriodEnd: user.subscription.currentPeriodEnd,
        }
      : null;

    res.json({
      message: 'User fetched successfully',
      user: {
        ...user.toObject(),
        profilePicture: uri,
        subscription: subscriptionInfo,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user?.userId;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    user.isUserDeleted = true;

    user.save();

    res.status(200).json({ message: 'User deleted' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};

export const updateProfilePicture = async (
  req: Request & { filesInfo?: any[]; user?: { userId: string } },
  res: Response,
): Promise<any> => {
  try {
    const userId = req.user?.userId; // Assuming user ID is passed in the request

    const filesInfo: any = req.filesInfo;

    if (!filesInfo) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Update user profile picture URL in the database
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.profilePicture = filesInfo[0];

    user.save();

    let uri = await getSignedDownloadUrl(
      filesInfo[0]?.fileName,
      filesInfo[0]?.fileType,
    );

    res.json({
      message: 'Profile picture updated successfully',
      user: {
        ...user.toObject(),
        profilePicture: uri,
      },
    });
  } catch (error) {
    console.error('Update profile picture error:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};
