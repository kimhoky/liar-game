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

## Render로 온라인 배포하기 (무료)

전체 과정은 15분 정도 걸립니다. GitHub 계정과 Render 계정(GitHub으로 가입 가능)만 있으면 됩니다.

### 1단계: GitHub에 코드 업로드

1. [github.com](https://github.com)에서 새 저장소(Repository) 생성 (예: `liar-game`)
2. 압축 해제한 이 폴더 전체를 저장소에 push
   ```bash
   cd liar-game
   git init
   git add .
   git commit -m "라이어 게임 초기 커밋"
   git branch -M main
   git remote add origin https://github.com/내계정/liar-game.git
   git push -u origin main
   ```

### 2단계: 서버 배포 (Render Web Service)

1. [render.com](https://render.com) 가입 (GitHub 계정으로 로그인 추천)
2. 대시보드에서 **New > Web Service** 클릭
3. 방금 올린 GitHub 저장소 선택
4. 설정값 입력:
   - **Name**: `liar-game-server` (원하는 이름)
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
5. **Environment Variables**에 아래 추가 (지금은 비워두고, 4단계에서 프론트 URL이 나오면 다시 와서 채워도 됩니다):
   - `CLIENT_URL` = (프론트엔드 배포 URL, 예: `https://liar-game-client.onrender.com`)
6. **Create Web Service** 클릭 → 배포 완료되면 `https://liar-game-server-xxxx.onrender.com` 같은 URL이 생성됩니다. 이 주소를 복사해두세요.

### 3단계: 클라이언트 배포 (Render Static Site)

1. 대시보드에서 **New > Static Site** 클릭
2. 같은 GitHub 저장소 선택
3. 설정값 입력:
   - **Name**: `liar-game-client`
   - **Root Directory**: `client`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. **Environment Variables**에 추가:
   - `VITE_SERVER_URL` = 2단계에서 복사한 서버 URL (예: `https://liar-game-server-xxxx.onrender.com`)
5. **Create Static Site** 클릭 → 배포 완료되면 `https://liar-game-client-xxxx.onrender.com` 같은 최종 접속 링크가 생성됩니다.

### 4단계: 서버 CORS 설정 마무리

1. 서버(Web Service) 대시보드로 돌아가서 **Environment** 탭 이동
2. `CLIENT_URL` 값을 3단계에서 나온 클라이언트 주소로 설정 (또는 갱신)
3. 저장하면 자동으로 서버가 재배포됩니다.

### 완료 후

3단계에서 생성된 클라이언트 URL이 친구들과 공유할 최종 링크입니다. 접속해서 닉네임 입력 → 방 생성 → 링크(방 코드) 공유하는 방식으로 플레이하면 됩니다.

**참고**: Render 무료 티어는 일정 시간 요청이 없으면 서버가 슬립 모드로 전환되고, 다시 요청이 오면 깨어나는 데 30초~1분 정도 걸릴 수 있습니다. 첫 접속이 느리더라도 정상입니다.



- 실제 배포 환경에서는 `client/.env`의 `VITE_SERVER_URL`을 배포된 서버 주소로 변경해야 합니다.
- 프로덕션에서는 `server/index.js`의 CORS 설정(`origin: '*'`)을 실제 프론트엔드 도메인으로 제한하는 것을 권장합니다.
- 방/게임 상태는 모두 서버 메모리에 저장되므로, 서버가 재시작되면 진행 중인 방은 모두 초기화됩니다. 영구 저장이 필요하면 Redis 등의 외부 저장소 연동을 고려하세요.
