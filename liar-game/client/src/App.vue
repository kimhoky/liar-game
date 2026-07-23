<script setup>
import { computed } from 'vue';
import { state } from './composables/useSocket.js';
import Lobby from './components/Lobby.vue';
import WaitingRoom from './components/WaitingRoom.vue';
import GameBoard from './components/GameBoard.vue';

const inRoom = computed(() => !!state.roomId);
const inGame = computed(() =>
  ['DESCRIBE', 'DISCUSSION', 'VOTE', 'DEFENSE', 'FINAL_VOTE', 'GUESS', 'REVEAL'].includes(state.status)
);
</script>

<template>
  <div class="app-shell">
    <Lobby v-if="!inRoom" />
    <GameBoard v-else-if="inGame" />
    <WaitingRoom v-else />
  </div>
</template>

<style>
* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Malgun Gothic', sans-serif;
}

.app-shell {
  min-height: 100vh;
  background: radial-gradient(circle at 20% 20%, #2a1a3d, #14101f 60%);
  color: #f0f0f5;
}
</style>
