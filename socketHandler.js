const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const Chat = require("../models/Chat");
const User = require("../models/User");
const logger = require("../utils/logger");

let io;
const onlineUsers = new Map(); // userId -> socketId

const initSocket = (server) => {
  io = new Server(server, {
    cors: { origin: process.env.CLIENT_URL || "*", methods: ["GET", "POST"] },
    pingTimeout: 60000,
  });

  // Auth middleware for socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error("Authentication required"));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).lean();
      if (!user) return next(new Error("User not found"));
      socket.userId = decoded.id;
      socket.user = user;
      next();
    } catch (err) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    logger.info(`Socket connected: ${socket.userId}`);
    onlineUsers.set(socket.userId, socket.id);

    // Broadcast online status
    socket.broadcast.emit("user:online", socket.userId);

    // Join personal room
    socket.join(socket.userId);

    // Send message
    socket.on("message:send", async ({ chatId, content, messageType = "text" }) => {
      try {
        const chat = await Chat.findById(chatId);
        if (!chat || !chat.participants.includes(socket.userId)) {
          return socket.emit("error", { message: "Chat not found or unauthorized" });
        }

        const newMessage = { sender: socket.userId, content, messageType };
        chat.messages.push(newMessage);
        chat.lastMessage = content;
        chat.lastMessageAt = new Date();
        await chat.save();

        const savedMsg = chat.messages[chat.messages.length - 1];
        const payload = { chatId, message: { ...savedMsg.toObject(), sender: socket.user } };

        // Emit to all participants
        chat.participants.forEach((participantId) => {
          io.to(participantId.toString()).emit("message:received", payload);
        });
      } catch (error) {
        logger.error(`Socket message error: ${error.message}`);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Typing indicator
    socket.on("typing:start", ({ chatId }) => {
      socket.to(chatId).emit("typing:started", { userId: socket.userId, chatId });
    });

    socket.on("typing:stop", ({ chatId }) => {
      socket.to(chatId).emit("typing:stopped", { userId: socket.userId, chatId });
    });

    // Mark messages as read
    socket.on("messages:read", async ({ chatId }) => {
      try {
        await Chat.updateMany(
          { _id: chatId, "messages.sender": { $ne: socket.userId } },
          { $set: { "messages.$[msg].isRead": true, "messages.$[msg].readAt": new Date() } },
          { arrayFilters: [{ "msg.isRead": false }] }
        );
        socket.to(chatId).emit("messages:read", { chatId, readBy: socket.userId });
      } catch (error) {
        logger.error(`Read receipt error: ${error.message}`);
      }
    });

    // Disconnect
    socket.on("disconnect", () => {
      onlineUsers.delete(socket.userId);
      socket.broadcast.emit("user:offline", socket.userId);
      logger.info(`Socket disconnected: ${socket.userId}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};

const isUserOnline = (userId) => onlineUsers.has(userId);

module.exports = { initSocket, getIO, isUserOnline };
