<template>
  <div class="w-full">
    <!-- Game Header -->
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold text-purple-400">Rock Paper Scissors</h2>
      <div class="text-white text-sm">
        <span v-if="gameState === 'waiting'" class="text-yellow-300 animate-pulse">
          Waiting for partner...
        </span>
        <span v-else-if="gameState === 'playing' && !playerChoice">
          Your Turn
        </span>
        <span v-else-if="gameState === 'playing' && playerChoice && !bothPlayersReady">
          Waiting for partner...
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
      <div class="flex flex-col items-center" :class="{'opacity-60': gameState !== 'playing'}">
        <!-- Your Choice -->
        <div class="mb-6 text-center">
          <p class="text-gray-300 text-sm mb-1">Your Choice</p>
          <div class="text-5xl mb-4 h-16 flex items-center justify-center">{{ playerChoice || '❓' }}</div>
          
          <div v-if="!playerChoice && gameState === 'playing'" class="flex justify-center gap-4 mb-6">
            <button 
              @click="makeChoice('rock')" 
              class="text-3xl bg-gray-700 hover:bg-purple-700 w-16 h-16 rounded-full flex items-center justify-center transition-all transform hover:scale-110 active:scale-95"
            >
              👊
            </button>
            <button 
              @click="makeChoice('paper')" 
              class="text-3xl bg-gray-700 hover:bg-purple-700 w-16 h-16 rounded-full flex items-center justify-center transition-all transform hover:scale-110 active:scale-95"
            >
              ✋
            </button>
            <button 
              @click="makeChoice('scissors')" 
              class="text-3xl bg-gray-700 hover:bg-purple-700 w-16 h-16 rounded-full flex items-center justify-center transition-all transform hover:scale-110 active:scale-95"
            >
              ✌️
            </button>
          </div>
          
          <div class="w-full h-px bg-gray-700 my-4"></div>
          
          <!-- Partner's Choice - Only show when game is complete -->
          <p class="text-gray-300 text-sm mb-1">Partner's Choice</p>
          <div class="text-5xl mb-2 h-16 flex items-center justify-center">
            <span v-if="gameResult && partnerChoice">{{ partnerChoice }}</span>
            <span v-else-if="playerChoice" class="animate-pulse">⏳</span>
            <span v-else>❓</span>
          </div>
        </div>
        
        <!-- Game Result -->
        <div v-if="gameResult" class="text-center mt-4">
          <div class="text-xl font-bold mb-4" 
              :class="{
                'text-green-400': gameResult === 'win',
                'text-red-400': gameResult === 'lose',
                'text-yellow-400': gameResult === 'tie'
              }">
            {{ gameResult === 'win' ? 'You Win! 🎉' : gameResult === 'lose' ? 'You Lose! 😢' : 'It\'s a Tie! 🤝' }}
          </div>
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
import { ref, onMounted, onUnmounted, watch } from 'vue';
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

const { socket } = useSocket();

// Game state
const gameState = ref<'waiting' | 'playing' | 'finished'>('waiting');
const playerChoice = ref('');
const partnerChoice = ref('');
const gameResult = ref<'win' | 'lose' | 'tie' | ''>('');
const partnerReady = ref(false);
const bothPlayersReady = ref(false);

// Choices mapping
const choices = {
  rock: '👊',
  paper: '✋',
  scissors: '✌️'
};

// Generate a unique room ID or use the initial one
const roomId = ref(props.initialRoomId && props.initialRoomId.startsWith('rps-') 
  ? props.initialRoomId 
  : `rps-${Math.random().toString(36).substring(2, 8)}`);

// Copy invite link
const copied = ref(false);
const copyInviteLink = () => {
  const link = `${window.location.origin}/game/${roomId.value}`;
  navigator.clipboard.writeText(link).then(() => {
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  });
};

// Make a choice
const makeChoice = (choice: 'rock' | 'paper' | 'scissors') => {
  if (gameState.value !== 'playing' || playerChoice.value) return;
  
  playerChoice.value = choices[choice];
  
  // Send the choice to the partner
  socket.value?.emit('game-move', {
    gameType: 'rock-paper-scissors',
    move: choice,
    to: props.partnerId,
    roomId: roomId.value
  });
  
  // Check if we can determine a result
  checkGameResult();
};

// Check the game result
const checkGameResult = () => {
  if (!playerChoice.value || !partnerChoice.value) return;
  
  const playerChoiceText = Object.entries(choices)
    .find(([_, emoji]) => emoji === playerChoice.value)?.[0];
  
  const partnerChoiceText = Object.entries(choices)
    .find(([_, emoji]) => emoji === partnerChoice.value)?.[0];
  
  if (!playerChoiceText || !partnerChoiceText) return;
  
  if (playerChoiceText === partnerChoiceText) {
    gameResult.value = 'tie';
  } else if (
    (playerChoiceText === 'rock' && partnerChoiceText === 'scissors') ||
    (playerChoiceText === 'paper' && partnerChoiceText === 'rock') ||
    (playerChoiceText === 'scissors' && partnerChoiceText === 'paper')
  ) {
    gameResult.value = 'win';
  } else {
    gameResult.value = 'lose';
  }
  
  gameState.value = 'finished';
};

// Reset the game
const resetGame = () => {
  playerChoice.value = '';
  partnerChoice.value = '';
  gameResult.value = '';
  gameState.value = partnerReady.value ? 'playing' : 'waiting';
  
  // Send reset to the partner
  socket.value?.emit('game-reset', {
    gameType: 'rock-paper-scissors',
    to: props.partnerId,
    roomId: roomId.value
  });
};

// Send game invite
const sendInvite = () => {
  socket.value?.emit('game-invite', {
    gameType: 'rock-paper-scissors',
    to: props.partnerId,
    roomId: roomId.value
  });
};

// Set up socket event listeners
onMounted(() => {
  // Send ready status to partner
  socket.value?.emit('game-player-ready', {
    gameType: 'rock-paper-scissors',
    to: props.partnerId,
    roomId: roomId.value
  });

  // Listen for player ready events
  socket.value?.on('game-player-ready', (data: any) => {
    if (
      data.gameType === 'rock-paper-scissors' && 
      data.from === props.partnerId &&
      (data.roomId === roomId.value || !data.roomId)
    ) {
      partnerReady.value = true;
      
      // If we're in waiting state and partner is ready, we can start playing
      if (gameState.value === 'waiting') {
        gameState.value = 'playing';
        
        // Let partner know we're also ready
        socket.value?.emit('game-player-ready', {
          gameType: 'rock-paper-scissors',
          to: props.partnerId,
          roomId: roomId.value
        });
      }
      
      // Both players are ready now
      bothPlayersReady.value = true;
    }
  });

  // Listen for game invites and game start
  socket.value?.on('game-invite', (data: any) => {
    if (
      data.gameType === 'rock-paper-scissors' && 
      data.from === props.partnerId
    ) {
      // If joining a room, use that room ID
      if (data.roomId) {
        roomId.value = data.roomId;
      }
      
      // Accept the invite, but don't start playing until both are ready
      socket.value?.emit('game-invite-accept', {
        gameType: 'rock-paper-scissors',
        to: props.partnerId,
        roomId: roomId.value
      });
      
      // Also send ready status
      socket.value?.emit('game-player-ready', {
        gameType: 'rock-paper-scissors',
        to: props.partnerId,
        roomId: roomId.value
      });
    }
  });
  
  socket.value?.on('game-invite-accept', (data: any) => {
    if (
      data.gameType === 'rock-paper-scissors' && 
      data.from === props.partnerId
    ) {
      // Don't start playing until both are ready
      if (partnerReady.value) {
        gameState.value = 'playing';
        bothPlayersReady.value = true;
      }
    }
  });

  // Check for game in URL (for direct joining)
  const path = window.location.pathname;
  const pathMatch = path.match(/\/game\/(rps-[a-z0-9]+)/);
  
  if (pathMatch && pathMatch[1]) {
    roomId.value = pathMatch[1];
    
    // Notify partner we're joining their game
    socket.value?.emit('game-join', {
      gameType: 'rock-paper-scissors',
      roomId: roomId.value,
      to: props.partnerId
    });
    
    // Also send ready status
    socket.value?.emit('game-player-ready', {
      gameType: 'rock-paper-scissors',
      to: props.partnerId,
      roomId: roomId.value
    });
  } else {
    // Initial invite if we're starting a new game
    sendInvite();
  }
  
  // Listen for game moves
  socket.value?.on('game-move', (data: any) => {
    if (
      data.gameType === 'rock-paper-scissors' && 
      data.from === props.partnerId &&
      (data.roomId === roomId.value || !data.roomId)
    ) {
      partnerChoice.value = choices[data.move] || '❓';
      checkGameResult();
    }
  });
  
  // Listen for game resets
  socket.value?.on('game-reset', (data: any) => {
    if (
      data.gameType === 'rock-paper-scissors' && 
      data.from === props.partnerId &&
      (data.roomId === roomId.value || !data.roomId)
    ) {
      playerChoice.value = '';
      partnerChoice.value = '';
      gameResult.value = '';
      gameState.value = 'playing';
      partnerReady.value = true;
      bothPlayersReady.value = true;
    }
  });
});

// Clean up event listeners
onUnmounted(() => {
  socket.value?.off('game-invite');
  socket.value?.off('game-invite-accept');
  socket.value?.off('game-move');
  socket.value?.off('game-reset');
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