const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { nanoid } = require('nanoid');
const fs = require('fs');
const path = require('path');

const app = express();

// 배포된 프론트엔드 도메인을 CLIENT_URL 환경변수로 지정하세요.
// 여러 개면 쉼표로 구분: https://a.com,https://b.com
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map(s => s.trim())
  : '*';

app.use(cors({ origin: allowedOrigins }));
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: allowedOrigins }
});

const WORDS = JSON.parse(fs.readFileSync(path.join(__dirname, 'words.json'), 'utf-8'));
const CATEGORIES = Object.keys(WORDS);

const MAX_PLAYERS = 8;
const MIN_PLAYERS = 3;

const DESCRIBE_TIME = 15; // 초
const DISCUSSION_TIME = 180; // 3분
const VOTE_TIME = 30;
const DEFENSE_TIME = 30;
const FINAL_VOTE_TIME = 20;
const SURVIVE_DISCUSSION_TIME = 60; // 1분

// rooms: { roomId: RoomState }
const rooms = {};

function createRoom(roomName, hostSocketId, hostNickname) {
  const roomId = nanoid(6);
  rooms[roomId] = {
    id: roomId,
    name: roomName,
    hostId: hostSocketId,
    players: [
      { id: hostSocketId, nickname: hostNickname, isHost: true, alive: true }
    ],
    status: 'WAITING', // WAITING, DESCRIBE, DISCUSSION, VOTE, DEFENSE, FINAL_VOTE, REVEAL, END
    settings: { categories: [...CATEGORIES] },
    game: null, // 게임 진행 중 상태
    timer: null
  };
  return rooms[roomId];
}

function publicRoomList() {
  return Object.values(rooms)
    .filter(r => r.status === 'WAITING')
    .map(r => ({
      id: r.id,
      name: r.name,
      count: r.players.length,
      max: MAX_PLAYERS
    }));
}

function publicPlayers(room) {
  return room.players.map(p => ({
    id: p.id,
    nickname: p.nickname,
    isHost: p.isHost,
    alive: p.alive
  }));
}

function broadcastRoomList() {
  io.emit('roomList', publicRoomList());
}

function broadcastRoomState(room) {
  io.to(room.id).emit('roomState', {
    id: room.id,
    name: room.name,
    hostId: room.hostId,
    players: publicPlayers(room),
    status: room.status,
    settings: room.settings
  });
}

function clearTimer(room) {
  if (room.timer) {
    clearInterval(room.timer);
    room.timer = null;
  }
}

function startTimer(room, seconds, onTick, onEnd) {
  clearTimer(room);
  let remain = seconds;
  onTick(remain);
  room.timer = setInterval(() => {
    remain -= 1;
    if (remain <= 0) {
      clearTimer(room);
      onEnd();
    } else {
      onTick(remain);
    }
  }, 1000);
}

function pickLiar(players) {
  const idx = Math.floor(Math.random() * players.length);
  return players[idx].id;
}

function alivePlayers(room) {
  return room.players.filter(p => p.alive);
}

// 게임 시작
function startGame(room) {
  const category = room.settings.categories[
    Math.floor(Math.random() * room.settings.categories.length)
  ];
  const wordList = WORDS[category];
  const citizenWord = wordList[Math.floor(Math.random() * wordList.length)];
  let liarWord = wordList[Math.floor(Math.random() * wordList.length)];
  while (liarWord === citizenWord && wordList.length > 1) {
    liarWord = wordList[Math.floor(Math.random() * wordList.length)];
  }

  const liarId = pickLiar(room.players);
  const order = [...room.players].sort(() => Math.random() - 0.5).map(p => p.id);

  room.players.forEach(p => (p.alive = true));

  room.game = {
    category,
    citizenWord,
    liarWord,
    liarId,
    order,
    turnIndex: 0,
    spoken: {}, // playerId -> true (해당 턴에 이미 발언했는지)
    votes: {}, // voterId -> targetId
    accusedId: null,
    finalVotes: {}, // voterId -> 'DEATH' | 'SURVIVE'
    round: 1
  };

  room.players.forEach(p => {
    const isLiar = p.id === liarId;
    io.to(p.id).emit('yourWord', {
      category,
      word: isLiar ? liarWord : citizenWord,
      isLiar
    });
  });

  room.status = 'DESCRIBE';
  broadcastRoomState(room);
  io.to(room.id).emit('gameStarted', { category, order: order.map(id => {
    const pl = room.players.find(p => p.id === id);
    return { id, nickname: pl.nickname };
  })});

  runDescribeTurn(room);
}

function runDescribeTurn(room) {
  const g = room.game;
  if (!g) return;
  if (g.turnIndex >= g.order.length) {
    startDiscussion(room);
    return;
  }
  const currentId = g.order[g.turnIndex];
  const player = room.players.find(p => p.id === currentId);
  if (!player || !player.alive) {
    g.turnIndex += 1;
    runDescribeTurn(room);
    return;
  }

  io.to(room.id).emit('describeTurn', {
    playerId: currentId,
    nickname: player.nickname,
    turnIndex: g.turnIndex,
    total: g.order.length
  });

  startTimer(room, DESCRIBE_TIME,
    (remain) => io.to(room.id).emit('timer', { phase: 'DESCRIBE', remain }),
    () => {
      g.turnIndex += 1;
      runDescribeTurn(room);
    }
  );
}

function startDiscussion(room) {
  room.status = 'DISCUSSION';
  broadcastRoomState(room);
  io.to(room.id).emit('phaseChanged', { phase: 'DISCUSSION', seconds: DISCUSSION_TIME });

  startTimer(room, DISCUSSION_TIME,
    (remain) => io.to(room.id).emit('timer', { phase: 'DISCUSSION', remain }),
    () => startVote(room)
  );
}

function startVote(room) {
  room.status = 'VOTE';
  room.game.votes = {};
  broadcastRoomState(room);
  io.to(room.id).emit('phaseChanged', {
    phase: 'VOTE',
    seconds: VOTE_TIME,
    candidates: publicPlayers(room).filter(p => p.alive)
  });

  startTimer(room, VOTE_TIME,
    (remain) => io.to(room.id).emit('timer', { phase: 'VOTE', remain }),
    () => tallyVotes(room)
  );
}

function tallyVotes(room) {
  const g = room.game;
  const alive = alivePlayers(room);
  const counts = {};
  alive.forEach(p => (counts[p.id] = 0));
  Object.values(g.votes).forEach(targetId => {
    if (counts[targetId] !== undefined) counts[targetId] += 1;
  });

  io.to(room.id).emit('voteResult', {
    counts,
    players: publicPlayers(room)
  });

  let maxCount = -1;
  let maxIds = [];
  Object.entries(counts).forEach(([id, c]) => {
    if (c > maxCount) {
      maxCount = c;
      maxIds = [id];
    } else if (c === maxCount) {
      maxIds.push(id);
    }
  });

  if (maxIds.length !== 1 || maxCount === 0) {
    // 동점 또는 투표 없음 -> 재투표 없이 바로 재토론 후 재투표 (라운드 증가)
    io.to(room.id).emit('voteTied', {});
    setTimeout(() => {
      if (rooms[room.id]) startSurviveDiscussion(room);
    }, 3000);
    return;
  }

  const accusedId = maxIds[0];
  g.accusedId = accusedId;
  startDefense(room);
}

function startDefense(room) {
  room.status = 'DEFENSE';
  broadcastRoomState(room);
  const accused = room.players.find(p => p.id === room.game.accusedId);
  io.to(room.id).emit('phaseChanged', {
    phase: 'DEFENSE',
    seconds: DEFENSE_TIME,
    accusedId: room.game.accusedId,
    accusedNickname: accused ? accused.nickname : ''
  });

  startTimer(room, DEFENSE_TIME,
    (remain) => io.to(room.id).emit('timer', { phase: 'DEFENSE', remain }),
    () => startFinalVote(room)
  );
}

function startFinalVote(room) {
  room.status = 'FINAL_VOTE';
  room.game.finalVotes = {};
  broadcastRoomState(room);
  const totalVoters = alivePlayers(room).filter(p => p.id !== room.game.accusedId).length;
  io.to(room.id).emit('phaseChanged', { phase: 'FINAL_VOTE', seconds: FINAL_VOTE_TIME, totalVoters });

  startTimer(room, FINAL_VOTE_TIME,
    (remain) => io.to(room.id).emit('timer', { phase: 'FINAL_VOTE', remain }),
    () => tallyFinalVote(room)
  );
}

const GUESS_TIME = 15;

function tallyFinalVote(room) {
  const g = room.game;
  const votes = Object.values(g.finalVotes);
  const deathCount = votes.filter(v => v === 'DEATH').length;
  const surviveCount = votes.filter(v => v === 'SURVIVE').length;

  const isDeath = deathCount > surviveCount;

  io.to(room.id).emit('finalVoteResult', { deathCount, surviveCount, isDeath });

  if (isDeath) {
    // 사형 집행 -> 라이어인지 확인
    const accused = room.players.find(p => p.id === g.accusedId);
    if (accused) accused.alive = false;
    const isLiar = g.accusedId === g.liarId;

    setTimeout(() => {
      if (!rooms[room.id]) return;
      if (isLiar) {
        startGuessPhase(room);
      } else {
        revealResult(room, false, null);
      }
    }, 3000);
  } else {
    // 생존 -> 1분 토론 후 재투표
    setTimeout(() => {
      if (rooms[room.id]) startSurviveDiscussion(room);
    }, 3000);
  }
}

function startGuessPhase(room) {
  room.status = 'GUESS';
  broadcastRoomState(room);
  const liar = room.players.find(p => p.id === room.game.liarId);
  io.to(room.id).emit('phaseChanged', {
    phase: 'GUESS',
    seconds: GUESS_TIME,
    liarId: room.game.liarId,
    liarNickname: liar ? liar.nickname : ''
  });

  startTimer(room, GUESS_TIME,
    (remain) => io.to(room.id).emit('timer', { phase: 'GUESS', remain }),
    () => revealResult(room, true, null) // 시간 초과 -> 라이어 정답 실패로 간주, 시민 승리
  );
}

function revealResult(room, accusedWasLiar, guessResult) {
  room.status = 'REVEAL';
  broadcastRoomState(room);
  const g = room.game;
  const liar = room.players.find(p => p.id === g.liarId);

  let winner = accusedWasLiar ? 'CITIZENS' : 'LIAR';
  if (accusedWasLiar && guessResult === true) {
    winner = 'LIAR'; // 라이어가 정답을 맞춰 역전승
  }

  io.to(room.id).emit('gameOver', {
    accusedWasLiar,
    liarId: g.liarId,
    liarNickname: liar ? liar.nickname : '',
    citizenWord: g.citizenWord,
    liarWord: g.liarWord,
    category: g.category,
    guessResult,
    winner
  });

  clearTimer(room);
  room.game = null;
}

function startSurviveDiscussion(room) {
  room.status = 'DISCUSSION';
  room.game.round += 1;
  broadcastRoomState(room);
  io.to(room.id).emit('phaseChanged', { phase: 'DISCUSSION', seconds: SURVIVE_DISCUSSION_TIME, round: room.game.round });

  startTimer(room, SURVIVE_DISCUSSION_TIME,
    (remain) => io.to(room.id).emit('timer', { phase: 'DISCUSSION', remain }),
    () => startVote(room)
  );
}

function reassignHost(room) {
  if (room.players.length === 0) return;
  room.players.forEach(p => (p.isHost = false));
  room.players[0].isHost = true;
  room.hostId = room.players[0].id;
}

function removePlayerFromRoom(socketId) {
  for (const roomId of Object.keys(rooms)) {
    const room = rooms[roomId];
    const idx = room.players.findIndex(p => p.id === socketId);
    if (idx === -1) continue;

    const wasHost = room.players[idx].isHost;
    room.players.splice(idx, 1);

    if (room.players.length === 0) {
      clearTimer(room);
      delete rooms[roomId];
      broadcastRoomList();
      return;
    }

    if (wasHost) reassignHost(room);

    // 게임 중 나가면 해당 플레이어 사망 처리 (진행에 영향 최소화)
    if (room.game) {
      // 이미 배열에서 제거되었으므로 살아있는 인원 재계산은 room.players 기준
    }

    broadcastRoomState(room);
    broadcastRoomList();
    io.to(roomId).emit('systemMessage', { text: '플레이어가 나갔습니다.' });
    return;
  }
}

io.on('connection', (socket) => {
  socket.emit('roomList', publicRoomList());

  socket.on('createRoom', ({ roomName, nickname }, cb) => {
    const room = createRoom(roomName || '라이어 게임방', socket.id, nickname || '플레이어');
    socket.join(room.id);
    broadcastRoomList();
    broadcastRoomState(room);
    cb && cb({ ok: true, roomId: room.id });
  });

  socket.on('joinRoom', ({ roomId, nickname }, cb) => {
    const room = rooms[roomId];
    if (!room) return cb && cb({ ok: false, error: '존재하지 않는 방입니다.' });
    if (room.status !== 'WAITING') return cb && cb({ ok: false, error: '이미 게임이 진행중입니다.' });
    if (room.players.length >= MAX_PLAYERS) return cb && cb({ ok: false, error: '방이 가득 찼습니다.' });

    room.players.push({ id: socket.id, nickname: nickname || '플레이어', isHost: false, alive: true });
    socket.join(roomId);
    broadcastRoomList();
    broadcastRoomState(room);
    cb && cb({ ok: true, roomId });
  });

  socket.on('leaveRoom', ({ roomId }) => {
    socket.leave(roomId);
    removePlayerFromRoom(socket.id);
  });

  socket.on('updateCategories', ({ roomId, categories }) => {
    const room = rooms[roomId];
    if (!room || room.hostId !== socket.id) return;
    if (!categories || categories.length === 0) return;
    room.settings.categories = categories;
    broadcastRoomState(room);
  });

  socket.on('startGame', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;
    if (room.hostId !== socket.id) return;
    if (room.players.length < MIN_PLAYERS) return;
    if (room.status !== 'WAITING') return;
    startGame(room);
  });

  socket.on('chatMessage', ({ roomId, message }) => {
    const room = rooms[roomId];
    if (!room) return;
    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;
    const trimmed = String(message).slice(0, 300).trim();
    if (!trimmed) return;

    // DESCRIBE 단계: 본인 차례가 아니면 거부
    if (room.status === 'DESCRIBE' && room.game) {
      const g = room.game;
      const currentId = g.order[g.turnIndex];
      if (socket.id !== currentId) {
        socket.emit('notYourTurn', {});
        return;
      }
      if (g.spoken && g.spoken[socket.id]) {
        socket.emit('notYourTurn', {});
        return;
      }
      g.spoken = g.spoken || {};
      g.spoken[socket.id] = true;

      io.to(roomId).emit('describeMessage', {
        playerId: socket.id,
        nickname: player.nickname,
        message: trimmed,
        ts: Date.now()
      });

      // 발언 완료 -> 즉시 다음 사람으로 진행
      clearTimer(room);
      g.turnIndex += 1;
      runDescribeTurn(room);
      return;
    }

    io.to(roomId).emit('chatMessage', {
      playerId: socket.id,
      nickname: player.nickname,
      message: trimmed,
      ts: Date.now()
    });
  });

  socket.on('castVote', ({ roomId, targetId }) => {
    const room = rooms[roomId];
    if (!room || room.status !== 'VOTE' || !room.game) return;
    const voter = room.players.find(p => p.id === socket.id);
    if (!voter || !voter.alive) return;
    room.game.votes[socket.id] = targetId;
    const votedCount = Object.keys(room.game.votes).length;
    const totalCount = alivePlayers(room).length;
    io.to(roomId).emit('voteProgress', { votedCount, totalCount });

    if (votedCount >= totalCount) {
      clearTimer(room);
      tallyVotes(room);
    }
  });

  socket.on('castFinalVote', ({ roomId, decision }) => {
    const room = rooms[roomId];
    if (!room || room.status !== 'FINAL_VOTE' || !room.game) return;
    const voter = room.players.find(p => p.id === socket.id);
    if (!voter || !voter.alive) return;
    if (socket.id === room.game.accusedId) return; // 피고인은 투표 불가
    if (decision !== 'DEATH' && decision !== 'SURVIVE') return;
    room.game.finalVotes[socket.id] = decision;

    const votedCount = Object.keys(room.game.finalVotes).length;
    const totalCount = alivePlayers(room).filter(p => p.id !== room.game.accusedId).length;
    io.to(roomId).emit('finalVoteProgress', { votedCount, totalCount });

    if (votedCount >= totalCount) {
      clearTimer(room);
      tallyFinalVote(room);
    }
  });

  socket.on('submitGuess', ({ roomId, guess }) => {
    const room = rooms[roomId];
    if (!room || room.status !== 'GUESS' || !room.game) return;
    if (socket.id !== room.game.liarId) return;

    clearTimer(room);
    const correct = String(guess).trim() === room.game.citizenWord;
    io.to(roomId).emit('guessSubmitted', { guess: String(guess).trim(), correct });

    setTimeout(() => {
      if (rooms[room.id]) revealResult(room, true, correct);
    }, 2000);
  });

  socket.on('backToLobby', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;
    if (room.hostId !== socket.id) return;
    clearTimer(room);
    room.status = 'WAITING';
    room.game = null;
    room.players.forEach(p => (p.alive = true));
    broadcastRoomState(room);
    broadcastRoomList();
  });

  socket.on('disconnect', () => {
    removePlayerFromRoom(socket.id);
  });
});

app.get('/categories', (req, res) => {
  res.json({ categories: CATEGORIES });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`라이어 게임 서버 실행중: http://localhost:${PORT}`);
});
