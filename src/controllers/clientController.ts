import { Request, Response } from "express";
import { Client } from "../models/Client";
import { Project } from "../models/Project";

export const clientController = {
  async createClient(req: Request, res: Response): Promise<any> {
    try {
      const {
        name,
        companyName,
        entityType,
        address,
        currency,
        language,
        contacts,
        projects,
        status,
        state,
      } = req.body;
      const userId = req.user?.userId;

      const client = new Client({
        name,
        companyName,
        entityType,
        address,
        currency,
        language,
        contacts,
        projects,
        status,
        state,
        createdBy: userId,
      });
      await client.save();

      // Update client with new project
      if (projects) {
        projects.map(async (x: string) => {
          let project_ = await Project.findById(x);
          if (project_) {
            project_.client = client?._id;
            await client.save();
          }
        });
      }

      res.status(201).json({
        message: "Client created successfully",
        client,
      });
    } catch (error) {
      console.error("Client creation error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  async updateClient(req: Request, res: Response): Promise<any> {
    try {
      const { clientId } = req.params;
      const updateData = req.body;

      // Fetch the existing client to get its current data
      const existingClient: any = await Client.findById(clientId);
      if (!existingClient) {
        return res.status(404).json({ message: "Client not found" });
      }

      // Only update fields that are present in the req.body
      Object.keys(updateData).forEach((key) => {
        if (existingClient[key] !== undefined) {
          existingClient[key] = updateData[key];
        }
      });

      const client = await existingClient.save(); // Save the updated client

      res.json({
        message: "Client updated successfully",
        client,
      });
    } catch (error) {
      console.error("Client update error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  async getClients(req: Request, res: Response): Promise<any> {
    try {
      const userId = req.user?.userId;
      let clients = await Client.find({
        createdBy: userId,
        deleted: false,
      })
        .sort({ updatedAt: -1 })
        .populate({
          path: "projects",
          populate: "client",
        });

      // Remove duplicate projects within each client using a Set
      let new_clients = clients.map((client) => {
        const uniqueProjects = new Map();

        client.projects.forEach((project) => {
          uniqueProjects.set(project._id.toString(), project);
        });

        return {
          ...client.toObject(), // Convert Mongoose document to a plain object
          projects: Array.from(uniqueProjects.values()), // Get unique projects
        };
      });

      res.json(new_clients);
    } catch (error) {
      console.error("Get clients error:", error);
      res.status(500).json({ message: "Server error", error });
    }
  },

  async getClientsByID(req: Request, res: Response): Promise<any> {
    try {
      const userId = req.user?.userId;
      const clientId = req.params.clientId;

      if (!clientId) {
        return res.status(400).json({ message: "Client ID is required" });
      }

      let client = await Client.findOne({
        createdBy: userId,
        _id: clientId,
      }).populate("projects");

      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      // Remove duplicate projects
      const uniqueProjects = new Map();
      client.projects.forEach((project) => {
        uniqueProjects.set(project._id.toString(), project);
      });

      // Convert Mongoose document to a plain object and update projects
      let new_client = client.toObject();
      new_client.projects = Array.from(uniqueProjects.values());

      res.json(new_client);
    } catch (error) {
      console.error("Get clients error:", error);
      res.status(500).json({ message: "Server error", error });
    }
  },

  async duplicateClient(req: Request, res: Response): Promise<any> {
    try {
      const { clientId } = req.params; // Get the client ID from the request parameters
      const userId = req.user?.userId; // Get the user ID from the request

      // Find the original client
      const originalClient = await Client.findById(clientId).populate(
        "projects"
      );
      if (!originalClient) {
        return res.status(404).json({ message: "Client not found" });
      }

      // Create a new client with the same details
      const newClient = new Client({
        name: "Copy " + originalClient.name,
        companyName: originalClient.companyName,
        entityType: originalClient.entityType,
        address: originalClient.address,
        currency: originalClient.currency,
        language: originalClient.language,
        contacts: originalClient.contacts,
        projects: originalClient.projects, // You may want to handle project duplication separately
        status: originalClient.status,
        state: originalClient.state,
        createdBy: userId, // Set to the current user
      });

      await newClient.save(); // Save the new client to the database

      // Optionally, update projects to link them to the new client
      if (originalClient.projects && originalClient.projects.length > 0) {
        await Project.updateMany(
          { _id: { $in: originalClient.projects } },
          { $set: { client: newClient._id } } // Update each project's client reference
        );
      }

      res.status(201).json({
        message: "Client duplicated successfully",
        client: await Client.findById(newClient._id).populate("projects"),
      });
    } catch (error) {
      console.error("Client duplication error:", error);
      res.status(500).json({ message: "Server error", error });
    }
  },

  async deleteClient(req: Request, res: Response): Promise<any> {
    try {
      const { clientId } = req.params;
      const userId = req.user?.userId;

      // Find the project and mark it as deleted
      const client = await Client.findOneAndUpdate(
        { _id: clientId, createdBy: userId },
        { deleted: true },
        { new: true }
      );

      if (!client) {
        return res
          .status(404)
          .json({ message: "client not found or already deleted" });
      }

      let projects = await Project.find({ client: clientId });
      if (projects.length > 0) {
        projects.map(async (x) => {
          x.client = null;
          await x.save();
        });
      }

      res.json({
        message: "client deleted successfully",
        client,
      });
    } catch (error) {
      console.error("Project deletion error:", error);
      res.status(500).json({ message: "Server error", error });
    }
  },

  async getDeletedClient(req: Request, res: Response): Promise<any> {
    try {
      const userId = req.user?.userId;

      const cleints = await Client.find({
        createdBy: userId,
        deleted: true,
      });

      // Check if the cleints array is empty
      if (cleints.length === 0) {
        return res.status(404).json({ message: "Deleted cleints not found" });
      }

      res.json({ cleints, type: "cleint" }); // Return the array of cleints
    } catch (error) {
      console.error("Get deleted cleint error:", error);
      res.status(500).json({ message: "Server error", error });
    }
  },

  async undoDeleteClient(req: Request, res: Response): Promise<any> {
    try {
      const { clientId } = req.params;
      const userId = req.user?.userId;

      // Find the project and mark it as deleted
      const client = await Client.findOneAndUpdate(
        { _id: clientId, createdBy: userId },
        { deleted: false },
        { new: true }
      );

      if (!client) {
        return res
          .status(404)
          .json({ message: "client not found or already undeleted" });
      }

      res.json({
        message: "client undeleted successfully",
        client,
      });
    } catch (error) {
      console.error("Project deletion error:", error);
      res.status(500).json({ message: "Server error", error });
    }
  },
};
