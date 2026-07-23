<script setup>
import { ref } from 'vue';
import { socket, state, setNickname } from '../composables/useSocket.js';

const nicknameInput = ref(state.nickname);
const roomNameInput = ref('');
const errorMsg = ref('');
const activeTab = ref('join'); // 'create' | 'join'

// 방 만들기 - 비밀방 설정
const isPrivateRoom = ref(false);
const newRoomPassword = ref('');

// 참여 - 비밀번호 입력 모달
const joinTargetRoom = ref(null); // { id, name }
const joinPasswordInput = ref('');
const joinErrorMsg = ref('');

function confirmNickname() {
  const n = nicknameInput.value.trim();
  if (!n) return;
  setNickname(n);
}

function editNickname() {
  nicknameInput.value = state.nickname;
  setNickname('');
}

function createRoom() {
  const roomName = roomNameInput.value.trim() || `${state.nickname}의 방`;
  const password = isPrivateRoom.value ? newRoomPassword.value.trim() : '';

  if (isPrivateRoom.value && !password) {
    errorMsg.value = '비밀번호를 입력해주세요.';
    return;
  }

  socket.emit('createRoom', { roomName, nickname: state.nickname, password }, (res) => {
    if (!res.ok) {
      errorMsg.value = res.error || '방 생성 실패';
      return;
    }
    errorMsg.value = '';
  });
}

function attemptJoin(room) {
  errorMsg.value = '';
  if (room.isPrivate) {
    joinTargetRoom.value = room;
    joinPasswordInput.value = '';
    joinErrorMsg.value = '';
    return;
  }
  doJoin(room.id, '');
}

function doJoin(roomId, password) {
  socket.emit('joinRoom', { roomId, nickname: state.nickname, password }, (res) => {
    if (!res.ok) {
      if (joinTargetRoom.value) {
        joinErrorMsg.value = res.error || '입장 실패';
      } else {
        errorMsg.value = res.error || '입장 실패';
      }
      return;
    }
    joinTargetRoom.value = null;
    errorMsg.value = '';
  });
}

function confirmJoinWithPassword() {
  if (!joinTargetRoom.value) return;
  doJoin(joinTargetRoom.value.id, joinPasswordInput.value.trim());
}

function cancelJoinModal() {
  joinTargetRoom.value = null;
}
</script>

<template>
  <div class="lobby">
    <!-- 닉네임 입력 화면 -->
    <div v-if="!state.nickname" class="nickname-card">
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

    <!-- 방 만들기 / 참여가능한 방 탭 화면 -->
    <div v-else class="roomlist-card">
      <h1>🎭 라이어 게임</h1>
      <p class="welcome">
        환영합니다, <strong>{{ state.nickname }}</strong>님!
        <button class="edit-nickname-btn" @click="editNickname">닉네임 변경</button>
      </p>

      <div class="tabs">
        <button
          :class="['tab-btn', { active: activeTab === 'join' }]"
          @click="activeTab = 'join'"
        >
          참여 가능한 방
        </button>
        <button
          :class="['tab-btn', { active: activeTab === 'create' }]"
          @click="activeTab = 'create'"
        >
          방 만들기
        </button>
      </div>

      <p v-if="errorMsg" class="error">{{ errorMsg }}</p>

      <!-- 참여가능한 방 탭 -->
      <div v-if="activeTab === 'join'" class="tab-panel">
        <div v-if="state.roomList.length === 0" class="empty">
          현재 열린 방이 없습니다. '방 만들기' 탭에서 새로운 방을 만들어보세요!
        </div>
        <ul v-else class="room-items">
          <li v-for="r in state.roomList" :key="r.id" class="room-item">
            <div class="room-info">
              <span class="room-name">
                <span v-if="r.isPrivate" class="lock-icon" title="비밀방">🔒</span>
                {{ r.name }}
              </span>
              <span class="room-count">방 코드 {{ r.id }} · {{ r.count }} / {{ r.max }}명</span>
            </div>
            <button :disabled="r.count >= r.max" @click="attemptJoin(r)">입장</button>
          </li>
        </ul>
      </div>

      <!-- 방 만들기 탭 -->
      <div v-else class="tab-panel">
        <input v-model="roomNameInput" placeholder="새 방 이름 (선택)" maxlength="20" @keyup.enter="createRoom" />

        <div class="privacy-toggle">
          <button
            :class="['privacy-btn', { active: !isPrivateRoom }]"
            @click="isPrivateRoom = false"
          >
            🌐 공개방
          </button>
          <button
            :class="['privacy-btn', { active: isPrivateRoom }]"
            @click="isPrivateRoom = true"
          >
            🔒 비밀방
          </button>
        </div>

        <input
          v-if="isPrivateRoom"
          v-model="newRoomPassword"
          type="text"
          placeholder="비밀번호 입력"
          maxlength="12"
          @keyup.enter="createRoom"
        />

        <button class="primary" @click="createRoom">방 만들기</button>
      </div>
    </div>

    <!-- 비밀방 입장 - 비밀번호 입력 모달 -->
    <div v-if="joinTargetRoom" class="modal-overlay" @click.self="cancelJoinModal">
      <div class="modal-card">
        <h3>🔒 {{ joinTargetRoom.name }}</h3>
        <p class="modal-subtitle">비밀번호를 입력해주세요.</p>
        <input
          v-model="joinPasswordInput"
          type="text"
          placeholder="비밀번호"
          maxlength="12"
          autofocus
          @keyup.enter="confirmJoinWithPassword"
        />
        <p v-if="joinErrorMsg" class="error">{{ joinErrorMsg }}</p>
        <div class="modal-buttons">
          <button class="modal-cancel-btn" @click="cancelJoinModal">취소</button>
          <button class="primary" @click="confirmJoinWithPassword">입장</button>
        </div>
      </div>
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

.subtitle {
  text-align: center;
  color: #cfcfe0;
  margin-bottom: 24px;
}

.welcome {
  text-align: center;
  color: #cfcfe0;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}

.edit-nickname-btn {
  background: rgba(255,255,255,0.1);
  color: #cfcfe0;
  padding: 4px 12px;
  font-size: 0.78rem;
  border-radius: 999px;
  font-weight: 500;
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

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  background: rgba(0,0,0,0.2);
  padding: 4px;
  border-radius: 12px;
}

.tab-btn {
  flex: 1;
  background: transparent;
  color: #8a8aa3;
  padding: 10px;
  font-size: 0.9rem;
  border-radius: 10px;
}

.tab-btn.active {
  background: linear-gradient(135deg, #ff6b9d, #c73866);
  color: white;
}

.tab-panel {
  min-height: 120px;
}

.empty {
  color: #8a8aa3;
  text-align: center;
  padding: 30px 0;
}

.room-items {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 320px;
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

.lock-icon {
  margin-right: 4px;
}

.privacy-toggle {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.privacy-btn {
  flex: 1;
  background: rgba(255,255,255,0.06);
  color: #8a8aa3;
  border: 1px solid rgba(255,255,255,0.12);
  padding: 12px;
  font-size: 0.9rem;
}

.privacy-btn.active {
  background: linear-gradient(135deg, #ff6b9d, #c73866);
  color: white;
  border-color: transparent;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
}

.modal-card {
  background: #1e1530;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 20px;
  padding: 32px;
  width: 100%;
  max-width: 360px;
}

.modal-card h3 {
  margin: 0 0 4px;
  text-align: center;
}

.modal-subtitle {
  text-align: center;
  color: #8a8aa3;
  font-size: 0.85rem;
  margin-bottom: 16px;
}

.modal-buttons {
  display: flex;
  gap: 8px;
}

.modal-buttons .primary {
  flex: 1;
}

.modal-cancel-btn {
  flex: 1;
  background: rgba(255,255,255,0.1);
  color: white;
}
</style>
