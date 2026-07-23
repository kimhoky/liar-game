<script setup>
defineProps({
  remain: { type: Number, default: 0 },
  total: { type: Number, default: 60 },
  label: { type: String, default: '' }
});
</script>

<template>
  <div class="timer-badge">
    <svg viewBox="0 0 60 60" width="56" height="56">
      <circle cx="30" cy="30" r="26" stroke="rgba(255,255,255,0.12)" stroke-width="6" fill="none" />
      <circle
        cx="30" cy="30" r="26"
        stroke="url(#grad)"
        stroke-width="6"
        fill="none"
        stroke-linecap="round"
        :stroke-dasharray="2 * Math.PI * 26"
        :stroke-dashoffset="2 * Math.PI * 26 * (1 - Math.min(remain / total, 1))"
        transform="rotate(-90 30 30)"
        style="transition: stroke-dashoffset 1s linear"
      />
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ff6b9d" />
          <stop offset="100%" stop-color="#c73866" />
        </linearGradient>
      </defs>
      <text x="30" y="35" text-anchor="middle" font-size="18" fill="white" font-weight="700">{{ remain }}</text>
    </svg>
    <span v-if="label" class="label">{{ label }}</span>
  </div>
</template>

<style scoped>
.timer-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.label {
  font-size: 0.8rem;
  color: #cfcfe0;
}
</style>
