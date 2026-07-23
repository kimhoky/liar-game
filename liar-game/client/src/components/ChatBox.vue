<script setup>
import { ref, nextTick, watch, computed } from 'vue';
import { socket, state } from '../composables/useSocket.js';

const input = ref('');
const listRef = ref(null);
const showAlert = ref(false);
let alertTimer = null;

const isDescribePhase = computed(() => state.status === 'DESCRIBE');
const isMyTurn = computed(() => state.currentTurn?.playerId === socket.id);
const canSendInDescribe = computed(() => isDescribePhase.value && isMyTurn.value && !state.mySpoken);

const placeholder = computed(() => {
  if (!isDescribePhase.value) return '메시지를 입력하세요...';
  if (isMyTurn.value && !state.mySpoken) return '지금 당신 차례입니다! 제시어를 설명해보세요 (1회만 전송 가능)';
  return '지금은 다른 사람의 발언 차례입니다';
});

function send() {
  const msg = input.value.trim();
  if (!msg) return;

  if (isDescribePhase.value && !canSendInDescribe.value) {
    input.value = '';
    return;
  }

  socket.emit('chatMessage', { roomId: state.roomId, message: msg });
  input.value = '';
}

watch(() => state.notYourTurnAlert, () => {
  showAlert.value = true;
  clearTimeout(alertTimer);
  alertTimer = setTimeout(() => { showAlert.value = false; }, 2500);
});

watch(() => state.chatMessages.length, async () => {
  await nextTick();
  if (listRef.value) listRef.value.scrollTop = listRef.value.scrollHeight;
});
</script>

<template>
  <div class="chatbox">
    <div v-if="showAlert" class="alert-banner">⚠️ 발언 시간이 아닙니다</div>
    <div class="messages" ref="listRef">
      <div v-for="(m, i) in state.chatMessages" :key="i" class="msg">
        <span class="nick" :class="{ me: m.playerId === socket.id }">{{ m.nickname }}</span>
        <span class="text">{{ m.message }}</span>
      </div>
      <div v-if="isDescribePhase" class="describe-notice">
        순서대로 발언하는 시간입니다. 자기 차례에 한 번만 메시지를 보낼 수 있어요.
      </div>
    </div>
    <div class="input-row">
      <input
        v-model="input"
        :placeholder="placeholder"
        maxlength="200"
        @keyup.enter="send"
      />
      <button @click="send">전송</button>
    </div>
  </div>
</template>

<style scoped>
.alert-banner {
  background: rgba(220,38,38,0.25);
  color: #ff9999;
  text-align: center;
  font-size: 0.85rem;
  padding: 8px;
  font-weight: 600;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.describe-notice {
  text-align: center;
  color: #8a8aa3;
  font-size: 0.8rem;
  padding: 10px 0;
}

.chatbox {
  display: flex;
  flex-direction: column;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px;
  overflow: hidden;
  height: 100%;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 200px;
  max-height: 360px;
}

.msg {
  display: flex;
  gap: 8px;
  font-size: 0.9rem;
  line-height: 1.4;
}

.nick {
  font-weight: 700;
  color: #ffb3d1;
  flex-shrink: 0;
}

.nick.me { color: #4ade80; }

.text {
  color: #e8e8f0;
  word-break: break-word;
}

.input-row {
  display: flex;
  border-top: 1px solid rgba(255,255,255,0.1);
}

.input-row input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 12px 14px;
  color: white;
  font-size: 0.9rem;
}

.input-row input:focus { outline: none; }

.input-row button {
  border: none;
  background: linear-gradient(135deg, #ff6b9d, #c73866);
  color: white;
  padding: 0 20px;
  cursor: pointer;
  font-weight: 600;
}
</style>
