import { Chat } from "../models/Chat";

export const chatController = {
  async createChat(req: any, res: any) {
    try {
      const chat = new Chat({
        ...req.body,
        createdBy: req.user?.userId,
      });
      await chat.save();
      res.status(201).json(chat);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  async updateChat(req: any, res: any) {
    try {
      const { name } = req.body;

      // Validate name
      if (!name) {
        return res.status(400).json({ error: "Chat name is required" });
      }

      const chat = await Chat.findOneAndUpdate(
        { _id: req.params.id },
        { name },
        { new: true }
      );

      if (!chat) {
        return res.status(404).json({ error: "Chat not found" });
      }

      res.json(chat);
    } catch (error: any) {
      console.error("Error updating chat:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  async getChats(req: any, res: any) {
    try {
      const chat = await Chat.find({ createdBy: req.user?.userId }).sort({
        updatedAt: -1,
      });

      if (!chat) {
        return res.status(404).json({ error: "chat not found" });
      }

      res.json(chat);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  async deleteChat(req: any, res: any) {
    try {
      const chat = await Chat.findByIdAndDelete(req.params.id);

      if (!chat) {
        return res.status(404).json({ error: "Chat not found" });
      }

      res.json({ message: "Chat deleted successfully" });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
};
