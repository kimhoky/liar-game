<script setup>
import { computed, ref } from 'vue';
import { socket, state } from '../composables/useSocket.js';
import TimerBadge from './TimerBadge.vue';
import ChatBox from './ChatBox.vue';
import DescribeLogPanel from './DescribeLogPanel.vue';

const phaseLabel = computed(() => ({
  DESCRIBE: '순서대로 설명하기',
  DISCUSSION: '자유 토론',
  VOTE: '라이어 지목 투표',
  DEFENSE: '최후 변론',
  FINAL_VOTE: '최종 결정',
  GUESS: '라이어의 마지막 기회',
  REVEAL: '결과 발표'
}[state.status] || ''));

const phaseTotalSeconds = computed(() => ({
  DESCRIBE: 15,
  DISCUSSION: state.discussionRound > 1 ? 60 : 180,
  VOTE: 30,
  DEFENSE: 30,
  FINAL_VOTE: 20,
  GUESS: 15
}[state.timerPhase] || 60));

const isMyTurn = computed(() => state.currentTurn?.playerId === socket.id);
const isAlive = computed(() => {
  const me = state.players.find(p => p.id === socket.id);
  return me ? me.alive : true;
});

function vote(targetId) {
  state.myVoteTarget = targetId;
  socket.emit('castVote', { roomId: state.roomId, targetId });
}

function finalVote(decision) {
  state.myFinalVote = decision;
  socket.emit('castFinalVote', { roomId: state.roomId, decision });
}

function playerName(id) {
  const p = state.players.find(pl => pl.id === id);
  return p ? p.nickname : '???';
}

function backToLobby() {
  socket.emit('backToLobby', { roomId: state.roomId });
}

const isHost = computed(() => state.hostId === socket.id);

const isGuesser = computed(() => state.guessLiarId === socket.id);
const guessInput = ref('');

function submitGuess() {
  const g = guessInput.value.trim();
  if (!g) return;
  socket.emit('submitGuess', { roomId: state.roomId, guess: g });
}

const sortedVoteCounts = computed(() => {
  return Object.entries(state.voteCounts)
    .map(([id, count]) => ({ id, count, name: playerName(id) }))
    .sort((a, b) => b.count - a.count);
});
</script>

<template>
  <div class="game-board">
    <div class="top-bar">
      <div class="my-word-card" v-if="state.myWord">
        <span class="label">내 제시어</span>
        <span class="word">{{ state.myWord }}</span>
        <span class="category">주제: {{ state.myCategory }}</span>
      </div>
      <div class="phase-info">
        <TimerBadge v-if="state.timerRemain > 0" :remain="state.timerRemain" :total="phaseTotalSeconds" />
        <span class="phase-name">{{ phaseLabel }}</span>
      </div>
      <div class="players-mini">
        <span
          v-for="p in state.players"
          :key="p.id"
          :class="['mini-chip', { dead: !p.alive, host: p.id === state.hostId }]"
        >
          {{ p.nickname }}
        </span>
      </div>
    </div>

    <div v-if="!isAlive" class="dead-banner">💀 탈락했습니다. 결과를 지켜보세요.</div>

    <DescribeLogPanel v-if="['DESCRIBE', 'DISCUSSION'].includes(state.status)" />

    <div class="main-area">
      <!-- DESCRIBE -->
      <div v-if="state.status === 'DESCRIBE'" class="phase-panel">
        <h3>{{ state.currentTurn?.nickname }}님의 차례 ({{ state.turnIndex + 1 }} / {{ state.turnTotal }})</h3>
        <p v-if="isMyTurn" class="highlight">지금 당신 차례입니다! 채팅으로 제시어를 설명해보세요.</p>
        <p v-else class="dim">{{ state.currentTurn?.nickname }}님이 설명 중입니다...</p>
      </div>

      <!-- DISCUSSION -->
      <div v-else-if="state.status === 'DISCUSSION'" class="phase-panel">
        <h3>자유 토론 시간</h3>
        <p class="dim">서로 질문하고 답하며 라이어를 찾아보세요.</p>
      </div>

      <!-- VOTE -->
      <div v-else-if="state.status === 'VOTE'" class="phase-panel">
        <h3>누가 라이어인가요?</h3>
        <p class="dim">{{ state.votedCount }} / {{ state.totalVoters }}명 투표 완료</p>
        <div class="vote-grid" v-if="isAlive">
          <button
            v-for="p in state.voteCandidates"
            :key="p.id"
            :class="['vote-btn', { selected: state.myVoteTarget === p.id }]"
            :disabled="p.id === socket.id"
            @click="vote(p.id)"
          >
            {{ p.nickname }}
          </button>
        </div>
        <div v-if="Object.keys(state.voteCounts).length > 0" class="vote-result">
          <h4>투표 결과</h4>
          <div v-for="v in sortedVoteCounts" :key="v.id" class="vote-row">
            <span>{{ v.name }}</span>
            <span class="count">{{ v.count }}표</span>
          </div>
          <p v-if="state.voteTied" class="tied-notice">동점입니다! 다시 토론 후 재투표합니다.</p>
        </div>
      </div>

      <!-- DEFENSE -->
      <div v-else-if="state.status === 'DEFENSE'" class="phase-panel">
        <h3>🎤 {{ state.accusedNickname }}님의 최후 변론</h3>
        <p class="dim">지목된 사람은 채팅으로 자신을 변호하세요.</p>
      </div>

      <!-- FINAL_VOTE -->
      <div v-else-if="state.status === 'FINAL_VOTE'" class="phase-panel">
        <h3>{{ state.accusedNickname }}님을 사형에 처할까요?</h3>
        <p class="dim">{{ state.finalVotedCount }} / {{ state.finalTotalVoters }}명 투표 완료</p>
        <div class="final-vote-grid" v-if="isAlive && socket.id !== state.accusedId">
          <button
            :class="['final-btn death', { selected: state.myFinalVote === 'DEATH' }]"
            @click="finalVote('DEATH')"
          >
            ⚖️ 사형
          </button>
          <button
            :class="['final-btn survive', { selected: state.myFinalVote === 'SURVIVE' }]"
            @click="finalVote('SURVIVE')"
          >
            🙏 생존
          </button>
        </div>
        <p v-else-if="socket.id === state.accusedId" class="dim">당신은 투표할 수 없습니다. 결과를 기다려주세요.</p>

        <div v-if="state.finalVoteCounts" class="final-result">
          <p>사형 {{ state.finalVoteCounts.deathCount }}표 : 생존 {{ state.finalVoteCounts.surviveCount }}표</p>
          <p class="result-text">{{ state.finalVoteCounts.isDeath ? '⚖️ 사형이 집행됩니다...' : '🙏 생존이 결정되었습니다. 토론을 계속합니다.' }}</p>
        </div>
      </div>

      <!-- GUESS -->
      <div v-else-if="state.status === 'GUESS'" class="phase-panel guess-panel">
        <h3>⚡ {{ state.guessLiarNickname }}님이 라이어였습니다!</h3>
        <p class="dim">15초 안에 시민들의 제시어를 맞추면 역전승할 수 있습니다.</p>

        <div v-if="isGuesser && !state.guessSubmitted" class="guess-input-row">
          <input
            v-model="guessInput"
            placeholder="시민 제시어를 입력하세요..."
            maxlength="30"
            @keyup.enter="submitGuess"
          />
          <button class="guess-submit-btn" @click="submitGuess">제출</button>
        </div>
        <p v-else-if="!state.guessSubmitted" class="dim">{{ state.guessLiarNickname }}님이 정답을 입력하고 있습니다...</p>

        <div v-if="state.guessSubmitted" class="guess-result">
          <p>제출한 답: <strong>{{ state.guessSubmitted.guess }}</strong></p>
          <p class="result-text">{{ state.guessSubmitted.correct ? '🎯 정답입니다! 라이어의 역전승!' : '❌ 오답입니다. 시민 승리!' }}</p>
        </div>
      </div>

      <!-- REVEAL -->
      <div v-else-if="state.status === 'REVEAL'" class="phase-panel reveal-panel">
        <h2>{{ state.gameResult?.winner === 'CITIZENS' ? '🎉 시민 승리!' : '😈 라이어 승리!' }}</h2>
        <p class="reveal-line">
          라이어는 <strong>{{ state.gameResult?.liarNickname }}</strong>님이었습니다!
        </p>
        <p v-if="state.gameResult?.guessResult === true" class="reveal-line highlight">
          라이어가 제시어를 맞춰 역전승했습니다!
        </p>
        <p v-else-if="state.gameResult?.guessResult === false" class="reveal-line dim">
          라이어가 정답을 맞추지 못했습니다.
        </p>
        <div class="word-reveal">
          <div><span class="tag">시민 제시어</span> {{ state.gameResult?.citizenWord }}</div>
          <div><span class="tag liar-tag">라이어 제시어</span> {{ state.gameResult?.liarWord }}</div>
          <div class="category-tag">주제: {{ state.gameResult?.category }}</div>
        </div>
        <button v-if="isHost" class="restart-btn" @click="backToLobby">대기실로 돌아가기</button>
        <p v-else class="dim">방장이 대기실로 돌아가길 기다리는 중...</p>
      </div>
    </div>

    <div class="chat-area">
      <ChatBox />
    </div>
  </div>
</template>

<style scoped>
.game-board {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px;
  padding: 16px 20px;
}

.my-word-card {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.my-word-card .label {
  font-size: 0.75rem;
  color: #8a8aa3;
}

.my-word-card .word {
  font-size: 1.4rem;
  font-weight: 800;
  color: #ffd166;
}

.my-word-card .category {
  font-size: 0.8rem;
  color: #cfcfe0;
}

.phase-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.phase-name {
  font-weight: 700;
  color: #ff6b9d;
}

.players-mini {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-width: 260px;
}

.mini-chip {
  background: rgba(255,255,255,0.08);
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.78rem;
}

.mini-chip.host { border: 1px solid #ffd166; }
.mini-chip.dead { opacity: 0.35; text-decoration: line-through; }

.dead-banner {
  text-align: center;
  background: rgba(255,0,0,0.12);
  border: 1px solid rgba(255,0,0,0.3);
  border-radius: 12px;
  padding: 10px;
  color: #ff9999;
}

.main-area {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px;
  padding: 24px;
  min-height: 180px;
}

.phase-panel h3 { margin-top: 0; }
.dim { color: #8a8aa3; }
.highlight { color: #4ade80; font-weight: 700; }

.vote-grid, .final-vote-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}

.vote-btn {
  padding: 12px 18px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.06);
  color: white;
  cursor: pointer;
}

.vote-btn.selected {
  background: linear-gradient(135deg, #ff6b9d, #c73866);
  border-color: transparent;
}

.vote-btn:disabled { opacity: 0.3; cursor: not-allowed; }

.vote-result {
  margin-top: 20px;
  border-top: 1px solid rgba(255,255,255,0.1);
  padding-top: 14px;
}

.vote-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
}

.tied-notice { color: #ffb347; margin-top: 8px; }

.final-btn {
  flex: 1;
  padding: 20px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.15);
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  color: white;
}

.final-btn.death { background: rgba(220,38,38,0.25); }
.final-btn.survive { background: rgba(34,163,90,0.25); }
.final-btn.selected.death { background: rgba(220,38,38,0.6); }
.final-btn.selected.survive { background: rgba(34,163,90,0.6); }

.final-result {
  margin-top: 16px;
  text-align: center;
}

.result-text { font-weight: 700; margin-top: 6px; }

.reveal-panel { text-align: center; }

.guess-panel { text-align: center; }

.guess-input-row {
  display: flex;
  gap: 10px;
  margin-top: 16px;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}

.guess-input-row input {
  flex: 1;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.2);
  background: rgba(0,0,0,0.25);
  color: white;
  font-size: 1rem;
}

.guess-input-row input:focus { outline: none; border-color: #ff6b9d; }

.guess-submit-btn {
  background: linear-gradient(135deg, #ff6b9d, #c73866);
  color: white;
  border: none;
  padding: 0 24px;
  border-radius: 12px;
  font-weight: 700;
  cursor: pointer;
}

.guess-result {
  margin-top: 20px;
}

.reveal-line { font-size: 1.1rem; margin: 12px 0; }

.word-reveal {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  margin: 20px 0;
}

.tag {
  background: rgba(74,222,128,0.2);
  color: #4ade80;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 0.8rem;
  margin-right: 8px;
}

.liar-tag { background: rgba(220,38,38,0.2); color: #ff6b6b; }
.category-tag { color: #8a8aa3; font-size: 0.85rem; }

.restart-btn {
  background: linear-gradient(135deg, #ff6b9d, #c73866);
  color: white;
  border: none;
  padding: 14px 30px;
  border-radius: 12px;
  font-weight: 700;
  cursor: pointer;
  margin-top: 10px;
}

.chat-area { height: 320px; }
</style>
