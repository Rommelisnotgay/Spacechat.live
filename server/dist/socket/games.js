"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupGameEvents = void 0;
const setupGameEvents = (io, socket, activeUsers) => {
    // Game invite
    socket.on('game-invite', (data) => {
        const targetUserInfo = activeUsers.get(data.to);
        if (targetUserInfo) {
            io.to(targetUserInfo.socketId).emit('game-invite', {
                gameType: data.gameType,
                from: socket.data.userId
            });
            console.log(`Game invite: ${socket.data.userId} invited ${data.to} to play ${data.gameType}`);
        }
    });
    // Game invite accept
    socket.on('game-invite-accept', (data) => {
        const targetUserInfo = activeUsers.get(data.to);
        if (targetUserInfo) {
            io.to(targetUserInfo.socketId).emit('game-invite-accept', {
                gameType: data.gameType,
                from: socket.data.userId
            });
            console.log(`Game invite accepted: ${socket.data.userId} accepted ${data.to}'s invitation to play ${data.gameType}`);
        }
    });
    // Game invite decline
    socket.on('game-invite-decline', (data) => {
        const targetUserInfo = activeUsers.get(data.to);
        if (targetUserInfo) {
            io.to(targetUserInfo.socketId).emit('game-invite-decline', {
                from: socket.data.userId
            });
            console.log(`Game invite declined: ${socket.data.userId} declined ${data.to}'s invitation`);
        }
    });
    // Game invite cancel
    socket.on('game-invite-cancel', (data) => {
        const targetUserInfo = activeUsers.get(data.to);
        if (targetUserInfo) {
            io.to(targetUserInfo.socketId).emit('game-invite-cancel', {
                from: socket.data.userId
            });
            console.log(`Game invite canceled: ${socket.data.userId} canceled invitation to ${data.to}`);
        }
    });
    // Game move
    socket.on('game-move', (data) => {
        const targetUserInfo = activeUsers.get(data.to);
        if (targetUserInfo) {
            io.to(targetUserInfo.socketId).emit('game-move', {
                gameType: data.gameType,
                move: data.move,
                from: socket.data.userId
            });
            console.log(`Game move: ${socket.data.userId} made a move in ${data.gameType} game with ${data.to}`);
        }
    });
    // Game data (for shared game state)
    socket.on('game-data', (data) => {
        const targetUserInfo = activeUsers.get(data.to);
        if (targetUserInfo) {
            io.to(targetUserInfo.socketId).emit('game-data', {
                gameType: data.gameType,
                data: data.data,
                from: socket.data.userId
            });
            console.log(`Game data: ${socket.data.userId} sent game data to ${data.to}`);
        }
    });
    // Game answer (for trivia)
    socket.on('game-answer', (data) => {
        const targetUserInfo = activeUsers.get(data.to);
        if (targetUserInfo) {
            io.to(targetUserInfo.socketId).emit('game-answer', {
                gameType: data.gameType,
                answer: data.answer,
                from: socket.data.userId
            });
            console.log(`Game answer: ${socket.data.userId} sent an answer to ${data.to}`);
        }
    });
    // Game end
    socket.on('game-end', (data) => {
        const targetUserInfo = activeUsers.get(data.to);
        if (targetUserInfo) {
            io.to(targetUserInfo.socketId).emit('game-end', {
                gameType: data.gameType,
                result: data.result,
                from: socket.data.userId
            });
            console.log(`Game ended: ${socket.data.userId} ended game with ${data.to}`);
        }
    });
    // Game reset
    socket.on('game-reset', (data) => {
        const targetUserInfo = activeUsers.get(data.to);
        if (targetUserInfo) {
            io.to(targetUserInfo.socketId).emit('game-reset', {
                gameType: data.gameType,
                from: socket.data.userId
            });
            console.log(`Game reset: ${socket.data.userId} reset game with ${data.to}`);
        }
    });
    // Game close
    socket.on('game-close', (data) => {
        const targetUserInfo = activeUsers.get(data.to);
        if (targetUserInfo) {
            io.to(targetUserInfo.socketId).emit('game-close', {
                from: socket.data.userId
            });
            console.log(`Game closed: ${socket.data.userId} closed game with ${data.to}`);
        }
    });
};
exports.setupGameEvents = setupGameEvents;
