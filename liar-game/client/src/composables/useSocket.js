import { reactive } from 'vue';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

export const socket = io(SERVER_URL, { autoConnect: true });

export const state = reactive({
  nickname: localStorage.getItem('liar_game_nickname') || '',
  roomId: null,
  roomName: '',
  hostId: null,
  isPrivate: false,
  players: [],
  status: 'LOBBY', // LOBBY, WAITING, DESCRIBE, DISCUSSION, VOTE, DEFENSE, FINAL_VOTE, REVEAL
  categories: [],
  selectedCategories: [],
  roomList: [],

  // 게임 진행 상태
  myWord: null,
  myCategory: null,
  isLiar: false,
  order: [],
  currentTurn: null,
  turnIndex: 0,
  turnTotal: 0,
  timerPhase: null,
  timerRemain: 0,
  discussionRound: 1,

  voteCandidates: [],
  voteCounts: {},
  votedCount: 0,
  totalVoters: 0,
  myVoteTarget: null,

  accusedId: null,
  accusedNickname: '',

  finalVoteCounts: null,
  myFinalVote: null,
  finalVotedCount: 0,
  finalTotalVoters: 0,

  // 순서대로 발언 기록 (상단 고정 패널용)
  describeLog: [], // { playerId, nickname, message, ts }
  notYourTurnAlert: 0, // 값이 바뀔 때마다 알림 트리거 (증가 카운터)
  mySpoken: false,

  // 라이어 정답 맞추기 단계
  guessLiarId: null,
  guessLiarNickname: '',
  guessSubmitted: null, // { guess, correct }

  gameResult: null, // { accusedWasLiar, liarNickname, citizenWord, liarWord, category, guessResult, winner }

  chatMessages: [],
  systemMessages: [],
  voteTied: false
});

export function setNickname(name) {
  state.nickname = name;
  localStorage.setItem('liar_game_nickname', name);
}

export function clearNickname() {
  state.nickname = '';
  localStorage.removeItem('liar_game_nickname');
}

export function resetGameState() {
  state.myWord = null;
  state.myCategory = null;
  state.isLiar = false;
  state.order = [];
  state.currentTurn = null;
  state.timerPhase = null;
  state.timerRemain = 0;
  state.discussionRound = 1;
  state.voteCandidates = [];
  state.voteCounts = {};
  state.votedCount = 0;
  state.myVoteTarget = null;
  state.accusedId = null;
  state.accusedNickname = '';
  state.finalVoteCounts = null;
  state.myFinalVote = null;
  state.gameResult = null;
  state.chatMessages = [];
  state.voteTied = false;
  state.describeLog = [];
  state.mySpoken = false;
  state.guessLiarId = null;
  state.guessLiarNickname = '';
  state.guessSubmitted = null;
}

socket.on('roomList', (list) => {
  state.roomList = list;
});

socket.on('roomState', (room) => {
  state.roomId = room.id;
  state.roomName = room.name;
  state.hostId = room.hostId;
  state.isPrivate = room.isPrivate;
  state.players = room.players;
  state.status = room.status;
  state.selectedCategories = room.settings.categories;
});

socket.on('yourWord', ({ category, word, isLiar }) => {
  state.myCategory = category;
  state.myWord = word;
  state.isLiar = isLiar;
});

socket.on('gameStarted', ({ category, order }) => {
  state.order = order;
  state.myCategory = category;
  state.describeLog = [];
});

socket.on('describeTurn', ({ playerId, nickname, turnIndex, total }) => {
  state.currentTurn = { playerId, nickname };
  state.turnIndex = turnIndex;
  state.turnTotal = total;
  state.mySpoken = false;
});

socket.on('describeMessage', (msg) => {
  state.describeLog.push(msg);
});

socket.on('notYourTurn', () => {
  state.notYourTurnAlert += 1;
});

socket.on('phaseChanged', (payload) => {
  state.status = payload.phase;
  state.timerPhase = payload.phase;
  state.timerRemain = payload.seconds;
  if (payload.candidates) state.voteCandidates = payload.candidates;
  if (payload.accusedId) state.accusedId = payload.accusedId;
  if (payload.accusedNickname) state.accusedNickname = payload.accusedNickname;
  if (payload.round) state.discussionRound = payload.round;
  if (payload.totalVoters !== undefined) state.finalTotalVoters = payload.totalVoters;
  if (payload.liarId) state.guessLiarId = payload.liarId;
  if (payload.liarNickname) state.guessLiarNickname = payload.liarNickname;
  state.myVoteTarget = null;
  state.myFinalVote = null;
  state.voteTied = false;
});

socket.on('timer', ({ phase, remain }) => {
  state.timerPhase = phase;
  state.timerRemain = remain;
});

socket.on('voteProgress', ({ votedCount, totalCount }) => {
  state.votedCount = votedCount;
  state.totalVoters = totalCount;
});

socket.on('voteResult', ({ counts, players }) => {
  state.voteCounts = counts;
  state.players = players;
});

socket.on('voteTied', () => {
  state.voteTied = true;
});

socket.on('finalVoteProgress', ({ votedCount, totalCount }) => {
  state.finalVotedCount = votedCount;
  state.finalTotalVoters = totalCount;
});

socket.on('finalVoteResult', ({ deathCount, surviveCount, isDeath }) => {
  state.finalVoteCounts = { deathCount, surviveCount, isDeath };
});

socket.on('guessSubmitted', (data) => {
  state.guessSubmitted = data;
});

socket.on('gameOver', (result) => {
  state.status = 'REVEAL';
  state.gameResult = result;
});

socket.on('chatMessage', (msg) => {
  state.chatMessages.push(msg);
});

socket.on('systemMessage', (msg) => {
  state.systemMessages.push(msg.text);
});

fetch(`${SERVER_URL}/categories`)
  .then(r => r.json())
  .then(d => { state.categories = d.categories; })
  .catch(() => {});
