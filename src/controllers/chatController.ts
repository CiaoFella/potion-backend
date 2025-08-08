import { Chat } from '../models/Chat';
import { Message } from '../models/Message';

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
        return res.status(400).json({ error: 'Chat name is required' });
      }

      const chat = await Chat.findOneAndUpdate(
        { _id: req.params.id },
        { name },
        { new: true },
      );

      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }

      res.json(chat);
    } catch (error: any) {
      console.error('Error updating chat:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getChats(req: any, res: any) {
    try {
      const chat = await Chat.find({ createdBy: req.user?.userId }).sort({
        updatedAt: -1,
      });

      if (!chat) {
        return res.status(404).json({ error: 'chat not found' });
      }

      res.json(chat);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  async getChatById(req: any, res: any) {
    try {
      const chat = await Chat.findOne({
        _id: req.params.id,
        createdBy: req.user?.userId, // Ensure user can only access their own chats
      });

      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }

      res.json(chat);
    } catch (error: any) {
      console.error('Error fetching chat:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async deleteChat(req: any, res: any) {
    try {
      // First check if chat exists and belongs to user
      const chat = await Chat.findOne({
        _id: req.params.id,
        createdBy: req.user?.userId,
      });

      if (!chat) {
        return res.status(404).json({
          error: 'Chat not found or you do not have permission to delete it',
        });
      }

      // Delete all messages associated with this chat
      await Message.deleteMany({ chatId: req.params.id });

      // Delete the chat
      await Chat.findByIdAndDelete(req.params.id);

      res.json({
        message: 'Chat and all associated messages deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting chat:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getChatMessages(req: any, res: any) {
    try {
      // First verify user has access to this chat
      const chat = await Chat.findOne({
        _id: req.params.id,
        createdBy: req.user?.userId,
      });

      if (!chat) {
        return res.status(404).json({
          error: 'Chat not found or you do not have permission to access it',
        });
      }

      // Get messages for this chat
      const messages = await Message.find({ chatId: req.params.id })
        .sort({ createdAt: 1 })
        .lean();

      res.json(messages);
    } catch (error: any) {
      console.error('Error fetching chat messages:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async addMessage(req: any, res: any) {
    try {
      const { role, content, metadata, attachments } = req.body;
      const chatId = req.params.id;

      // Verify user has access to this chat
      const chat = await Chat.findOne({
        _id: chatId,
        createdBy: req.user?.userId,
      });

      if (!chat) {
        return res.status(404).json({
          error: 'Chat not found or you do not have permission to access it',
        });
      }

      // Create new message
      const message = new Message({
        chatId,
        role,
        content,
        metadata,
        attachments,
        createdBy: req.user?.userId,
      });

      await message.save();

      // Update chat's updatedAt timestamp
      await Chat.findByIdAndUpdate(chatId, { updatedAt: new Date() });

      res.status(201).json(message);
    } catch (error: any) {
      console.error('Error adding message:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
};
