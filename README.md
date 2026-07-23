# 🎭 라이어 게임 (Liar Game)

실시간 온라인 라이어 게임입니다. Node.js + Express + Socket.io 서버와 Vue 3 + Vite 클라이언트로 구성되어 있습니다.

## 폴더 구조

```
liar-game/
├── server/          # Express + Socket.io 백엔드
│   ├── index.js     # 서버 메인 (방 관리, 게임 로직)
│   ├── words.json   # 카테고리별 제시어 목록 (여기서 단어 추가/수정)
│   └── package.json
└── client/          # Vue 3 + Vite 프론트엔드
    ├── src/
    │   ├── App.vue
    │   ├── components/
    │   │   ├── Lobby.vue        # 닉네임 입력 + 방 목록
    │   │   ├── WaitingRoom.vue  # 대기실 (주제 선택, 게임 시작)
    │   │   ├── GameBoard.vue    # 게임 진행 화면 (전체 페이즈)
    │   │   ├── TimerBadge.vue   # 원형 타이머
    │   │   └── ChatBox.vue      # 채팅창
    │   └── composables/
    │       └── useSocket.js     # 소켓 연결 및 전역 상태
    └── .env          # VITE_SERVER_URL 설정
```

## 실행 방법

### 1. 서버 실행

```bash
cd server
npm install
node index.js
```

기본적으로 `http://localhost:4000` 에서 실행됩니다. 포트를 바꾸려면 `PORT` 환경변수를 설정하세요.

### 2. 클라이언트 실행

```bash
cd client
npm install
npm run dev
```

`http://localhost:5173` 에서 접속 가능합니다. (Vite 기본 포트)

클라이언트가 다른 서버 주소를 바라보게 하려면 `client/.env` 파일의 `VITE_SERVER_URL` 값을 수정하세요.

```
VITE_SERVER_URL=http://localhost:4000
```

## 게임 흐름

1. **대기실**: 닉네임 설정 후 방 생성 또는 참가 (최대 8명, 최소 3명)
2. **주제 선택**: 방장이 카테고리 선택 (사물/동물/과일/나라/연예인/직업/장소)
3. **게임 시작**: 전원에게 제시어 배분 (라이어만 다른 단어를 받음)
4. **순서대로 설명**: 각자 15초씩 돌아가며 자신의 제시어를 채팅으로 설명
5. **자유 토론**: 3분간 자유롭게 채팅하며 라이어 추리
6. **투표**: 전체 동시 투표로 라이어로 의심되는 사람 지목 (최다득표)
   - 동점 시 → 재토론 후 재투표
7. **최후 변론**: 지목된 사람이 30초간 자신을 변호
8. **최종 결정**: 사형(처형) vs 생존 투표
   - **사형** → 라이어인지 공개, 게임 종료 (승패 결정)
   - **생존** → 1분 토론 후 다시 투표 단계로 복귀
9. **결과 발표**: 라이어 정체, 시민/라이어 제시어, 승리 팀 공개

## 커스터마이징

- **제시어 추가/수정**: `server/words.json` 파일을 편집하면 즉시 반영됩니다 (서버 재시작 필요).
- **타이머 시간 조절**: `server/index.js` 상단의 `DESCRIBE_TIME`, `DISCUSSION_TIME`, `VOTE_TIME`, `DEFENSE_TIME`, `FINAL_VOTE_TIME`, `SURVIVE_DISCUSSION_TIME` 상수를 수정하세요.
- **최대/최소 인원**: `server/index.js`의 `MAX_PLAYERS`, `MIN_PLAYERS` 상수를 수정하세요.



