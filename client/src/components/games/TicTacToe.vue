<template>
  <div class="w-full">
    <!-- Game Header -->
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold text-purple-400">Tic Tac Toe</h2>
      <div class="text-white text-sm">
        <span v-if="gameState === 'waiting'" class="text-yellow-300 animate-pulse">
          Waiting for partner...
        </span>
        <span v-else-if="winner">
          {{ winner === playerSymbol ? 'You Won! 🎉' : winner === 'tie' ? "It's a Tie! 🤝" : 'You Lost! 😢' }}
        </span>
        <span v-else>
          {{ isMyTurn ? 'Your Turn' : "Partner's Turn" }}
        </span>
      </div>
    </div>
    
    <!-- Room Info & Invite - Hidden visually but kept for functionality -->
    <div v-if="roomId" class="hidden">
      <div class="text-sm text-gray-300">Room: <span class="text-purple-400">{{ roomId }}</span></div>
      <button 
        @click="copyInviteLink" 
        class="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm transition-colors"
      >
        {{ copied ? 'Copied!' : 'Invite' }}
      </button>
    </div>
    
    <!-- Game Board -->
    <div class="bg-gray-800 rounded-lg p-4 mb-4">
      <div class="flex flex-col items-center" :class="{'opacity-60': gameState === 'waiting'}">
        <!-- Player Info -->
        <div class="mb-4 text-center">
          <p class="text-gray-300 text-sm mb-2">You are: <span class="font-bold text-lg">{{ playerSymbol }}</span></p>
        </div>
        
        <!-- Board -->
        <div class="grid grid-cols-3 gap-2 mb-4">
          <button 
            v-for="(cell, index) in board" 
            :key="index"
            @click="makeMove(index)"
            :disabled="cell !== '' || !isMyTurn || winner !== null || gameState === 'waiting'"
            class="w-20 h-20 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center text-3xl font-bold transition-colors"
            :class="{
              'cursor-not-allowed': cell !== '' || !isMyTurn || winner !== null,
              'hover:bg-purple-700': isMyTurn && cell === '' && !winner && gameState === 'playing'
            }"
          >
            <span v-if="cell === 'X'" class="text-blue-400">X</span>
            <span v-else-if="cell === 'O'" class="text-green-400">O</span>
          </button>
        </div>
        
        <!-- Game Result Actions -->
        <div v-if="winner" class="text-center mt-4">
          <button 
            @click="resetGame" 
            class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg text-sm transition-colors mb-2"
          >
            Play Again
          </button>
        </div>
      </div>
    </div>
    
    <!-- Game Controls -->
    <div class="flex justify-between">
      <button 
        @click="$emit('back')" 
        class="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
      >
        Back to Games
      </button>
      
      <button 
        v-if="gameState === 'waiting'"
        @click="sendInvite" 
        class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
      >
        Invite Partner
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useSocket } from '@/services/socket';

const props = defineProps({
  partnerId: {
    type: String,
    required: true
  },
  initialRoomId: {
    type: String,
    default: null
  }
});

const emit = defineEmits(['back']);

const { socket, userId } = useSocket();

// Generate a unique room ID or use the initial one
const roomId = ref(props.initialRoomId && props.initialRoomId.startsWith('ttt-') 
  ? props.initialRoomId 
  : `ttt-${Math.random().toString(36).substring(2, 8)}`);
const copied = ref(false);

// Game state
const gameState = ref<'waiting' | 'playing' | 'finished'>('waiting');
const board = ref<string[]>(['', '', '', '', '', '', '', '', '']);
const playerSymbol = ref('X');
const partnerSymbol = ref('O');
const currentTurn = ref('X');
const winner = ref<string | null>(null);
const partnerReady = ref(false);

// Computed property to determine if it's the current player's turn
const isMyTurn = computed(() => {
  return currentTurn.value === playerSymbol.value;
});

// Make a move
const makeMove = (index: number) => {
  if (
    gameState.value !== 'playing' || 
    board.value[index] !== '' || 
    !isMyTurn.value || 
    winner.value !== null
  ) return;
  
  // Update the board locally
  board.value[index] = playerSymbol.value;
  currentTurn.value = partnerSymbol.value;
  
  // Send the move to the partner
  socket.value?.emit('game-move', {
    gameType: 'tic-tac-toe',
    move: index,
    to: props.partnerId,
    roomId: roomId.value
  });
  
  // Check for a winner
  checkWinner();
};

// Check for a winner
const checkWinner = () => {
  const winPatterns = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6]             // diagonals
  ];
  
  // Check for winning combinations
  for (const pattern of winPatterns) {
    const [a, b, c] = pattern;
    if (
      board.value[a] && 
      board.value[a] === board.value[b] && 
      board.value[a] === board.value[c]
    ) {
      winner.value = board.value[a];
      gameState.value = 'finished';
      return;
    }
  }
  
  // Check for a tie
  if (!board.value.includes('')) {
    winner.value = 'tie';
    gameState.value = 'finished';
  }
};

// Reset the game
const resetGame = () => {
  board.value = ['', '', '', '', '', '', '', '', ''];
  currentTurn.value = Math.random() > 0.5 ? playerSymbol.value : partnerSymbol.value;
  winner.value = null;
  gameState.value = partnerReady.value ? 'playing' : 'waiting';
  
  // Send reset to the partner
  socket.value?.emit('game-reset', {
    gameType: 'tic-tac-toe',
    to: props.partnerId,
    roomId: roomId.value
  });
};

// Copy invite link to clipboard
const copyInviteLink = () => {
  const link = `${window.location.origin}/game/${roomId.value}`;
  navigator.clipboard.writeText(link).then(() => {
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  });
};

// Send game invite
const sendInvite = () => {
  socket.value?.emit('game-invite', {
    gameType: 'tic-tac-toe',
    to: props.partnerId,
    roomId: roomId.value
  });
};

// Set up socket event listeners
onMounted(() => {
  // Random player symbol assignment
  if (Math.random() > 0.5) {
    playerSymbol.value = 'O';
    partnerSymbol.value = 'X';
  }
  
  // Send ready status to partner
  socket.value?.emit('game-player-ready', {
    gameType: 'tic-tac-toe',
    to: props.partnerId,
    roomId: roomId.value
  });
  
  // Listen for player ready events
  socket.value?.on('game-player-ready', (data: any) => {
    if (
      data.gameType === 'tic-tac-toe' && 
      data.from === props.partnerId &&
      (data.roomId === roomId.value || !data.roomId)
    ) {
      partnerReady.value = true;
      
      // If we're in waiting state and partner is ready, we can start playing
      if (gameState.value === 'waiting') {
        gameState.value = 'playing';
        
        // Let partner know we're also ready
        socket.value?.emit('game-player-ready', {
          gameType: 'tic-tac-toe',
          to: props.partnerId,
          roomId: roomId.value
        });
      }
    }
  });
  
  // Listen for game invites and game start
  socket.value?.on('game-invite', (data: any) => {
    if (data.gameType === 'tic-tac-toe' && data.from === props.partnerId) {
      // If joining a room, use that room ID
      if (data.roomId) {
        roomId.value = data.roomId;
      }
      
      // Accept the invite, but don't start playing until both are ready
      socket.value?.emit('game-invite-accept', {
        gameType: 'tic-tac-toe',
        to: props.partnerId,
        roomId: roomId.value
      });
      
      // Also send ready status
      socket.value?.emit('game-player-ready', {
        gameType: 'tic-tac-toe',
        to: props.partnerId,
        roomId: roomId.value
      });
    }
  });
  
  socket.value?.on('game-invite-accept', (data: any) => {
    if (data.gameType === 'tic-tac-toe' && data.from === props.partnerId) {
      // Don't start playing until both are ready
      if (partnerReady.value) {
        gameState.value = 'playing';
      }
    }
  });
  
  // Listen for game moves
  socket.value?.on('game-move', (data: any) => {
    if (
      data.gameType === 'tic-tac-toe' && 
      data.from === props.partnerId &&
      (data.roomId === roomId.value || !data.roomId)
    ) {
      board.value[data.move] = partnerSymbol.value;
      currentTurn.value = playerSymbol.value;
      checkWinner();
    }
  });
  
  // Listen for game resets
  socket.value?.on('game-reset', (data: any) => {
    if (
      data.gameType === 'tic-tac-toe' && 
      data.from === props.partnerId &&
      (data.roomId === roomId.value || !data.roomId)
    ) {
      board.value = ['', '', '', '', '', '', '', '', ''];
      currentTurn.value = Math.random() > 0.5 ? playerSymbol.value : partnerSymbol.value;
      winner.value = null;
      gameState.value = 'playing';
      partnerReady.value = true;
    }
  });
  
  // Check for game in URL (for direct joining)
  const path = window.location.pathname;
  const pathMatch = path.match(/\/game\/(ttt-[a-z0-9]+)/);
  
  if (pathMatch && pathMatch[1]) {
    roomId.value = pathMatch[1];
    
    // Notify partner we're joining their game
    socket.value?.emit('game-join', {
      gameType: 'tic-tac-toe',
      roomId: roomId.value,
      to: props.partnerId
    });
    
    // Also send ready status
    socket.value?.emit('game-player-ready', {
      gameType: 'tic-tac-toe',
      to: props.partnerId,
      roomId: roomId.value
    });
  } else {
    // Initial invite if we're starting a new game
    sendInvite();
  }
});

// Clean up event listeners
onUnmounted(() => {
  socket.value?.off('game-invite');
  socket.value?.off('game-invite-accept');
  socket.value?.off('game-move');
  socket.value?.off('game-reset');
  socket.value?.off('game-join');
  socket.value?.off('game-player-ready');
});
</script>

<style scoped>
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style> 