<script setup>
import { ref, nextTick, watch } from 'vue';
import { socket, state } from '../composables/useSocket.js';

const input = ref('');
const listRef = ref(null);

function send() {
  const msg = input.value.trim();
  if (!msg) return;
  socket.emit('chatMessage', { roomId: state.roomId, message: msg });
  input.value = '';
}

watch(() => state.chatMessages.length, async () => {
  await nextTick();
  if (listRef.value) listRef.value.scrollTop = listRef.value.scrollHeight;
});
</script>

<template>
  <div class="chatbox">
    <div class="messages" ref="listRef">
      <div v-for="(m, i) in state.chatMessages" :key="i" class="msg">
        <span class="nick" :class="{ me: m.playerId === socket.id }">{{ m.nickname }}</span>
        <span class="text">{{ m.message }}</span>
      </div>
    </div>
    <div class="input-row">
      <input
        v-model="input"
        placeholder="메시지를 입력하세요..."
        maxlength="200"
        @keyup.enter="send"
      />
      <button @click="send">전송</button>
    </div>
  </div>
</template>

<style scoped>
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
