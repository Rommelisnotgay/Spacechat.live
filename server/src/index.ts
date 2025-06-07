import express, { Request, Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { setupSignalingEvents } from './socket/signaling';
import { setupChatEvents } from './socket/chat';
import { setupGameEvents } from './socket/games';

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Environment variables
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files in production
if (isProduction) {
  const clientDistPath = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDistPath));
}

// Active users map to track users by their IDs
// Maps userID to socketID and user info
type UserInfo = {
  socketId: string;
  vibe?: string;
  preferences?: Record<string, any>;
  nickname?: string;
};

const activeUsers = new Map<string, UserInfo>();

// Queue for pairing users
interface QueueUser {
  userId: string;
  vibe: string;
  joinTime: number;
  preferences?: Record<string, any>;
}

let userQueue: QueueUser[] = [];

// Rate limiting for queue joins
interface RateLimitInfo {
  lastJoinTime: number;
  joinCount: number;
}

// Rate limiting for joining queue
const queueRateLimits = new Map<string, RateLimitInfo>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute window
const MAX_JOINS_PER_WINDOW = 10; // Max 10 joins per minute

// Routes
app.get('/api/stats', (req, res) => {
  res.json({
    online: activeUsers.size,
    inQueue: userQueue.length
  });
});

// In production, serve the Vue app for all other routes
if (isProduction) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });
} else {
  app.get('/', (req: Request, res: Response) => {
    res.send('SpaceChat.live Server is running');
  });
}

// Socket.io connection handler
io.on('connection', (socket) => {
  // Assign a user ID
  const userId = uuidv4();
  socket.data.userId = userId;
  
  console.log(`User connected: ${userId}`);
  
  // Add to active users
  activeUsers.set(userId, {
    socketId: socket.id,
    nickname: `User_${userId.substring(0, 5)}`
  });
  
  // Send user ID to client
  socket.emit('user-id', userId);
  
  // Send online count to all clients
  io.emit('online-count', activeUsers.size);
  
  // Handle get online count request
  socket.on('get-online-count', () => {
    socket.emit('online-count', activeUsers.size);
  });
  
  // Setup WebRTC signaling events
  setupSignalingEvents(io, socket, activeUsers);
  
  // Setup chat events
  setupChatEvents(io, socket, activeUsers);
  
  // Setup game events
  setupGameEvents(io, socket, activeUsers);
  
  // Join queue
  socket.on('join-queue', (data: { vibe?: string, preferences?: Record<string, any> }) => {
    const userId = socket.data.userId;
    
    // Check if user is already matched with a partner
    if (socket.data.partnerId) {
      console.log(`User ${userId} already has a partner (${socket.data.partnerId}), ignoring join-queue request`);
      // Notify client that they already have an active partner
      socket.emit('already-matched', { partnerId: socket.data.partnerId });
      return;
    }
    
    // Apply rate limiting to prevent abuse
    const now = Date.now();
    const userRateLimit = queueRateLimits.get(userId) || { lastJoinTime: 0, joinCount: 0 };
    
    // Reset counter if window has expired
    if (now - userRateLimit.lastJoinTime > RATE_LIMIT_WINDOW) {
      userRateLimit.joinCount = 0;
      userRateLimit.lastJoinTime = now;
    }
    
    // Check if user has exceeded rate limit
    if (userRateLimit.joinCount >= MAX_JOINS_PER_WINDOW) {
      console.log(`Rate limit exceeded for user ${userId}`);
      socket.emit('error', { message: 'You are joining the queue too frequently. Please wait a moment.' });
      return;
    }
    
    // Update rate limit info
    userRateLimit.joinCount++;
    userRateLimit.lastJoinTime = now;
    queueRateLimits.set(userId, userRateLimit);
    
    // Remove user from queue if already in it
    removeUserFromQueue(userId);
    
    // Add user info to activeUsers map if not already present
    const userInfo = activeUsers.get(userId) || { socketId: socket.id };
    
    // Update user info with received data
    if (data.preferences) {
      userInfo.preferences = data.preferences;
    }
    
    // Update active users map
    activeUsers.set(userId, userInfo);
    
    // Add to queue
    userQueue.push({
      userId,
      vibe: data.vibe || 'any',
      joinTime: Date.now(),
      preferences: data.preferences
    });
    
    console.log(`User ${userId} joined queue with vibe: ${data.vibe || 'any'}`);
    
    // Try to match users
    matchUsers();
  });
  
  // Disconnect from partner
  socket.on('disconnect-partner', () => {
    const userId = socket.data.userId;
    
    // Store the partner ID before clearing it
    const partnerId = socket.data.partnerId;
    
    // Clear own partner connection
    socket.data.partnerId = null;
    
    if (!partnerId) {
      console.log(`User ${userId} attempted to disconnect from partner, but no partner found`);
      return;
    }
    
    console.log(`User ${userId} disconnecting from partner ${partnerId}`);
    
    // Find any partners connected to this user
    const partnerInfo = activeUsers.get(partnerId);
    if (partnerInfo) {
      const partnerSocketId = partnerInfo.socketId;
      const partnerSocket = io.sockets.sockets.get(partnerSocketId);
      
      if (partnerSocket && partnerSocket.data.partnerId === userId) {
        // Reset partner connection
        partnerSocket.data.partnerId = null;
        
        // Notify partner
        io.to(partnerSocketId).emit('partner-disconnected');
        console.log(`Notified partner ${partnerId} of disconnection`);
      }
    }
    
    // Make sure user is not in queue
    removeUserFromQueue(userId);
  });
  
  // Disconnect event
  socket.on('disconnect', () => {
    const userId = socket.data.userId;
    if (!userId) return;
    
    console.log(`User disconnected: ${userId}`);
    
    // Remove from active users
    activeUsers.delete(userId);
    
    // Remove from queue
    removeUserFromQueue(userId);
    
    // Notify any partners
    const partnerId = socket.data.partnerId;
    if (partnerId) {
      const partnerInfo = activeUsers.get(partnerId);
      if (partnerInfo) {
        const partnerSocketId = partnerInfo.socketId;
        
        // Notify partner
        io.to(partnerSocketId).emit('partner-disconnected');
        
        // Reset partner's connection too
        const partnerSocket = io.sockets.sockets.get(partnerSocketId);
        if (partnerSocket) {
          partnerSocket.data.partnerId = null;
        }
      }
    }
    
    // Update online count
    io.emit('online-count', activeUsers.size);
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${isProduction ? 'Production' : 'Development'}`);
  if (isProduction) {
    console.log('Serving client from static files');
  }
});

// Helper functions

// Remove a user from the queue
function removeUserFromQueue(userId: string) {
  const userIndex = userQueue.findIndex(queueUser => queueUser.userId === userId);
  if (userIndex !== -1) {
    userQueue.splice(userIndex, 1);
    console.log(`User ${userId} removed from queue`);
  }
}

// Match users in the queue
function matchUsers() {
  // Sort queue by join time (oldest first)
  userQueue.sort((a, b) => a.joinTime - b.joinTime);
  
  // Process each user in queue
  for (let i = 0; i < userQueue.length; i++) {
    const currentUser = userQueue[i];
    
    // Skip if user is already matched or no longer connected
    if (!activeUsers.has(currentUser.userId)) {
      userQueue.splice(i, 1);
      i--;
      continue;
    }
    
    // Find a compatible match for this user
    for (let j = i + 1; j < userQueue.length; j++) {
      const potentialMatch = userQueue[j];
      
      // Skip if potential match is already matched or no longer connected
      if (!activeUsers.has(potentialMatch.userId)) {
        userQueue.splice(j, 1);
        j--;
        continue;
      }
      
      // Check if users are compatible
      if (areUsersCompatible(currentUser, potentialMatch)) {
        // Found a match! Connect these users
        connectUsers(currentUser.userId, potentialMatch.userId);
        
        // Remove matched users from queue
        userQueue.splice(j, 1); // Remove second user first (higher index)
        userQueue.splice(i, 1); // Remove first user
        
        // Adjust index after removing elements
        i--;
        break;
      }
    }
  }
}

// Connect two users
function connectUsers(userId1: string, userId2: string) {
  console.log(`Matching users: ${userId1} and ${userId2}`);
  
  const user1Info = activeUsers.get(userId1);
  const user2Info = activeUsers.get(userId2);
  
  if (!user1Info || !user2Info) {
    console.log(`Cannot match users: One or both users are not active`);
    return;
  }
  
  const socket1 = io.sockets.sockets.get(user1Info.socketId);
  const socket2 = io.sockets.sockets.get(user2Info.socketId);
  
  if (!socket1 || !socket2) {
    console.log(`Cannot match users: One or both sockets not found`);
    return;
  }
  
  // Set partner IDs in socket data
  socket1.data.partnerId = userId2;
  socket2.data.partnerId = userId1;
  
  // Emit match event to both users
  const getCountryFromPreferences = (preferences?: Record<string, any>) => {
    return preferences?.country || 'unknown';
  };
  
  const getFlag = (country: string) => {
    // Simple emoji flag generator for common countries
    const countryToEmoji: Record<string, string> = {
      'us': '🇺🇸',
      'gb': '🇬🇧',
      'ca': '🇨🇦',
      'au': '🇦🇺',
      'de': '🇩🇪',
      'fr': '🇫🇷',
      'jp': '🇯🇵',
      'cn': '🇨🇳',
      'br': '🇧🇷',
      'in': '🇮🇳',
      'ru': '🇷🇺',
      'kr': '🇰🇷',
      'it': '🇮🇹',
      'es': '🇪🇸',
      'mx': '🇲🇽',
      'za': '🇿🇦',
      'nl': '🇳🇱',
      'unknown': '🌐'
    };
    
    return countryToEmoji[country.toLowerCase()] || '🌐';
  };
  
  // Emit match event to user 1
  socket1.emit('match', {
    partnerId: userId2,
    partnerNickname: user2Info.nickname || `User_${userId2.substring(0, 5)}`,
    partnerCountry: getCountryFromPreferences(user2Info.preferences),
    partnerFlag: getFlag(getCountryFromPreferences(user2Info.preferences))
  });
  
  // Emit match event to user 2
  socket2.emit('match', {
    partnerId: userId1,
    partnerNickname: user1Info.nickname || `User_${userId1.substring(0, 5)}`,
    partnerCountry: getCountryFromPreferences(user1Info.preferences),
    partnerFlag: getFlag(getCountryFromPreferences(user1Info.preferences))
  });
}

// Check if two users are compatible for matching
function areUsersCompatible(user1: QueueUser, user2: QueueUser): boolean {
  // Match 'any' vibe with any other vibe
  if (user1.vibe === 'any' || user2.vibe === 'any') {
    return true;
  }
  
  // Otherwise, vibes must match
  return user1.vibe === user2.vibe;
}
