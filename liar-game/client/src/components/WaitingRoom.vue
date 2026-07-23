<script setup>
import { computed } from 'vue';
import { socket, state, resetGameState } from '../composables/useSocket.js';
import ChatBox from './ChatBox.vue';

const isHost = computed(() => state.hostId === socket.id);
const canStart = computed(() => state.players.length >= 3);

function toggleCategory(cat) {
  if (!isHost.value) return;
  let next = [...state.selectedCategories];
  if (next.includes(cat)) {
    if (next.length === 1) return; // 최소 1개 유지
    next = next.filter(c => c !== cat);
  } else {
    next.push(cat);
  }
  socket.emit('updateCategories', { roomId: state.roomId, categories: next });
}

function startGame() {
  resetGameState();
  socket.emit('startGame', { roomId: state.roomId });
}

function leaveRoom() {
  socket.emit('leaveRoom', { roomId: state.roomId });
  resetGameState();
  state.roomId = null;
  state.status = 'LOBBY';
}

function copyRoomLink() {
  navigator.clipboard?.writeText(state.roomId).catch(() => {});
}
</script>

<template>
  <div class="waiting">
    <div class="header">
      <div>
        <h2>
          <span v-if="state.isPrivate" class="lock-icon" title="비밀방">🔒</span>
          {{ state.roomName }}
        </h2>
        <span class="room-code" @click="copyRoomLink" title="클릭해서 방 코드 복사">방 코드: {{ state.roomId }}</span>
      </div>
      <button class="leave-btn" @click="leaveRoom">나가기</button>
    </div>

    <div class="content">
      <div class="players-panel">
        <h3>참가자 ({{ state.players.length }} / 8)</h3>
        <ul class="player-list">
          <li v-for="p in state.players" :key="p.id" class="player-chip">
            <span class="avatar">{{ p.nickname.charAt(0) }}</span>
            <span class="name">{{ p.nickname }}</span>
            <span v-if="p.isHost" class="host-badge">방장</span>
          </li>
        </ul>
        <p v-if="state.players.length < 3" class="notice">최소 3명이 모여야 시작할 수 있어요.</p>
      </div>

      <div class="category-panel">
        <h3>주제 선택 {{ isHost ? '(방장만 변경 가능)' : '' }}</h3>
        <div class="category-grid">
          <button
            v-for="cat in state.categories"
            :key="cat"
            :class="['cat-btn', { active: state.selectedCategories.includes(cat) }]"
            :disabled="!isHost"
            @click="toggleCategory(cat)"
          >
            {{ cat }}
          </button>
        </div>
      </div>

      <div class="chat-panel">
        <h3>대기실 채팅</h3>
        <div class="chat-wrapper">
          <ChatBox />
        </div>
      </div>
    </div>

    <div class="footer">
      <button v-if="isHost" class="start-btn" :disabled="!canStart" @click="startGame">
        게임 시작
      </button>
      <p v-else class="waiting-notice">방장이 게임을 시작하길 기다리는 중...</p>
    </div>
  </div>
</template>

<style scoped>
.waiting {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

h2 { margin: 0 0 4px; }

.room-code {
  color: #8a8aa3;
  font-size: 0.85rem;
  cursor: pointer;
}

.leave-btn {
  background: rgba(255,255,255,0.1);
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 10px;
  cursor: pointer;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.players-panel, .category-panel {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px;
  padding: 20px;
}

h3 {
  margin: 0 0 14px;
  font-size: 0.95rem;
  color: #cfcfe0;
}

.player-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.player-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255,255,255,0.08);
  border-radius: 999px;
  padding: 6px 14px 6px 6px;
}

.avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff6b9d, #c73866);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
}

.host-badge {
  background: #ffd166;
  color: #33260a;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
}

.notice {
  margin-top: 12px;
  color: #ffb347;
  font-size: 0.85rem;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 8px;
}

.cat-btn {
  padding: 10px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.05);
  color: #cfcfe0;
  cursor: pointer;
  font-size: 0.9rem;
}

.cat-btn.active {
  background: linear-gradient(135deg, #ff6b9d, #c73866);
  color: white;
  border-color: transparent;
}

.cat-btn:disabled { cursor: default; }

.footer {
  margin-top: 24px;
  text-align: center;
}

.start-btn {
  background: linear-gradient(135deg, #4ade80, #22a35a);
  color: white;
  border: none;
  padding: 16px 40px;
  border-radius: 14px;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
}

.start-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.waiting-notice { color: #8a8aa3; }

.lock-icon {
  margin-right: 6px;
}

.chat-panel {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px;
  padding: 20px;
}

.chat-wrapper {
  height: 280px;
}
</style>
