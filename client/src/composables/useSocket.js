import { reactive } from 'vue';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

export const socket = io(SERVER_URL, { autoConnect: true });

export const state = reactive({
  nickname: '',
  roomId: null,
  roomName: '',
  hostId: null,
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

  gameResult: null, // { accusedWasLiar, liarNickname, citizenWord, liarWord, category, winner }

  chatMessages: [],
  systemMessages: [],
  voteTied: false
});

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
}

socket.on('roomList', (list) => {
  state.roomList = list;
});

socket.on('roomState', (room) => {
  state.roomId = room.id;
  state.roomName = room.name;
  state.hostId = room.hostId;
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
});

socket.on('describeTurn', ({ playerId, nickname, turnIndex, total }) => {
  state.currentTurn = { playerId, nickname };
  state.turnIndex = turnIndex;
  state.turnTotal = total;
});

socket.on('phaseChanged', (payload) => {
  state.status = payload.phase;
  state.timerPhase = payload.phase;
  state.timerRemain = payload.seconds;
  if (payload.candidates) state.voteCandidates = payload.candidates;
  if (payload.accusedId) state.accusedId = payload.accusedId;
  if (payload.accusedNickname) state.accusedNickname = payload.accusedNickname;
  if (payload.round) state.discussionRound = payload.round;
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
