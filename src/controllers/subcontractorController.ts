import { Request, Response } from "express";
import { Project } from "../models/Project";
import { v4 as uuidv4 } from "uuid";
import { Subcontractor } from "../models/Subcontractor";
import { sendEmail } from "../services/emailService";
import { config } from "../config/config";
import bcrypt from "bcryptjs";

export const subcontractorController = {
  async createSubcontractor(req: Request, res: Response): Promise<any> {
    try {
      const { project, ...subcontractorData } = req.body;
      const userId = req.user?.userId;

      // Validate payment information
      const paymentInfo = subcontractorData?.paymentInformation;
      if (
        paymentInfo?.paymentType === "bank" &&
        (!paymentInfo?.routingNumber || !paymentInfo?.accountNumber)
      ) {
        return res.status(400).json({ message: "Missing bank information" });
      }
      if (paymentInfo?.paymentType === "paypal" && !paymentInfo?.paypalEmail) {
        return res.status(400).json({ message: "PayPal email required" });
      }
      if (
        paymentInfo?.paymentType === "other" &&
        !paymentInfo?.paymentDescription
      ) {
        return res
          .status(400)
          .json({ message: "Payment description required" });
      }

      let projectData;
      if (!!project) {
        projectData = await Project.findById(project).lean();
        if (!projectData) {
          return res.status(404).json({ message: "Project not found" });
        }
      }

      const inviteKey = `project-${uuidv4()}`;
      const hasData = Object.keys(subcontractorData || {}).length > 0;
      const subcontractor = new Subcontractor({
        ...subcontractorData,
        status: hasData ? "active" : "inactive",
        inviteKey,
        project,
        createdBy: userId,
      });

      await subcontractor.save();
      res.status(201).json(subcontractor);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Server error", error });
    }
  },

  async generateInviteLink(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const subcontractor =
        await Subcontractor.findById(id).populate("project");
      if (!subcontractor) {
        return res.status(404).json({ message: "Subcontractor not found" });
      }
      const inviteKey = `${(subcontractor as any)?.project?.name?.toLowerCase()?.replace(/ /g, "-")}-${uuidv4()}`;
      await Subcontractor.findByIdAndUpdate(id, { inviteKey }, { new: true });

      res.json({ inviteKey });
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  },

  async inviteSubcontractor(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const { email, projectId, note, passkey } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const subcontractor = await Subcontractor.findByIdAndUpdate(
        id,
        {
          email,
          project: projectId,
          passkey,
          note,
          status: "invited",
        },
        { new: true }
      );

      if (!subcontractor.inviteKey) {
        subcontractor.inviteKey = uuidv4();
      }

      // Send email with invite link
      const inviteLink = `${req?.headers?.origin}/p/subcontractor/${subcontractor?.inviteKey}/edit\n\n${note || ""}`;
      await sendEmail({
        to: email,
        subject: "Project Invitation",
        html: `Click here to accept: <a href="${inviteLink}">${inviteLink}</a>`,
      });

      res.status(201).json(subcontractor);
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  },

  async getByInviteKey(req: Request, res: Response): Promise<any> {
    try {
      const { inviteKey } = req.params;
      const subcontractor = await Subcontractor.findOne({ inviteKey })
        .populate("project")
        .populate("createdBy");

      if (!subcontractor) {
        return res.status(404).json({ message: "Invalid invite key" });
      }

      res.json(subcontractor);
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  },

  async acceptInvite(req: Request, res: Response): Promise<any> {
    try {
      const { inviteKey } = req.params;
      const updates = req.body;

      const subcontractor = await Subcontractor.findOneAndUpdate(
        { inviteKey },
        { ...updates, status: "active", inviteKey: null },
        { new: true }
      );

      if (!subcontractor) {
        return res.status(404).json({ message: "Invalid invite key" });
      }

      res.json(subcontractor);
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  },

  // Standard CRUD operations
  async updateSubcontractor(req: Request, res: Response): Promise<any> {
    try {
      let { _id, createdBy, createdAt, updatedAt, ...rest } = req.body;
      const subcontractor = await Subcontractor.findByIdAndUpdate(
        req.params.id,
        { ...rest, status: "active" },
        { new: true }
      );
      res.json(subcontractor);
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  },
  async setSubcontractorPasswordByInviteKey(
    req: Request,
    res: Response
  ): Promise<any> {
    try {
      const { password } = req.body;
      if (!password) {
        return res.status(400).json({ message: "Password is required" });
      }

      const subcontractor = await Subcontractor.findOne({
        inviteKey: req.params.inviteKey,
      });

      if (!subcontractor) {
        return res.status(404).json({ message: "Subcontractor not found" });
      }
      if (subcontractor.isPasswordSet) {
        return res.status(400).json({ message: "Password already set" });
      }

      await Subcontractor.findOneAndUpdate(
        { inviteKey: req.params.inviteKey },
        { password: await bcrypt.hash(password, 10), isPasswordSet: true },
        { new: true }
      )
        .populate("project")
        .lean();
      // Optionally send a confirmation email
      await sendEmail({
        to: subcontractor?.email,
        subject: "Password Set",
        html: `Your password has been set successfully`,
      });
      res.json(subcontractor);
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  },
  async updateSubcontractorByInviteKey(
    req: Request,
    res: Response
  ): Promise<any> {
    try {
      let { _id, project, createdBy, createdAt, updatedAt, ...rest } = req.body;
      const subcontractor = await Subcontractor.findOneAndUpdate(
        { inviteKey: req.params.inviteKey },
        { ...rest, status: "active" },
        { new: true }
      );
      res.json(subcontractor);
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  },

  async getSubcontractors(req: Request, res: Response): Promise<any> {
    try {
      const subcontractors = await Subcontractor.find({
        project: req.params.projectId,
        status: "active",
        deleted: false,
      });
      res.json(subcontractors);
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
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
        deleted: { $ne: true }  // Changed from false to handle undefined values
      }).populate("project").lean();
      
      console.log('[getAllSubcontractors] Found', subcontractors.length, 'subcontractors');
      console.log('[getAllSubcontractors] Subcontractors:', subcontractors);
      
      res.json(subcontractors);
    } catch (error) {
      console.error('[getAllSubcontractors] Error:', error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },

  async getSubcontractorById(req: Request, res: Response): Promise<any> {
    try {
      const subcontractor = await Subcontractor.findById(
        req?.params?.id
      ).populate("project");
      if (!subcontractor) {
        return res.status(404).json({ message: "Subcontractor not found" });
      }
      res.json(subcontractor);
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  },

  async deleteSubcontractor(req: Request, res: Response): Promise<any> {
    try {
      await Subcontractor.findByIdAndUpdate(req.params.id, { deleted: true });
      res.json({ message: "Subcontractor deleted" });
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  },
};
