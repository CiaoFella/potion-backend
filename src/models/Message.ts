import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    metadata: {
      model: String,
      source: String,
      processingTime: Number,
      financialDataAccessed: Boolean,
      tokensUsed: Number,
    },
    // For document/invoice attachments
    attachments: [
      {
        type: {
          type: String,
          enum: ['document', 'invoice', 'nda'],
        },
        content: String,
        data: mongoose.Schema.Types.Mixed,
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
);

// Index for efficient querying
MessageSchema.index({ chatId: 1, createdAt: 1 });
MessageSchema.index({ createdBy: 1 });

export const Message = mongoose.model('Message', MessageSchema);
