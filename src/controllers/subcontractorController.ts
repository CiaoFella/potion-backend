import { Request, Response } from 'express';
import { Project } from '../models/Project';
import { v4 as uuidv4 } from 'uuid';
import { Subcontractor } from '../models/Subcontractor';
import { sendEmail } from '../services/emailService';
import { config } from '../config/config';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { reactEmailService } from '../services/reactEmailService';
import type { SubcontractorLoginReadyProps } from '../templates/react-email/subcontractor-login-ready';

// Email service functions
const sendSubcontractorInvitationEmail = async (
  email: string,
  projectName: string,
  inviteUrl: string,
  subcontractorName?: string,
  clientName?: string,
  senderName?: string,
) => {
  try {
    const props = {
      projectName,
      inviteUrl,
      subcontractorName: subcontractorName || 'there',
      clientName,
      senderName: senderName || 'Project Manager',
    };

    const { subject, html } = await reactEmailService.renderTemplate(
      'subcontractor-invitation',
      props,
    );

    return sendEmail({
      to: email,
      subject,
      html,
    });
  } catch (error) {
    console.error('Error sending subcontractor invitation email:', error);

    // Fallback to basic email
    return sendEmail({
      to: email,
      subject: 'Project Invitation - Join Our Team',
      html: `
        <div style="font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Hello ${subcontractorName || 'there'},</h1>
          <p><strong>${senderName || 'Project Manager'}</strong> has invited you to join the <strong>"${projectName}"</strong> project as a subcontractor${clientName ? ` for ${clientName}` : ''}.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" style="background: #1EC64C; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">Accept Invitation</a>
          </div>
          <p style="color: #666; font-size: 14px;">Welcome to the team! We're excited to work with you on this project.</p>
        </div>
      `,
    });
  }
};

const sendSubcontractorLoginReadyEmail = async (
  email: string,
  firstName: string,
  projectName?: string,
  clientName?: string,
) => {
  try {
    const loginUrl = `${config.frontURL}/auth/subcontractor/login`;

    const props: SubcontractorLoginReadyProps = {
      firstName: firstName || 'there',
      loginUrl,
      projectName,
      clientName,
    };

    const { subject, html } = await reactEmailService.renderTemplate(
      'subcontractor-login-ready',
      props,
    );

    return sendEmail({
      to: email,
      subject,
      html,
    });
  } catch (error) {
    console.error('Error sending subcontractor login ready email:', error);

    // Fallback to basic HTML email
    return sendEmail({
      to: email,
      subject: 'Your Potion account is ready - You can now login!',
      html: `
        <div style="font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Hi ${firstName},</h1>
          <p><strong>Great news!</strong> Your password has been set successfully.</p>
          <p>Your Potion account is now ready to use! You can login and access your project dashboard anytime.</p>
          ${projectName ? `<p><strong>Project:</strong> ${projectName}${clientName ? `<br><strong>Client:</strong> ${clientName}` : ''}</p>` : ''}
          <div style="text-align: center; margin: 30px 0;">
            <a href="${config.frontURL}/auth/subcontractor/login" style="background: #1EC64C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Login to Your Account</a>
          </div>
          <p style="font-size: 14px; color: #666;">Need help? Just reply to this email - our support team is here to assist you.</p>
        </div>
      `,
    });
  }
};

export const subcontractorController = {
  async createSubcontractor(req: Request, res: Response): Promise<any> {
    try {
      const { project, ...subcontractorData } = req.body;
      const userId = req.user?.userId;

      // Validate payment information
      const paymentInfo = subcontractorData?.paymentInformation;
      if (
        paymentInfo?.paymentType === 'bank' &&
        (!paymentInfo?.routingNumber || !paymentInfo?.accountNumber)
      ) {
        return res.status(400).json({ message: 'Missing bank information' });
      }
      if (paymentInfo?.paymentType === 'paypal' && !paymentInfo?.paypalEmail) {
        return res.status(400).json({ message: 'PayPal email required' });
      }
      if (
        paymentInfo?.paymentType === 'other' &&
        !paymentInfo?.paymentDescription
      ) {
        return res
          .status(400)
          .json({ message: 'Payment description required' });
      }

      let projectData;
      if (!!project) {
        projectData = await Project.findById(project).lean();
        if (!projectData) {
          return res.status(404).json({ message: 'Project not found' });
        }
      }

      const inviteKey = `project-${uuidv4()}`;
      const hasData = Object.keys(subcontractorData || {}).length > 0;
      const subcontractor = new Subcontractor({
        ...subcontractorData,
        status: hasData ? 'active' : 'inactive',
        inviteKey,
        project,
        createdBy: userId,
      });

      await subcontractor.save();
      res.status(201).json(subcontractor);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: 'Server error', error });
    }
  },

  async generateInviteLink(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const subcontractor =
        await Subcontractor.findById(id).populate('project');
      if (!subcontractor) {
        return res.status(404).json({ message: 'Subcontractor not found' });
      }
      const inviteKey = `${(subcontractor as any)?.project?.name?.toLowerCase()?.replace(/ /g, '-')}-${uuidv4()}`;
      await Subcontractor.findByIdAndUpdate(id, { inviteKey }, { new: true });

      res.json({ inviteKey });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error });
    }
  },

  async inviteSubcontractor(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const { email, projectId, note, passkey } = req.body;

      if (!email) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      const subcontractor = await Subcontractor.findByIdAndUpdate(
        id,
        {
          email,
          project: projectId,
          passkey,
          note,
          status: 'invited',
        },
        { new: true },
      )
        .populate('project')
        .populate('createdBy');

      if (!subcontractor.inviteKey) {
        subcontractor.inviteKey = uuidv4();
        await subcontractor.save();
      }

      // Get project and client info for the email
      const project = subcontractor.project as any;
      const createdBy = subcontractor.createdBy as any;
      const projectName = project?.name || 'Unknown Project';
      const clientName = createdBy
        ? `${createdBy.firstName} ${createdBy.lastName}`.trim()
        : undefined;
      const senderName = clientName || 'Project Manager';

      // Send React Email invitation
      const inviteLink = `${req?.headers?.origin}/p/subcontractor/${subcontractor?.inviteKey}/edit`;
      await sendSubcontractorInvitationEmail(
        email,
        projectName,
        inviteLink,
        subcontractor.fullName || email.split('@')[0],
        clientName,
        senderName,
      );

      res.status(201).json(subcontractor);
    } catch (error) {
      console.error('Error inviting subcontractor:', error);
      res.status(500).json({ message: 'Server error', error });
    }
  },

  async getByInviteKey(req: Request, res: Response): Promise<any> {
    try {
      const { inviteKey } = req.params;
      const subcontractor = await Subcontractor.findOne({ inviteKey })
        .populate('project')
        .populate('createdBy');

      if (!subcontractor) {
        return res.status(404).json({ message: 'Invalid invite key' });
      }

      res.json(subcontractor);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error });
    }
  },

  async acceptInvite(req: Request, res: Response): Promise<any> {
    try {
      const { inviteKey } = req.params;
      const updates = req.body;

      const subcontractor = await Subcontractor.findOneAndUpdate(
        { inviteKey },
        { ...updates, status: 'active', inviteKey: null },
        { new: true },
      );

      if (!subcontractor) {
        return res.status(404).json({ message: 'Invalid invite key' });
      }

      res.json(subcontractor);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error });
    }
  },

  // Standard CRUD operations
  async updateSubcontractor(req: Request, res: Response): Promise<any> {
    try {
      let { _id, createdBy, createdAt, updatedAt, ...rest } = req.body;
      const subcontractor = await Subcontractor.findByIdAndUpdate(
        req.params.id,
        { ...rest, status: 'active' },
        { new: true },
      );
      res.json(subcontractor);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error });
    }
  },
  async setSubcontractorPasswordByInviteKey(
    req: Request,
    res: Response,
  ): Promise<any> {
    try {
      const { password } = req.body;
      if (!password) {
        return res.status(400).json({ message: 'Password is required' });
      }

      const subcontractor = await Subcontractor.findOne({
        inviteKey: req.params.inviteKey,
      })
        .populate('project')
        .populate('createdBy');

      if (!subcontractor) {
        return res.status(404).json({ message: 'Subcontractor not found' });
      }
      if (subcontractor.isPasswordSet) {
        return res.status(400).json({ message: 'Password already set' });
      }

      const updatedSubcontractor = await Subcontractor.findOneAndUpdate(
        { inviteKey: req.params.inviteKey },
        { password: await bcrypt.hash(password, 10), isPasswordSet: true },
        { new: true },
      )
        .populate('project')
        .populate('createdBy')
        .lean();

      // Send React Email confirmation with project info
      const projectName = (subcontractor as any).project?.name;
      const clientName = (subcontractor as any).createdBy
        ? `${(subcontractor as any).createdBy.firstName} ${(subcontractor as any).createdBy.lastName}`.trim()
        : undefined;

      await sendSubcontractorLoginReadyEmail(
        subcontractor.email,
        subcontractor.fullName || subcontractor.email.split('@')[0],
        projectName,
        clientName,
      );

      res.json(updatedSubcontractor);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error });
    }
  },

  // Subcontractor login
  async subcontractorLogin(req: Request, res: Response): Promise<any> {
    try {
      const { email, password } = req.body;

      // Find the subcontractor
      const subcontractor = await Subcontractor.findOne({ email })
        .populate('project')
        .populate('createdBy');

      if (!subcontractor) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Check if password is set
      if (!subcontractor.isPasswordSet || !subcontractor.password) {
        return res.status(400).json({
          message:
            'Password not set. Please check your email for setup instructions.',
          passwordNotSet: true,
        });
      }

      // Check password
      const isMatch = await bcrypt.compare(password, subcontractor.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Generate token
      const token = jwt.sign(
        {
          subcontractorId: subcontractor._id,
        },
        config.jwtSecret!,
        { expiresIn: '1d' },
      );

      // Format response data similar to accountant login
      const responseData = {
        id: subcontractor._id,
        email: subcontractor.email,
        fullName: subcontractor.fullName,
        businessName: subcontractor.businessName,
        project: subcontractor.project,
        createdBy: subcontractor.createdBy,
      };

      res.json({
        token,
        subcontractor: responseData,
      });
    } catch (error) {
      console.error('Error during subcontractor login:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  async updateSubcontractorByInviteKey(
    req: Request,
    res: Response,
  ): Promise<any> {
    try {
      let { _id, project, createdBy, createdAt, updatedAt, ...rest } = req.body;
      const subcontractor = await Subcontractor.findOneAndUpdate(
        { inviteKey: req.params.inviteKey },
        { ...rest, status: 'active' },
        { new: true },
      );
      res.json(subcontractor);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error });
    }
  },

  async getSubcontractors(req: Request, res: Response): Promise<any> {
    try {
      const subcontractors = await Subcontractor.find({
        project: req.params.projectId,
        status: 'active',
        deleted: false,
      });
      res.json(subcontractors);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error });
    }
  },

  async getAllSubcontractors(req: Request, res: Response): Promise<any> {
    try {
      console.log('[getAllSubcontractors] Method called');
      console.log('[getAllSubcontractors] req.user:', req.user);
      console.log('[getAllSubcontractors] Using userId:', req.user?.userId);

      const subcontractors = await Subcontractor.find({
        createdBy: req.user?.userId,
        // Remove the status filter temporarily to see all subcontractors
        // status: "active",
        deleted: { $ne: true }, // Changed from false to handle undefined values
      })
        .populate('project')
        .lean();

      console.log(
        '[getAllSubcontractors] Found',
        subcontractors.length,
        'subcontractors',
      );
      console.log('[getAllSubcontractors] Subcontractors:', subcontractors);

      res.json(subcontractors);
    } catch (error) {
      console.error('[getAllSubcontractors] Error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },

  async getSubcontractorById(req: Request, res: Response): Promise<any> {
    try {
      const subcontractor = await Subcontractor.findById(
        req?.params?.id,
      ).populate('project');
      if (!subcontractor) {
        return res.status(404).json({ message: 'Subcontractor not found' });
      }
      res.json(subcontractor);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error });
    }
  },

  async deleteSubcontractor(req: Request, res: Response): Promise<any> {
    try {
      await Subcontractor.findByIdAndUpdate(req.params.id, { deleted: true });
      res.json({ message: 'Subcontractor deleted' });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error });
    }
  },
};
