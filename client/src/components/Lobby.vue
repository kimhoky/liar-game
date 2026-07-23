<script setup>
import { ref } from 'vue';
import { socket, state } from '../composables/useSocket.js';

const nicknameInput = ref('');
const roomNameInput = ref('');
const errorMsg = ref('');
const view = ref('nickname'); // nickname, roomlist

function confirmNickname() {
  const n = nicknameInput.value.trim();
  if (!n) return;
  state.nickname = n;
  view.value = 'roomlist';
}

function createRoom() {
  const roomName = roomNameInput.value.trim() || `${state.nickname}의 방`;
  socket.emit('createRoom', { roomName, nickname: state.nickname }, (res) => {
    if (!res.ok) {
      errorMsg.value = res.error || '방 생성 실패';
      return;
    }
    errorMsg.value = '';
  });
}

function joinRoom(roomId) {
  socket.emit('joinRoom', { roomId, nickname: state.nickname }, (res) => {
    if (!res.ok) {
      errorMsg.value = res.error || '입장 실패';
      return;
    }
    errorMsg.value = '';
  });
}
</script>

<template>
  <div class="lobby">
    <div v-if="view === 'nickname'" class="nickname-card">
      <h1>🎭 라이어 게임</h1>
      <p class="subtitle">닉네임을 입력하고 시작하세요</p>
      <input
        v-model="nicknameInput"
        placeholder="닉네임 입력"
        maxlength="10"
        @keyup.enter="confirmNickname"
      />
      <button class="primary" @click="confirmNickname">입장하기</button>
    </div>

    <div v-else class="roomlist-card">
      <h1>🎭 라이어 게임</h1>
      <p class="welcome">환영합니다, <strong>{{ state.nickname }}</strong>님!</p>

      <div class="create-row">
        <input v-model="roomNameInput" placeholder="새 방 이름 (선택)" maxlength="20" />
        <button class="primary" @click="createRoom">방 만들기</button>
      </div>

      <p v-if="errorMsg" class="error">{{ errorMsg }}</p>

      <h3>참여 가능한 방</h3>
      <div v-if="state.roomList.length === 0" class="empty">
        현재 열린 방이 없습니다. 새로운 방을 만들어보세요!
      </div>
      <ul class="room-items">
        <li v-for="r in state.roomList" :key="r.id" class="room-item">
          <div class="room-info">
            <span class="room-name">{{ r.name }}</span>
            <span class="room-count">{{ r.count }} / {{ r.max }}명</span>
          </div>
          <button :disabled="r.count >= r.max" @click="joinRoom(r.id)">입장</button>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.lobby {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
}

.nickname-card, .roomlist-card {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 20px;
  padding: 40px;
  width: 100%;
  max-width: 480px;
  backdrop-filter: blur(10px);
}

h1 {
  text-align: center;
  font-size: 2rem;
  margin-bottom: 8px;
  background: linear-gradient(135deg, #ff6b9d, #c73866);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle, .welcome {
  text-align: center;
  color: #cfcfe0;
  margin-bottom: 24px;
}

input {
  width: 100%;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.2);
  background: rgba(0,0,0,0.25);
  color: #fff;
  font-size: 1rem;
  margin-bottom: 12px;
  box-sizing: border-box;
}

input:focus {
  outline: none;
  border-color: #ff6b9d;
}

button {
  padding: 14px 20px;
  border-radius: 12px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  font-size: 1rem;
  transition: transform 0.1s ease, opacity 0.2s ease;
}

button:hover { transform: translateY(-1px); }
button:disabled { opacity: 0.4; cursor: not-allowed; }

.primary {
  width: 100%;
  background: linear-gradient(135deg, #ff6b9d, #c73866);
  color: white;
}

.create-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

h3 {
  margin: 20px 0 12px;
  color: #cfcfe0;
  font-size: 1rem;
}

.empty {
  color: #8a8aa3;
  text-align: center;
  padding: 20px 0;
}

.room-items {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.room-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 12px 16px;
}

.room-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.room-name { font-weight: 600; }
.room-count { font-size: 0.85rem; color: #8a8aa3; }

.room-item button {
  background: rgba(255,255,255,0.12);
  color: white;
  padding: 8px 16px;
}

.error {
  color: #ff6b6b;
  text-align: center;
  margin-bottom: 12px;
}
</style>
