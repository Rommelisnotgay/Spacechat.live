import { Server, Socket } from 'socket.io';

interface GameInvite {
  gameType: string;
  to: string;
  roomId?: string;
}

interface GameMove {
  gameType: string;
  move: any;
  to: string;
  roomId?: string;
}

interface GameData {
  gameType: string;
  data: any;
  to: string;
  roomId?: string;
}

interface GameAnswer {
  gameType: string;
  answer: any;
  to: string;
  roomId?: string;
}

interface GameEnd {
  gameType: string;
  result: any;
  to: string;
  roomId?: string;
}

interface GameReset {
  gameType: string;
  to: string;
  roomId?: string;
}

interface GamePlayerReady {
  gameType: string;
  to: string;
  roomId?: string;
}

interface GameJoin {
  gameType: string;
  to: string;
  roomId: string;
}

type UserInfo = {
  socketId: string;
  vibe?: string;
  preferences?: Record<string, any>;
  nickname?: string;
};

export const setupGameEvents = (io: Server, socket: Socket, activeUsers: Map<string, UserInfo>) => {
  // Game invite
  socket.on('game-invite', (data: GameInvite) => {
    const targetUserInfo = activeUsers.get(data.to);
    
    if (targetUserInfo) {
      io.to(targetUserInfo.socketId).emit('game-invite', {
        gameType: data.gameType,
        from: socket.data.userId,
        roomId: data.roomId
      });
      
      console.log(`Game invite: ${socket.data.userId} invited ${data.to} to play ${data.gameType}`);
    }
  });
  
  // Game invite accept
  socket.on('game-invite-accept', (data: GameInvite) => {
    const targetUserInfo = activeUsers.get(data.to);
    
    if (targetUserInfo) {
      io.to(targetUserInfo.socketId).emit('game-invite-accept', {
        gameType: data.gameType,
        from: socket.data.userId,
        roomId: data.roomId
      });
      
      console.log(`Game invite accepted: ${socket.data.userId} accepted ${data.to}'s invitation to play ${data.gameType}`);
    }
  });
  
  // Game invite decline
  socket.on('game-invite-decline', (data: { to: string }) => {
    const targetUserInfo = activeUsers.get(data.to);
    
    if (targetUserInfo) {
      io.to(targetUserInfo.socketId).emit('game-invite-decline', {
        from: socket.data.userId
      });
      
      console.log(`Game invite declined: ${socket.data.userId} declined ${data.to}'s invitation`);
    }
  });
  
  // Game invite cancel
  socket.on('game-invite-cancel', (data: { to: string }) => {
    const targetUserInfo = activeUsers.get(data.to);
    
    if (targetUserInfo) {
      io.to(targetUserInfo.socketId).emit('game-invite-cancel', {
        from: socket.data.userId
      });
      
      console.log(`Game invite canceled: ${socket.data.userId} canceled invitation to ${data.to}`);
    }
  });
  
  // Game join (for direct URL joining)
  socket.on('game-join', (data: GameJoin) => {
    const targetUserInfo = activeUsers.get(data.to);
    
    if (targetUserInfo) {
      io.to(targetUserInfo.socketId).emit('game-join', {
        gameType: data.gameType,
        from: socket.data.userId,
        roomId: data.roomId
      });
      
      console.log(`Game join: ${socket.data.userId} joined ${data.to}'s ${data.gameType} game in room ${data.roomId}`);
    }
  });
  
  // Game move
  socket.on('game-move', (data: GameMove) => {
    const targetUserInfo = activeUsers.get(data.to);
    
    if (targetUserInfo) {
      io.to(targetUserInfo.socketId).emit('game-move', {
        gameType: data.gameType,
        move: data.move,
        from: socket.data.userId,
        roomId: data.roomId
      });
      
      console.log(`Game move: ${socket.data.userId} made a move in ${data.gameType} game with ${data.to}`);
    }
  });
  
  // Game data (for shared game state)
  socket.on('game-data', (data: GameData) => {
    const targetUserInfo = activeUsers.get(data.to);
    
    if (targetUserInfo) {
      io.to(targetUserInfo.socketId).emit('game-data', {
        gameType: data.gameType,
        data: data.data,
        from: socket.data.userId,
        roomId: data.roomId
      });
      
      console.log(`Game data: ${socket.data.userId} sent game data to ${data.to}`);
    }
  });
  
  // Game answer (for trivia)
  socket.on('game-answer', (data: GameAnswer) => {
    const targetUserInfo = activeUsers.get(data.to);
    
    if (targetUserInfo) {
      io.to(targetUserInfo.socketId).emit('game-answer', {
        gameType: data.gameType,
        answer: data.answer,
        from: socket.data.userId,
        roomId: data.roomId
      });
      
      console.log(`Game answer: ${socket.data.userId} sent an answer to ${data.to}`);
    }
  });
  
  // Game end
  socket.on('game-end', (data: GameEnd) => {
    const targetUserInfo = activeUsers.get(data.to);
    
    if (targetUserInfo) {
      io.to(targetUserInfo.socketId).emit('game-end', {
        gameType: data.gameType,
        result: data.result,
        from: socket.data.userId,
        roomId: data.roomId
      });
      
      console.log(`Game ended: ${socket.data.userId} ended game with ${data.to}`);
    }
  });
  
  // Game reset
  socket.on('game-reset', (data: GameReset) => {
    const targetUserInfo = activeUsers.get(data.to);
    
    if (targetUserInfo) {
      io.to(targetUserInfo.socketId).emit('game-reset', {
        gameType: data.gameType,
        from: socket.data.userId,
        roomId: data.roomId
      });
      
      console.log(`Game reset: ${socket.data.userId} reset game with ${data.to}`);
    }
  });
  
  // Player ready for game
  socket.on('game-player-ready', (data: GamePlayerReady) => {
    const targetUserInfo = activeUsers.get(data.to);
    
    if (targetUserInfo) {
      io.to(targetUserInfo.socketId).emit('game-player-ready', {
        gameType: data.gameType,
        from: socket.data.userId,
        roomId: data.roomId
      });
      
      console.log(`Player ready: ${socket.data.userId} is ready to play ${data.gameType} with ${data.to}`);
    }
  });
  
  // Game close
  socket.on('game-close', (data: { to: string }) => {
    const targetUserInfo = activeUsers.get(data.to);
    
    if (targetUserInfo) {
      io.to(targetUserInfo.socketId).emit('game-close', {
        from: socket.data.userId
      });
      
      console.log(`Game closed: ${socket.data.userId} closed game with ${data.to}`);
    }
  });
};
