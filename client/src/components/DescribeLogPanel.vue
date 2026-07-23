<script setup>
import { ref, computed } from 'vue';
import { state } from '../composables/useSocket.js';

const expanded = ref(false);
const COLLAPSED_LINES = 4;

const shouldCollapse = computed(() => state.describeLog.length > COLLAPSED_LINES);

const visibleLog = computed(() => {
  if (expanded.value || !shouldCollapse.value) return state.describeLog;
  return state.describeLog.slice(-COLLAPSED_LINES);
});

function toggle() {
  expanded.value = !expanded.value;
}
</script>

<template>
  <div v-if="state.describeLog.length > 0" class="describe-panel">
    <div class="panel-header" @click="shouldCollapse ? toggle() : null" :class="{ clickable: shouldCollapse }">
      <span class="title">📌 발언 기록</span>
      <span v-if="shouldCollapse" class="toggle-hint">{{ expanded ? '접기 ▲' : `전체 보기 (${state.describeLog.length}개) ▼` }}</span>
    </div>
    <transition name="collapse">
      <div class="log-list">
        <div v-for="(entry, i) in visibleLog" :key="i" class="log-entry">
          <span class="nick">{{ entry.nickname }}</span>
          <span class="text">{{ entry.message }}</span>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.describe-panel {
  position: sticky;
  top: 12px;
  z-index: 5;
  background: rgba(30, 20, 45, 0.85);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 14px;
  padding: 12px 16px;
  backdrop-filter: blur(8px);
  margin-bottom: 12px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header.clickable {
  cursor: pointer;
}

.title {
  font-size: 0.85rem;
  font-weight: 700;
  color: #ffd166;
}

.toggle-hint {
  font-size: 0.78rem;
  color: #8a8aa3;
}

.log-list {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 200px;
  overflow-y: auto;
}

.log-entry {
  display: flex;
  gap: 8px;
  font-size: 0.88rem;
  line-height: 1.4;
}

.nick {
  font-weight: 700;
  color: #ffb3d1;
  flex-shrink: 0;
}

.text {
  color: #e8e8f0;
  word-break: break-word;
}
</style>
