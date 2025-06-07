<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
    <div class="bg-gray-900 rounded-lg w-full max-w-md mx-auto p-6 shadow-xl border border-purple-500/30">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-2">
          <span class="text-purple-400 text-xl">🎮</span>
          <h2 class="text-lg font-semibold text-purple-400">Space Games</h2>
        </div>
        <button 
          @click="$emit('close')" 
          class="text-gray-400 hover:text-white text-xl"
        >
          ✕
        </button>
      </div>
      
      <!-- Games Grid -->
      <div v-if="!selectedGame" class="grid grid-cols-2 gap-4 mb-6">
        <!-- Rock Paper Scissors -->
        <button 
          class="bg-gray-800 hover:bg-gray-700 rounded-lg p-4 text-center transition-colors h-32 flex flex-col items-center justify-center"
          @click="selectGame('rock-paper-scissors')"
          :disabled="!isConnected"
          :class="{'opacity-50 cursor-not-allowed': !isConnected}"
        >
          <div class="text-3xl mb-2">👊</div>
          <div class="text-sm font-medium text-white">Rock Paper Scissors</div>
          <div class="text-xs text-gray-400">vs Partner</div>
        </button>
        
        <!-- Sound Game -->
        <button 
          class="bg-gray-800 hover:bg-gray-700 rounded-lg p-4 text-center transition-colors h-32 flex flex-col items-center justify-center"
          @click="selectGame('sound-game')"
          :disabled="!isConnected"
          :class="{'opacity-50 cursor-not-allowed': !isConnected}"
        >
          <div class="text-3xl mb-2">🎵</div>
          <div class="text-sm font-medium text-white">Sound Game</div>
          <div class="text-xs text-gray-400">Voice Challenge</div>
        </button>
        
        <!-- Tic Tac Toe -->
        <button 
          class="bg-gray-800 hover:bg-gray-700 rounded-lg p-4 text-center transition-colors h-32 flex flex-col items-center justify-center"
          @click="selectGame('tic-tac-toe')"
          :disabled="!isConnected"
          :class="{'opacity-50 cursor-not-allowed': !isConnected}"
        >
          <div class="text-3xl mb-2">⭕</div>
          <div class="text-sm font-medium text-white">Tic-Tac-Toe</div>
          <div class="text-xs text-gray-400">vs Partner</div>
        </button>
        
        <!-- Word Galaxy -->
        <button 
          class="bg-gray-800 hover:bg-gray-700 rounded-lg p-4 text-center transition-colors h-32 flex flex-col items-center justify-center"
          @click="selectGame('word-galaxy')"
          :disabled="!isConnected"
          :class="{'opacity-50 cursor-not-allowed': !isConnected}"
        >
          <div class="text-3xl mb-2">💭</div>
          <div class="text-sm font-medium text-white">Word Galaxy</div>
          <div class="text-xs text-gray-400">Brain Game</div>
        </button>
      </div>
      
      <!-- Connection Notice -->
      <p v-if="!isConnected && !selectedGame" class="text-center text-sm text-yellow-300 animate-pulse">
        Connect to play with others
      </p>
      
      <!-- Game Area - TicTacToe -->
      <div v-if="selectedGame === 'tic-tac-toe'">
        <TicTacToe 
          :partner-id="partnerId"
          :initial-room-id="props.initialGameRoomId"
          @back="backToGames"
        />
      </div>
      
      <!-- Game Area - Rock Paper Scissors -->
      <div v-if="selectedGame === 'rock-paper-scissors'">
        <RockPaperScissors 
          :partner-id="partnerId"
          :initial-room-id="props.initialGameRoomId"
          @back="backToGames"
        />
      </div>
      
      <!-- Other games placeholders -->
      <div v-if="selectedGame && selectedGame !== 'tic-tac-toe' && selectedGame !== 'rock-paper-scissors'" class="text-center py-8">
        <p class="text-white mb-4">Game in development</p>
        <button @click="backToGames" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded">
          Back to Games
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useSocket } from '@/services/socket';
import TicTacToe from './games/TicTacToe.vue';
import RockPaperScissors from './games/RockPaperScissors.vue';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  isConnected: {
    type: Boolean,
    default: false
  },
  partnerId: {
    type: String,
    required: true
  },
  initialGameRoomId: {
    type: String,
    default: null
  }
});

const emit = defineEmits(['close', 'select-game']);

const { socket } = useSocket();
const selectedGame = ref('');

// Select a game
const selectGame = (game: string) => {
  if (props.isConnected) {
    selectedGame.value = game;
    emit('select-game', game);
    
    // Send game invite to partner
    socket.value?.emit('game-invite', {
      gameType: game,
      to: props.partnerId
    });
  }
};

// Go back to game selection
const backToGames = () => {
  selectedGame.value = '';
};

// Check for a game room ID (for direct joining)
watch(() => props.initialGameRoomId, (roomId) => {
  if (roomId) {
    // Extract game type from room ID
    if (roomId.startsWith('ttt-')) {
      selectedGame.value = 'tic-tac-toe';
      // Will be passed to the TicTacToe component
    } else if (roomId.startsWith('rps-')) {
      selectedGame.value = 'rock-paper-scissors';
      // Will be passed to the RockPaperScissors component
    }
  }
}, { immediate: true });

</script>

<style scoped>
/* Animation for pulse effect */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style> 