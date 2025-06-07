<template>
  <div class="game-selector">
    <div v-if="!selectedGame" class="game-list">
      <h3 class="text-xl font-bold mb-4 text-center text-purple-400">Choose a Game</h3>
      
      <div class="grid grid-cols-1 gap-4 mb-4">
        <button 
          @click="selectGame('rock-paper-scissors')" 
          class="p-4 bg-gray-800 rounded-lg flex items-center transition-all hover:bg-gray-700"
        >
          <div class="w-12 h-12 bg-orange-600/30 rounded-full flex items-center justify-center mr-4">
            <span class="text-2xl">👊</span>
          </div>
          <div class="flex-1">
            <h4 class="font-bold">Rock Paper Scissors</h4>
            <p class="text-sm text-gray-300">Classic hand game</p>
          </div>
        </button>
        
        <button 
          @click="selectGame('tic-tac-toe')" 
          class="p-4 bg-gray-800 rounded-lg flex items-center transition-all hover:bg-gray-700"
        >
          <div class="w-12 h-12 bg-blue-600/30 rounded-full flex items-center justify-center mr-4">
            <span class="text-2xl">⭕</span>
          </div>
          <div class="flex-1">
            <h4 class="font-bold">Tic-Tac-Toe</h4>
            <p class="text-sm text-gray-300">Classic game of X's and O's</p>
          </div>
        </button>
      </div>
      
      <div class="text-center">
        <button 
          @click="$emit('close')" 
          class="px-4 py-2 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
    
    <div v-else-if="waitingForAccept" class="text-center p-4">
      <div class="animate-pulse mb-4">
        <div class="w-16 h-16 bg-purple-600/30 rounded-full flex items-center justify-center mx-auto mb-2">
          <span class="text-2xl">⏳</span>
        </div>
        <h3 class="text-xl font-bold text-purple-400">Waiting for partner to accept...</h3>
      </div>
      
      <button 
        @click="cancelGame" 
        class="px-4 py-2 bg-red-600 rounded-full hover:bg-red-700 transition-colors"
      >
        Cancel
      </button>
    </div>
    
    <div v-else-if="showGameInvite" class="text-center p-4">
      <div class="mb-4">
        <div class="w-16 h-16 bg-green-600/30 rounded-full flex items-center justify-center mx-auto mb-2">
          <span class="text-2xl">🎮</span>
        </div>
        <h3 class="text-xl font-bold mb-2 text-purple-400">Game Invitation</h3>
        <p>Your partner wants to play {{ inviteGameName }}</p>
      </div>
      
      <div class="flex justify-center gap-4">
        <button 
          @click="acceptInvite" 
          class="px-4 py-2 bg-green-600 rounded-full hover:bg-green-700 transition-colors"
        >
          Accept
        </button>
        <button 
          @click="declineInvite" 
          class="px-4 py-2 bg-red-600 rounded-full hover:bg-red-700 transition-colors"
        >
          Decline
        </button>
      </div>
    </div>
    
    <div v-else>
      <TicTacToe 
        v-if="selectedGame === 'tic-tac-toe'" 
        :partner-id="partnerId"
        @back="closeGame"
      />
      
      <RockPaperScissors 
        v-if="selectedGame === 'rock-paper-scissors'" 
        :partner-id="partnerId"
        @back="closeGame"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useSocket } from '@/services/socket';
import TicTacToe from './TicTacToe.vue';
import RockPaperScissors from './RockPaperScissors.vue';

const props = defineProps({
  partnerId: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['close']);

const { socket } = useSocket();

const selectedGame = ref<string | null>(null);
const waitingForAccept = ref(false);
const showGameInvite = ref(false);
const inviteGameType = ref<string | null>(null);

// Game name mapping
const gameNames: Record<string, string> = {
  'tic-tac-toe': 'Tic-Tac-Toe',
  'rock-paper-scissors': 'Rock Paper Scissors'
};

// Computed for game name
const inviteGameName = computed(() => {
  return inviteGameType.value ? gameNames[inviteGameType.value] || inviteGameType.value : '';
});

// Select a game to play
const selectGame = (gameType: string) => {
  selectedGame.value = null;
  waitingForAccept.value = true;
  
  // Send game invite to partner
  socket.value?.emit('game-invite', {
    gameType,
    to: props.partnerId
  });
  
  // Set a timeout in case partner doesn't respond
  setTimeout(() => {
    if (waitingForAccept.value) {
      waitingForAccept.value = false;
      selectedGame.value = null;
    }
  }, 30000); // 30 seconds timeout
};

// Cancel game selection
const cancelGame = () => {
  // Notify partner
  if (waitingForAccept.value) {
    socket.value?.emit('game-invite-cancel', {
      to: props.partnerId
    });
  }
  
  waitingForAccept.value = false;
  showGameInvite.value = false;
  selectedGame.value = null;
  inviteGameType.value = null;
};

// Accept game invite
const acceptInvite = () => {
  if (!inviteGameType.value) return;
  
  selectedGame.value = inviteGameType.value;
  showGameInvite.value = false;
  
  // Notify partner
  socket.value?.emit('game-invite-accept', {
    gameType: inviteGameType.value,
    to: props.partnerId
  });
};

// Decline game invite
const declineInvite = () => {
  // Notify partner
  socket.value?.emit('game-invite-decline', {
    to: props.partnerId
  });
  
  showGameInvite.value = false;
  inviteGameType.value = null;
};

// Close game
const closeGame = () => {
  selectedGame.value = null;
  waitingForAccept.value = false;
  showGameInvite.value = false;
  inviteGameType.value = null;
  
  // Notify partner
  socket.value?.emit('game-close', {
    to: props.partnerId
  });
  
  emit('close');
};

// Set up socket event listeners
onMounted(() => {
  // Handle game invites from partner
  socket.value?.on('game-invite', (data: any) => {
    if (data.from === props.partnerId) {
      inviteGameType.value = data.gameType;
      showGameInvite.value = true;
    }
  });
  
  // Handle invite acceptance
  socket.value?.on('game-invite-accept', (data: any) => {
    if (data.from === props.partnerId) {
      if (waitingForAccept.value) {
        waitingForAccept.value = false;
        selectedGame.value = data.gameType;
      }
    }
  });
  
  // Handle invite declination
  socket.value?.on('game-invite-decline', (data: any) => {
    if (data.from === props.partnerId) {
      waitingForAccept.value = false;
      selectedGame.value = null;
    }
  });
  
  // Handle invite cancellation
  socket.value?.on('game-invite-cancel', (data: any) => {
    if (data.from === props.partnerId) {
      showGameInvite.value = false;
      inviteGameType.value = null;
    }
  });
  
  // Handle game close
  socket.value?.on('game-close', (data: any) => {
    if (data.from === props.partnerId) {
      selectedGame.value = null;
      waitingForAccept.value = false;
      showGameInvite.value = false;
      inviteGameType.value = null;
    }
  });
});

// Clean up event listeners
onUnmounted(() => {
  socket.value?.off('game-invite');
  socket.value?.off('game-invite-accept');
  socket.value?.off('game-invite-decline');
  socket.value?.off('game-invite-cancel');
  socket.value?.off('game-close');
});
</script> 