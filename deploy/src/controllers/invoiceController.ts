import { Request, Response } from "express";
import { Invoice } from "../models/Invoice";
import { sendEmail } from "../services/emailService";
import { config } from "../config/config";

const formatInvoiceNumber = (num: number): string => {
  return String(1000 + num);
};

export const invoiceController = {
  async createInvoice(req: Request, res: Response): Promise<any> {
    try {
      // Use X-User-ID header if available
      const userId = req.header("X-User-ID") || req.user?.userId || req.user?.id;
      console.log("[createInvoice] Using userId:", userId);

      const invoicesCount = await Invoice.countDocuments({ createdBy: userId });
      let invoiceNumber = formatInvoiceNumber(invoicesCount);
      if (req.body.invoiceNumber) {
        const exists = await Invoice.findOne({
          createdBy: userId,
          invoiceNumber: userId + "_" + req.body?.invoiceNumber,
        });
        if (!!exists) {
          throw new Error("Invoice number already in use");
        } else {
          invoiceNumber = req.body.invoiceNumber;
        }
      } else {
        let i = 0;
        while (true) {
          invoiceNumber = formatInvoiceNumber(invoicesCount + i);
          const exists = await Invoice.findOne({
            createdBy: userId,
            invoiceNumber: userId + "_" + invoiceNumber,
          });
          if (!!exists) {
            i++;
          } else {
            break;
          }
        }
      }

      let invoiceData = {
        ...req.body,
        createdBy: userId,
        invoiceNumber: invoiceNumber,
      };

      const invoice = new Invoice({
        ...invoiceData,
        invoiceNumber: userId + "_" + invoiceData?.invoiceNumber,
      });
      await invoice.save();

      // if (invoice.client) {
      //   let client = await Client.findById(invoice.client);
      //   await sendEmail({
      //     to: client?.contacts[0]?.email || "akotosel6@gmail.com",
      //     subject: `You have received an invoice`,
      //     text: `Use this link to view the invoice ${config.baseURL}/p/invoice/${invoice._id}`,
      //   });
      // }

      res.status(201).json({
        message: "Invoice created successfully",
        invoice: await Invoice.findById(invoice._id)
          .populate("client")
          .populate("project"),
      });
    } catch (error) {
      console.error("Invoice creation error:", error);
      if (error?.message?.includes("already in use")) {
        res.status(500).json({ message: error?.message, error });
      } else {
        res.status(500).json({ message: "Server error", error });
      }
    }
  },

  async sendToEmail(req: Request, res: Response): Promise<any> {
    try {
      const { invoiceId } = req.params;
      const invoice = await Invoice.findById(invoiceId);

      if (!invoice) {
        return res.status(404);
      }

      // console.log(req.body);
      let { emails } = req.body;

      if (invoice) {
        // let client = await Client.findById(invoice.client);
        await sendEmail({
          to: emails,
          subject: `You have received an invoice`,
          text: `Use this link to view the invoice ${req?.headers?.origin}/p/invoice/${invoice._id}`,
        });
      }

      res.status(201).json({
        message: "Invoice created successfully",
        invoice: await Invoice.findByIdAndUpdate(invoice._id, {
          status: "Sent",
        })
          .populate("client")
          .populate("project"),
      });
    } catch (error) {
      console.error("Invoice creation error:", error);
      res.status(500).json({ message: "Server error", error });
    }
  },

  async updateInvoice(req: Request, res: Response): Promise<any> {
    try {
      // Use X-User-ID header if available
      const userId = req.header("X-User-ID") || req.user?.userId || req.user?.id;
      console.log("[updateInvoice] Using userId:", userId);

      const { invoiceId } = req.params;
      let updateData = req.body;
      delete updateData.invoiceNumber

      // Recalculate totals if items are updated
      if (updateData.items) {
        updateData.subtotal = updateData.items.reduce(
          (sum: number, item: any) => sum + item.quantity * item.unitCost,
          0
        );

        if (updateData.tax?.percentage) {
          updateData.tax.amount =
            updateData.subtotal * (updateData.tax.percentage / 100);
        }

        updateData.total = updateData.subtotal + (updateData.tax?.amount || 0);
      }

      // First check if the invoice belongs to the user
      const existingInvoice = await Invoice.findOne({
        _id: invoiceId,
        createdBy: userId
      });

      if (!existingInvoice) {
        return res.status(404).json({ message: "Invoice not found or access denied" });
      }

      const invoice = await Invoice.findByIdAndUpdate(invoiceId, updateData, {
        new: true,
        runValidators: true,
      })
        .populate("client")
        .populate("project");

      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      res.json({
        message: "Invoice updated successfully",
        invoice,
      });
    } catch (error) {
      console.error("Invoice update error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  async updateInvoicePublicToOpen(req: Request, res: Response): Promise<any> {
    try {
      const { invoiceId } = req.params;

      const invoice = await Invoice.findByIdAndUpdate(
        invoiceId,
        { status: "Open" },
        {
          new: true,
          runValidators: true,
        }
      )
        .populate("client")
        .populate("project");

      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      res.json({
        message: "Invoice updated successfully",
        invoice,
      });
    } catch (error) {
      console.error("Invoice update error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  async getInvoices(req: Request, res: Response): Promise<any> {
    try {
      // Use X-User-ID header if available
      const userId = req.header("X-User-ID") || req.user?.userId || req.user?.id;
      console.log("[getInvoices] Using userId:", userId);

      const invoices = await Invoice.find({ createdBy: userId, deleted: false })
        .sort({ updatedAt: -1 })
        .populate("client")
        .populate("project");

      console.log(`[getInvoices] Found ${invoices.length} invoices for user ${userId}`);
      res.json(invoices);
    } catch (error) {
      console.error("Get invoices error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  async getNextInvoiceNumber(req: Request, res: Response): Promise<any> {
    try {
      // Use X-User-ID header if available
      const userId = req.header("X-User-ID") || req.user?.userId || req.user?.id;
      console.log("[getNextInvoiceNumber] Using userId:", userId);

      const invoicesCount = await Invoice.countDocuments({ createdBy: userId });
      let invoiceNumber = formatInvoiceNumber(invoicesCount);
      let i = 0;
      while (true) {
        invoiceNumber = formatInvoiceNumber(invoicesCount + i);
        const exists = await Invoice.findOne({
          createdBy: userId,
          invoiceNumber: userId + "_" + invoiceNumber,
        });
        if (!!exists) {
          i++;
        } else {
          break;
        }
      }
      res.json({
        invoiceNo: invoiceNumber,
      });
    } catch (error) {
      console.error("Get next invoice error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  async getInvoicesById(req: Request, res: Response): Promise<any> {
    try {
      // Use X-User-ID header if available
      const userId = req.header("X-User-ID") || req.user?.userId || req.user?.id;
      console.log("[getInvoicesById] Using userId:", userId);

      const invoiceId = req.params.invoiceId;

      if (!invoiceId) {
        return res.status(400).json({ message: "Invoice ID is required" });
      }

      const invoices = await Invoice.findOne({
        createdBy: userId,
        _id: invoiceId,
        deleted: false,
      })
        .populate("client")
        .populate("project");

      if (!invoices) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      res.json(invoices);
    } catch (error) {
      console.error("Get invoices error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  async getInvoicesByIdPublic(req: Request, res: Response): Promise<any> {
    try {
      const invoiceId = req.params.invoiceId;

      if (!invoiceId) {
        return res.status(400).json({ message: "Invoice ID is required" });
      }

      // First find the invoice to check its status
      const existingInvoice = await Invoice.findById(invoiceId);

      // Only update status if current status is "Sent"
      const updateQuery =
        existingInvoice?.status === "Sent" ? { status: "Open" } : {};

      const invoice = await Invoice.findByIdAndUpdate(invoiceId, updateQuery, {
        new: true,
        runValidators: true,
      })
        .populate("client")
        .populate("project");

      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      res.json(invoice);
    } catch (error) {
      console.error("Get invoices error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  async duplicateInvoice(req: Request, res: Response): Promise<any> {
    try {
      // Use X-User-ID header if available
      const userId = req.header("X-User-ID") || req.user?.userId || req.user?.id;
      console.log("[duplicateInvoice] Using userId:", userId);

      const invoiceId = req.params.invoiceId;

      // Find the original invoice
      const originalInvoice = await Invoice.findById(invoiceId)
        .populate("client")
        .populate("project");

      if (!originalInvoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Create a new invoice based on the original
      const newInvoiceData = {
        ...originalInvoice.toObject(), // Convert to plain object
        invoiceNumber: await generateUniqueInvoiceNumber(
          originalInvoice.invoiceNumber
        ), // Ensure unique invoice number
        createdBy: userId, // Set the creator to the current user
        _id: undefined, // Remove the original ID to create a new document
        status: "Draft", // Set status to Draft for the new invoice
      };

      const newInvoice = new Invoice(newInvoiceData);
      await newInvoice.save();

      res.status(201).json({
        message: "Invoice duplicated successfully",
        invoice: await Invoice.findById(newInvoice._id)
          .populate("client")
          .populate("project"),
      });
    } catch (error) {
      console.error("Duplicate invoice error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  async deleteInvoice(req: Request, res: Response): Promise<any> {
    try {
      const { invoiceId } = req.params;
      // Use X-User-ID header if available
      const userId = req.header("X-User-ID") || req.user?.userId || req.user?.id;
      console.log("[deleteInvoice] Using userId:", userId);

      // Find the invoice and mark it as deleted
      const invoice = await Invoice.findOneAndUpdate(
        { _id: invoiceId, createdBy: userId },
        { deleted: true },
        { new: true }
      );

      if (!invoice) {
        return res
          .status(404)
          .json({ message: "invoice not found or already deleted" });
      }

      res.json({
        message: "invoice deleted successfully",
        invoice,
      });
    } catch (error) {
      console.error("invoice deletion error:", error);
      res.status(500).json({ message: "Server error", error });
    }
  },

  async undoDeleteInvoice(req: Request, res: Response): Promise<any> {
    try {
      const { invoiceId } = req.params;
      // Use X-User-ID header if available
      const userId = req.header("X-User-ID") || req.user?.userId || req.user?.id;
      console.log("[undoDeleteInvoice] Using userId:", userId);

      // Find the invoice and mark it as not deleted
      const invoice = await Invoice.findOneAndUpdate(
        { _id: invoiceId, createdBy: userId },
        { deleted: false },
        { new: true }
      );

      if (!invoice) {
        return res
          .status(404)
          .json({ message: "invoice not found or already deleted" });
      }

      res.json({
        message: "invoice deleted successfully",
        invoice,
      });
    } catch (error) {
      console.error("invoice deletion error:", error);
      res.status(500).json({ message: "Server error", error });
    }
  },

  async getDeletedInvoice(req: Request, res: Response): Promise<any> {
    try {
      // Use X-User-ID header if available
      const userId = req.header("X-User-ID") || req.user?.userId || req.user?.id;
      console.log("[getDeletedInvoice] Using userId:", userId);

      const invoices = await Invoice.find({
        createdBy: userId,
        deleted: true,
      });

      console.log(`[getDeletedInvoice] Found ${invoices.length} deleted invoices for user ${userId}`);

      // Check if the invoices array is empty
      if (invoices.length === 0) {
        return res.status(404).json({ message: "Deleted invoices not found" });
      }

      res.json({ invoices, type: "invoice" }); // Return the array of projects
    } catch (error) {
      console.error("Get deleted project error:", error);
      res.status(500).json({ message: "Server error", error });
    }
  },
};

async function generateUniqueInvoiceNumber(
  baseInvoiceNumber: string
): Promise<string> {
  // Generate a random number to append to the base invoice number
  const randomSuffix = Math.floor(Math.random() * 1000); // Random number between 0 and 999
  return `${baseInvoiceNumber}-${randomSuffix}`; // Append random number to the base invoice number
}
