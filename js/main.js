// ==========================================
// BATTLEGUN - MAIN GAME APP (Team Battle)
// ==========================================
class GameApp {
    constructor() {
        this.rendererMgr = new RendererManager('game-container');
        this.scene = this.rendererMgr.scene;
        this.camera = this.rendererMgr.camera;

        this.map = new ArenaMap(this.scene);

        // Player starts in LOBBY
        this.player = new Player(this.camera, this.scene, this.map);
        this.player.position.set(0, 2, 200); // lobby spawn
        this.player.yaw = Math.PI; // facing inside

        this.bots = [];
        this.match = new GameMatch();
        window.match = this.match;

        window.audio = new AudioManager();
        window.audio.init();

        this.raycaster = new THREE.Raycaster();
        this.crosshairCenter = new THREE.Vector2(0, 0);

        this._mouseHeld = false;
        this._lobbyMode = true;
        this.isAdmin = false;

        // 포탈 카운트다운 상태
        this._portalCountdown = -1;
        this._portalType = null;
        this._portalCountEl = document.getElementById('portal-countdown');

        this._setupMouseShoot();

        this._clock = new THREE.Clock();
        this._animate();
    }

    _setupMouseShoot() {
        document.addEventListener('mousedown', e => {
            if (e.button === 0) this._mouseHeld = true;
        });
        document.addEventListener('mouseup', e => {
            if (e.button === 0) this._mouseHeld = false;
        });

        document.addEventListener('click', e => {
            if (!document.pointerLockElement || !window.weaponMgr) return;
            if (this._lobbyMode) return;
            this._shoot();
        });
    }

    _shoot() {
        if (!window.weaponMgr || !this.player.alive) return;
        this.raycaster.setFromCamera(this.crosshairCenter, this.camera);

        const redBots = this.bots.filter(b => b.team === 'red' && b.alive);
        const cfg = window.weaponMgr.activeConfig;

        if (cfg.auto && this._mouseHeld) return; // handled below
        window.weaponMgr.tryShoot(this.raycaster, this.scene, redBots, this.player);
    }

    startGame(mode, difficulty) {
        this._lobbyMode = false;

        // 1. 기존 봇 제거
        this.bots.forEach(b => { b.group.visible = false; this.scene.remove(b.group); });
        this.bots = [];

        // 2. 모드별 봇 스폰 (상대 봇 & 아군 봇이 짠! 나타남)
        let redCount = 1, blueAllyCount = 0;
        if (mode === 'team2v2') { redCount = 2; blueAllyCount = 1; }
        else if (mode === 'ffa') { redCount = 4; blueAllyCount = 2; }
        else if (mode === 'team3v3') { redCount = 3; blueAllyCount = 2; }

        const redSpawns = [
            new THREE.Vector3(-12, 2, -38),
            new THREE.Vector3(0, 2, -40),
            new THREE.Vector3(12, 2, -38),
            new THREE.Vector3(-20, 2, -30),
            new THREE.Vector3(20, 2, -30),
        ];

        for (let i = 0; i < redCount; i++) {
            const bot = new Bot(i + 1, 'red', this.scene, this.map, difficulty);
            bot.position.copy(redSpawns[i % redSpawns.length]);
            bot.group.position.copy(bot.position);
            this.bots.push(bot);
        }

        for (let i = 0; i < blueAllyCount; i++) {
            const bot = new Bot(10 + i, 'blue', this.scene, this.map, difficulty);
            bot.position.set(-8 + i * 16, 2, 35);
            bot.group.position.copy(bot.position);
            this.bots.push(bot);
        }

        // 3. 플레이어 위치 및 카메라 정렬 (경기장 정면 조준)
        this.player.isDropping = false;
        this.player.position.set(0, 2, 40);
        this.player.yaw = Math.PI;
        this.player.pitch = 0;
        this.player.alive = true;
        this.player._updateCamera();

        // 4. 로비 오브젝트 가림
        this.map.lobbyObjects.forEach(obj => {
            if (obj.visible !== undefined) obj.visible = false;
        });

        // 5. 무기 즉시 지급
        if (window.weaponMgr) window.weaponMgr.viewmodel?.remove();
        window.weaponMgr = new WeaponManager(this.scene, this.camera);

        this.match.startMatch(redCount, difficulty);
    }

    enterLobby() {
        this._lobbyMode = true;
        this.bots.forEach(b => { b.group.visible = false; this.scene.remove(b.group); });
        this.bots = [];
        if (window.weaponMgr) { window.weaponMgr.viewmodel?.remove(); window.weaponMgr = null; }
        this.match.isRunning = false;

        // 플레이어 경기장 스폰 구역 정렬
        this.player.position.set(0, 2, 40);
        this.player.yaw = Math.PI;
        this.player.pitch = 0;
        this.player._updateCamera();
    }


    _animate() {
        requestAnimationFrame(() => this._animate());
        const dt = Math.min(this._clock.getDelta(), 0.05);

        const hasPointerLock = !!document.pointerLockElement;

        // 포인터 락이 켜져있을 때만 이동/물리 업데이트
        if (hasPointerLock) {
            this.player.update(dt, this.map.colliders, this.map.jumpPads, this.map.healthPickups);
        } else {
            // 포인터 락이 없을 때는 카메라 위치만 동기화
            this.player._updateCamera();
        }

        const redBots = this.bots.filter(b => b.team === 'red' && b.alive);
        const blueBots = this.bots.filter(b => b.team === 'blue' && b.alive);

        if (window.weaponMgr && this._mouseHeld && !this._lobbyMode && this.player.alive && hasPointerLock) {
            const cfg = window.weaponMgr.activeConfig;
            if (cfg.auto) {
                this.raycaster.setFromCamera(this.crosshairCenter, this.camera);
                window.weaponMgr.tryShoot(this.raycaster, this.scene, redBots, this.player);
            }
        }

        if (window.weaponMgr) window.weaponMgr.update(dt);

        this.bots.forEach(bot => {
            let enemies = bot.team === 'red' ? [...blueBots] : [...redBots];
            if (bot.team === 'red' && this.player.alive && !this._lobbyMode) enemies.push(this.player);
            
            bot.update(dt, enemies, this.map.colliders);
        });

        this.map.update(dt, this.camera.position, this.isAdmin);

        if (this._lobbyMode) {
            // PLAY 발판 근접 감지 (로비 중앙 z=190 위치)
            const playPadPos = new THREE.Vector3(0, 0, 190);
            const distToPad = new THREE.Vector2(
                this.player.position.x - playPadPos.x,
                this.player.position.z - playPadPos.z
            ).length();

            const hint = document.getElementById('lobby-hint');
            if (distToPad < 7) {
                if (hint) hint.innerHTML = '<span>🎮 E 키를 눌러 매치 모드를 선택하세요!</span>';
                if (this.player.keys && this.player.keys['KeyE']) {
                    this.player.keys['KeyE'] = false;
                    openModeSelectMenu();
                }
            } else {

                if (hint) hint.innerHTML = '<span>🎮 WASD: 이동 | 중앙 발판으로 이동하여 E키를 눌러보세요!</span>';
            }
        } else {
            this.match.update(dt);
        }

        this.rendererMgr.render();
    }
}



// ==========================================
// 로그인 / 회원가입 시스템
// ==========================================
const USERS_KEY = 'battlegun_users';
const SESSION_KEY = 'battlegun_session';

function getUsers() {
    const raw = localStorage.getItem(USERS_KEY);
    const users = raw ? JSON.parse(raw) : {};
    // 관리자 계정 (항상 존재)
    if (!users['JOON']) {
        users['JOON'] = { password: '140627', role: 'admin' };
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
    return users;
}

function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getSession() {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
}

function setSession(username, role) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ username, role }));
}

function clearSession() {
    localStorage.removeItem(SESSION_KEY);
}

// ==========================================
// UI 이벤트 초기화
// ==========================================
let gameApp = null;

document.addEventListener('DOMContentLoaded', () => {
    // 접속하자마자 검은 화면 없이 3D 경기장이 바로 시원하게 렌더링되도록 진입
    const session = getSession();
    if (session) {
        enter3DLobby(session.username, session.role);
    } else {
        enter3DLobby('GUEST', 'user');
    }

    document.getElementById('btn-guest-play')?.addEventListener('click', () => {
        document.getElementById('auth-modal').classList.add('hidden');
        enter3DLobby('GUEST', 'user');
    });


    // ---- AUTH EVENTS ----
    document.getElementById('btn-show-register').addEventListener('click', () => {
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('register-form').classList.remove('hidden');
    });

    document.getElementById('btn-show-login').addEventListener('click', () => {
        document.getElementById('register-form').classList.add('hidden');
        document.getElementById('login-form').classList.remove('hidden');
    });

    document.getElementById('btn-login').addEventListener('click', () => {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const users = getUsers();
        const errEl = document.getElementById('login-error');

        if (!users[username]) {
            errEl.innerText = '❌ 존재하지 않는 계정입니다.';
            return;
        }
        if (users[username].password !== password) {
            errEl.innerText = '❌ 비밀번호가 틀렸습니다.';
            return;
        }

        errEl.innerText = '';
        setSession(username, users[username].role || 'user');
        document.getElementById('auth-modal').classList.add('hidden');
        enter3DLobby(username, users[username].role || 'user');
    });

    document.getElementById('btn-register').addEventListener('click', () => {
        const username = document.getElementById('reg-username').value.trim();
        const password = document.getElementById('reg-password').value;
        const confirm = document.getElementById('reg-confirm').value;
        const errEl = document.getElementById('register-error');

        if (!username || username.length < 2) { errEl.innerText = '❌ 유저명은 2글자 이상이어야 합니다.'; return; }
        if (password.length < 4) { errEl.innerText = '❌ 비밀번호는 4자 이상이어야 합니다.'; return; }
        if (password !== confirm) { errEl.innerText = '❌ 비밀번호가 일치하지 않습니다.'; return; }

        const users = getUsers();
        if (users[username]) { errEl.innerText = '❌ 이미 존재하는 유저명입니다.'; return; }

        users[username] = { password, role: 'user' };
        saveUsers(users);
        errEl.style.color = 'var(--color-green)';
        errEl.innerText = '✅ 가입 완료! 로그인해주세요.';
        setTimeout(() => {
            document.getElementById('register-form').classList.add('hidden');
            document.getElementById('login-form').classList.remove('hidden');
            errEl.innerText = '';
            errEl.style.color = 'var(--color-pink)';
        }, 1200);
    });

    // ---- LOBBY EVENTS ----
    document.getElementById('btn-logout-lobby').addEventListener('click', () => {
        clearSession();
        location.reload();
    });

    // Game Over modal events
    document.getElementById('btn-rematch').addEventListener('click', () => {
        const difficulty = document.getElementById('difficulty-select')?.value || 'medium';
        document.getElementById('gameover-modal').classList.add('hidden');
        startGamePlay('solo', difficulty);
    });

    document.getElementById('btn-back-menu').addEventListener('click', () => {
        document.getElementById('gameover-modal').classList.add('hidden');
        document.exitPointerLock();
        // 로비로 돌아가기
        const session = getSession();
        if (session) {
            enter3DLobby(session.username, session.role || 'user');
        } else {
            document.getElementById('lobby-overlay').classList.remove('hidden');
            if (gameApp) gameApp.enterLobby();
        }
    });

    // Pause menu
    document.getElementById('btn-resume').addEventListener('click', () => {
        document.getElementById('pause-menu').classList.add('hidden');
        const canvas = document.querySelector('#game-container canvas');
        if (canvas) canvas.requestPointerLock();
    });

    document.getElementById('btn-quit-to-menu').addEventListener('click', () => {
        document.getElementById('pause-menu').classList.add('hidden');
        document.exitPointerLock();
        const session = getSession();
        if (session) enter3DLobby(session.username, session.role || 'user');
    });

    // Game container click -> pointer lock (로비 모드 제외)
    const gameContainer = document.getElementById('game-container');
    gameContainer.addEventListener('click', () => {
        if (!document.pointerLockElement && gameApp && !gameApp._lobbyMode) {
            gameContainer.querySelector('canvas')?.requestPointerLock();
        } else if (!document.pointerLockElement && gameApp && gameApp._lobbyMode) {
            // 로비: 모드 선택 메뉴가 안 열려 있을 때만 포인터 락
            var mm = document.getElementById('mode-select-menu');
            if (!mm || mm.classList.contains('hidden')) {
                gameContainer.querySelector('canvas')?.requestPointerLock();
            }
        }
    });

    // Pointer lock change
    document.addEventListener('pointerlockchange', () => {
        const hud = document.getElementById('hud-overlay');
        if (gameApp && !gameApp._lobbyMode) {
            // 매치 중에는 HUD를 항상 유지
            hud?.classList.remove('hidden');
        } else {
            // 로비 모드일 때는 HUD 숨김
            hud?.classList.add('hidden');
        }
    });


    // Init Three.js engine
    gameApp = new GameApp();
});

function enter3DLobby(username, role) {
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('auth-modal').classList.add('hidden');
    document.getElementById('lobby-overlay').classList.remove('hidden');
    document.getElementById('lobby-hint').classList.remove('hidden');

    const userTag = document.getElementById('lobby-user-info');
    if (userTag) {
        userTag.innerText = role === 'admin' ? `👑 ADMIN: ${username}` : `🎮 ${username}`;
        userTag.style.color = role === 'admin' ? 'var(--color-amber)' : 'var(--color-cyan)';
    }

    if (!gameApp) gameApp = new GameApp();
    gameApp.isAdmin = (role === 'admin');
    gameApp.enterLobby();

    // 로비 채팅창 표시
    const lobbyChat = document.getElementById('lobby-chat');
    if (lobbyChat) lobbyChat.classList.remove('hidden');
    const chatBox = document.getElementById('chat-messages');

    // NPC 채팅 출력 함수
    function postNPCChat(msg, color) {
        if (!chatBox) return;
        const item = document.createElement('div');
        item.style.cssText = 'margin-bottom:4px; line-height:1.4;';
        item.innerHTML = '<span style="color:' + (color || '#00f3ff') + '; font-weight:600">' + msg + '</span>';
        chatBox.appendChild(item);
        chatBox.scrollTop = chatBox.scrollHeight;
        while (chatBox.children.length > 30) chatBox.removeChild(chatBox.firstChild);
    }

    // NPC 이름 수집
    const npcNames = [];
    if (gameApp.map) {
        gameApp.map.lobbyObjects.forEach(function(obj) {
            if (obj.userData && obj.userData.isNPC) npcNames.push(obj.userData.name);
        });
    }
    if (npcNames.length === 0) npcNames.push('GUEST-1', 'GUEST-2', 'GUEST-3', 'GUEST-4');

    const normalChats = [
        '다음 시즌에는 꼭야지임...',
        '누군가 1v1 없어요?',
        '랭크업 어떻게 하는 거야',
        '아 나 시스템에다',
        '오늘도 연승다 파이팅!',
        '눈앞에서 헤드샷 연동 한 번 주네',
        '작정하나 내 랭크 추립다',
        '3v3 띠는 사람?',
        '소통업 콤보 너무 세지 않나요?',
        '낙사 당했다... 패스',
        '아 헤드샷 하나 더 넣어다는 감',
        '업데 어로 만어 파인드 딩딩 오르는 게 없다',
        '이 총 DPS 얼마야?',
        '핵 쓰는 놈 있지 않나...',
        '오늘 목표 10연승!!',
    ];
    const adminChats = [
        '어? 관리자님이다!!',
        '관리자님 아이콘 대단해요!!',
        '플래티넘 네메시스님이다!!',
        '관리자님~ 저도 안여줘요~',
        '오 세상에나 관리자가 로비에!!',
        '관리자님 같이 1v1 해봐요!',
        '관리자님 맞추세요 넘 귀하!',
    ];

    // 기존 인터벌 제거 후 새로 시작
    if (window._npcChatInterval) clearInterval(window._npcChatInterval);
    window._npcChatInterval = setInterval(function() {
        var chat = document.getElementById('lobby-chat');
        if (!chat || chat.classList.contains('hidden')) return;
        var name = npcNames[Math.floor(Math.random() * npcNames.length)];
        var isAdminMsg = gameApp && gameApp.isAdmin && Math.random() < 0.45;
        var list = isAdminMsg ? adminChats : normalChats;
        var msg = list[Math.floor(Math.random() * list.length)];
        var color = isAdminMsg ? '#ffaa00' : '#00f3ff';
        postNPCChat('[NPC] ' + name + ': ' + msg, color);
    }, 2500);

    // 관리자 로그인 직후 즉시 반응
    if (role === 'admin' && chatBox) {
        var adminFirst = ['오 관리자다!', '관리자님이 오셨다!!', '헐... 플래티넘 네메시스야?!'];
        npcNames.slice(0, 4).forEach(function(name, i) {
            setTimeout(function() {
                postNPCChat('[NPC] ' + name + ': ' + adminFirst[i % adminFirst.length], '#ff00ff');
            }, 600 + i * 700);
        });
    }

    // 로비 입장 시 모드 선택 메뉴 오픈
    openModeSelectMenu();
}



function openModeSelectMenu() {
    if (document.pointerLockElement) document.exitPointerLock();
    var modeMenu = document.getElementById('mode-select-menu');
    if (modeMenu) {
        modeMenu.classList.remove('hidden');
        modeMenu.style.display = 'flex';
    }
}

function closeModeSelectMenu() {
    var modeMenu = document.getElementById('mode-select-menu');
    if (modeMenu) {
        modeMenu.classList.add('hidden');
        modeMenu.style.display = 'none';
    }
    var canvas = document.querySelector('#game-container canvas');
    if (canvas) {
        try { canvas.requestPointerLock(); } catch (e) {}
    }
}

function startGamePlay(mode, difficulty) {
    // 1. 모드 선택 메뉴 완전히 닫기
    closeModeSelectMenu();

    // 2. 모든 로비 UI 숨기기
    document.getElementById('lobby-overlay').classList.add('hidden');
    document.getElementById('lobby-hint').classList.add('hidden');
    document.getElementById('gameover-modal').classList.add('hidden');

    var lobbyChat = document.getElementById('lobby-chat');
    if (lobbyChat) lobbyChat.classList.add('hidden');

    // 3. NPC 채팅 타이머 중지
    if (window._npcChatInterval) { 
        clearInterval(window._npcChatInterval); 
        window._npcChatInterval = null; 
    }

    // 4. 게임 앱 가동 및 아레나 스폰
    if (!gameApp) gameApp = new GameApp();
    gameApp.startGame(mode, difficulty);

    // 5. HUD 강제 활성화 및 타이틀 업데이트

    var hud = document.getElementById('hud-overlay');
    if (hud) hud.classList.remove('hidden');

    var modeLabel = document.getElementById('match-mode-label');
    if (modeLabel) {
        var modeText = mode === 'solo' ? '⚡ 1 vs 1 솔로 배틀' : mode === 'team2v2' ? '🔥 2 vs 2 팀 배틀' : '💥 3 vs 3 풀팀 배틀';
        modeLabel.textContent = modeText;
    }

    // 7. 포인터 락 시도 (유저 제스처 콜백 내부)
    var canvas = document.querySelector('#game-container canvas');
    if (canvas) {
        try {
            canvas.requestPointerLock();
        } catch (e) {
            console.log('Pointer lock error:', e);
        }
    }
}





