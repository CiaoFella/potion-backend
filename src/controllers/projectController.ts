import { Request, Response } from "express";
import { Project } from "../models/Project";
import { Client } from "../models/Client";
import { Contract } from "../models/Contract";
import { getSignedDownloadUrl } from "../services/storageService";

export const projectController = {
  async createProject(req: Request, res: Response): Promise<any> {
    try {
      const { name, status, description, client, contracts } = req.body;
      // Use X-User-ID header if available
      const userId = req.header("X-User-ID") || req.user?.userId || req.user?.id;
      console.log("[createProject] Using userId:", userId);

      let project = new Project({
        name,
        status,
        description,
        client,
        contracts,
        createdBy: userId,
      });

      await project.save();

      // Update client with new project
      let client_ = await Client.findById(client);
      if (client && client_) {
        client_?.projects.push(project._id);
        await client_?.save();
      }

      res.status(201).json({
        message: "Project created successfully",
        project: await Project.findById(project._id)
          .populate("client")
          .populate("contracts"),
      });
    } catch (error) {
      console.error("Project creation error:", error);
      res.status(500).json({ message: "Server error", error });
    }
  },

  async updateProject(req: Request, res: Response): Promise<any> {
    try {
      // Use X-User-ID header if available
      const userId = req.header("X-User-ID") || req.user?.userId || req.user?.id;
      console.log("[updateProject] Using userId:", userId);

      const { projectId } = req.params;
      const { name, description, client, status, deleted } = req.body;

      // First check if the project belongs to the user
      const existingProject = await Project.findOne({
        _id: projectId,
        createdBy: userId
      });

      if (!existingProject) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }

      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (name) project.name = name;
      if (description) project.description = description;
      if (client) {
        project.client = client;

        let client_ = await Client.findById(client);
        if (client && client_) {
          client_?.projects.push(project._id);
          await client_?.save();
        }
      }
      if (status) project.status = status;
      project.deleted = !!deleted;

      await project.save();

      res.json({
        message: "Project updated successfully",
      });
    } catch (error) {
      console.error("Project update error:", error);
      res.status(500).json({ message: "Server error", error });
    }
  },

  async getProjects(req: Request, res: Response): Promise<any> {
    try {
      // Use X-User-ID header if available
      const userId = req.header("X-User-ID") || req.user?.userId || req.user?.id;
      console.log("[getProjects] Using userId:", userId);

      const projects = await Project.find({
        createdBy: userId,
        deleted: { $ne: true },
      })
        .sort({ updatedAt: -1 })
        .populate("contracts")
        .populate("client");

      console.log(`[getProjects] Found ${projects.length} projects for user ${userId}`);

      // Fetch additional data from the Contracts collection
      const projectIds = projects.map((project) => project._id); // Get project IDs
      const contracts = await Contract.find({ project: { $in: projectIds } }); // Find contracts associated with the project IDs

      const projectsWithContracts = projects
        .map((project) => ({
          ...project.toObject(),
          contracts: contracts.filter(
            (x) => String(x?.project) === String(project?._id)
          ),
        }))
        ?.map((x: any) => {
          return {
            ...x,
            files: x?.files?.map(async (file) => {
              let uri = await getSignedDownloadUrl(
                file?.fileName,
                file?.fileType
              );

              return {
                ...file,
                uri,
              };
            }),
          };
        });

      res.json(projectsWithContracts);
    } catch (error) {
      console.error("Get projects error:", error);
      res.status(500).json({ message: "Server error", error });
    }
  },

  async getProjectsByID(req: Request, res: Response): Promise<any> {
    try {
      // Use X-User-ID header if available
      const userId = req.header("X-User-ID") || req.user?.userId || req.user?.id;
      console.log("[getProjectsByID] Using userId:", userId);

      const projectId = req.params.projectId;

      if (!projectId) {
        return res.status(400).json({ message: "Project ID is required" });
      }

      const project = await Project.findOne({
        createdBy: userId,
        _id: projectId,
      })
        .populate("client")
        .populate("contracts");

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      let idProject = {
        ...project.toObject(),
        files: await Promise.all(
          project?.files?.map(async (file: any) => {
            let uri = await getSignedDownloadUrl(
              file?.fileName,
              file?.fileType
            );
            return { ...file.toObject(), uri }; // Convert file to a plain object
          }) || []
        ),
      };

      res.json(idProject);
    } catch (error) {
      console.error("Get projects error:", error);
      res.status(500).json({ message: "Server error", error });
    }
  },

  async duplicateProject(req: Request, res: Response): Promise<any> {
    try {
      const { projectId } = req.params;
      // Use X-User-ID header if available
      const userId = req.header("X-User-ID") || req.user?.userId || req.user?.id;
      console.log("[duplicateProject] Using userId:", userId);

      // Find the original project
      const originalProject = await Project.findById(projectId)
        .populate("client")
        .populate("contracts");
      if (!originalProject) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Create a new project with the same details
      const newProject = new Project({
        name: "Copy " + originalProject.name,
        status: originalProject.status,
        description: originalProject.description,
        createdBy: userId, // Set to the current user
        client: originalProject.client,
        contracts: originalProject.contracts,
      });

      await newProject.save();

      // Update client with the new project
      let client_ = await Client.findById(originalProject.client);
      if (client_ && client_) {
        client_.projects.push(newProject._id);
        await client_.save();
      }

      res.status(201).json({
        message: "Project duplicated successfully",
        project: await Project.findById(newProject._id)
          .populate("client")
          .populate("contracts"),
      });
    } catch (error) {
      console.error("Project duplication error:", error);
      res.status(500).json({ message: "Server error", error });
    }
  },

  async deleteProject(req: Request, res: Response): Promise<any> {
    try {
      const { projectId } = req.params;
      // Use X-User-ID header if available
      const userId = req.header("X-User-ID") || req.user?.userId || req.user?.id;
      console.log("[deleteProject] Using userId:", userId);

      // Find the project and mark it as deleted
      const project = await Project.findOneAndUpdate(
        { _id: projectId, createdBy: userId },
        { deleted: true },
        { new: true }
      );

      if (!project) {
        return res
          .status(404)
          .json({ message: "Project not found or already deleted" });
      }

      let contracts = await Contract.find({ project: projectId });
      if (contracts.length > 0) {
        contracts.map(async (x) => {
          x.project = null;
          await x.save();
        });
      }

      let client = await Client.findById(project.client);
      if (client) {
        client.projects = client.projects.filter(
          (x) => String(x) !== String(projectId)
        );
        await client.save();
      }

      res.json({
        message: "Project deleted successfully",
        project,
      });
    } catch (error) {
      console.error("Project deletion error:", error);
      res.status(500).json({ message: "Server error", error });
    }
  },

  async getDeletedProject(req: Request, res: Response): Promise<any> {
    try {
      // Use X-User-ID header if available
      const userId = req.header("X-User-ID") || req.user?.userId || req.user?.id;
      console.log("[getDeletedProject] Using userId:", userId);

      const projects = await Project.find({
        createdBy: userId,
        deleted: true,
      });

      console.log(`[getDeletedProject] Found ${projects.length} deleted projects for user ${userId}`);

      // Check if the projects array is empty
      if (projects.length === 0) {
        return res.status(404).json({ message: "Deleted projects not found" });
      }

      res.json({ projects, type: "Project" }); // Return the array of projects
    } catch (error) {
      console.error("Get deleted project error:", error);
      res.status(500).json({ message: "Server error", error });
    }
  },

  async updateFile(
    req: Request & { filesInfo?: any[]; user?: { userId: string } },
    res: Response
  ): Promise<any> {
    try {
      // Use X-User-ID header if available
      const userId = req.header("X-User-ID") || req.user?.userId || req.user?.id;
      console.log("[updateFile] Using userId:", userId);

      const { projectId } = req.params;
      const filesInfo: any = req.filesInfo;

      if (!filesInfo) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // First check if the project belongs to the user
      const existingProject = await Project.findOne({
        _id: projectId,
        createdBy: userId
      });

      if (!existingProject) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }

      // Update user profile picture URL in the database
      const project = await Project.findById(projectId);

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      project.files.push({
        fileDisplayName: filesInfo[0]?.fileDisplayName,
        fileName: filesInfo[0]?.fileName,
        fileType: filesInfo[0]?.fileType,
      });

      project.save();

      res.json({
        message: "File updated successfully",
        project: {
          ...project.toObject(),
          files: project.files.map(async (file: any) => {
            let uri = await getSignedDownloadUrl(
              file?.fileName,
              file?.fileType
            );

            return {
              ...file,
              uri,
            };
          }),
        },
      });
    } catch (error) {
      console.error("Update file upload error:", error);
      res.status(500).json({ message: "Server error", error });
    }
  },

  async deleteFile(req: Request, res: Response): Promise<any> {
    try {
      // Use X-User-ID header if available
      const userId = req.header("X-User-ID") || req.user?.userId || req.user?.id;
      console.log("[deleteFile] Using userId:", userId);

      const { projectId, fileId } = req.params;

      // First check if the project belongs to the user
      const existingProject = await Project.findOne({
        _id: projectId,
        createdBy: userId
      });

      if (!existingProject) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }

      // Use MongoDB `$pull` to remove the file from the array
      const updatedProject = await Project.findByIdAndUpdate(
        projectId,
        {
          $pull: { files: { _id: fileId } }, // Removes the file matching the `_id`
        },
        { new: true } // Returns the updated document
      );

      if (!updatedProject) {
        return res.status(404).json({ message: "Project not found" });
      }

      res.json({
        message: "File deleted successfully",
        project: updatedProject,
      });
    } catch (error) {
      console.error("Delete file error:", error);
      res.status(500).json({ message: "Server error", error });
    }
  },
};
