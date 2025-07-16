import { Socket, Server as SocketIOServer } from 'socket.io';
import jwt from "jsonwebtoken";
import { config } from '../config/config';

interface SocketSession {
  socket: Socket;
  deviceInfo?: string;
  connectionTime: Date;
}

var io: SocketIOServer | null = null;
const userSessions = new Map<string, SocketSession[]>(); // UserID -> Array of sessions

export function initSocketIo(server: any, origin: any[]) {
  io = new SocketIOServer(server, {
    cors: {
      origin,
      allowedHeaders: ["Content-Type", "Authorization"]
    },
    transports: ["websocket"],
    connectionStateRecovery: {
      maxDisconnectionDuration: 30000
    }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token || 
                socket.handshake.headers.authorization?.split(" ")[1];

    if (!token) return next();

    jwt.verify(token, config.jwtSecret, (err: any, user: any) => {
      if (err) return next(new Error('Authentication failed'));
      socket.data.user = user;
      next();
    });
  });

  io.on('connection', (socket) => {
    const userId = socket.data.user?.userId;
    if (!userId) return;

    const session: SocketSession = {
      socket,
      deviceInfo: socket.handshake.headers['user-agent'],
      connectionTime: new Date()
    };

    if (!userSessions.has(userId)) {
      userSessions.set(userId, [session]);
    } else {
      userSessions.get(userId)?.push(session);
    }

    socket.on('disconnect', (reason) => {
      const sessions = userSessions.get(userId) || [];
      const remaining = sessions.filter(s => s.socket.id !== socket.id);
      
      if (remaining.length > 0) {
        userSessions.set(userId, remaining);
      } else {
        userSessions.delete(userId);
      }
      
      console.log(`Session closed for ${userId}. Reason: ${reason}. Remaining: ${remaining.length}`);
    });
  });
}

export function broadcastToUserSessions(userId: string, event: string, data: any) {
  const sessions = userSessions.get(userId) || [];
  sessions.forEach(session => {
    try {
      session.socket.emit(event, data);
    } catch (err) {
      console.error(`Error sending to session ${session.socket.id}:`, err);
    }
  });
}

export function getUserSessions(userId: string): SocketSession[] {
  return userSessions.get(userId) || [];
}

export function getIoInstance(): SocketIOServer | null {
  return io;
}