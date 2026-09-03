class LobbyUIManager {
    constructor() {
        this.activeTab = 'main';

        // Tabs
        this.navTabs = {
            main: document.getElementById('tab-main-btn'),
            loadout: document.getElementById('tab-loadout-btn'),
            online: document.getElementById('tab-online-btn'),
            settings: document.getElementById('tab-settings-btn')
        };

        this.viewSections = {
            main: document.getElementById('view-main'),
            loadout: document.getElementById('view-loadout'),
            online: document.getElementById('view-online'),
            settings: document.getElementById('view-settings')
        };

        // Pedestal Showcase
        this.showcaseCanvas = document.getElementById('showcase-canvas');
        this.showcaseScene = null;
        this.showcaseCamera = null;
        this.showcaseRenderer = null;
        this.showcaseMesh = null;

        this.setupTabListeners();
        this.setupOnlineListeners();
        this.initShowcase3D();
    }

    setupTabListeners() {
        Object.keys(this.navTabs).forEach(tabKey => {
            const btn = this.navTabs[tabKey];
            if (btn) {
                btn.addEventListener('click', () => this.switchTab(tabKey));
            }
        });
    }

    switchTab(tabKey) {
        this.activeTab = tabKey;
        Object.keys(this.navTabs).forEach(k => {
            if (k === tabKey) {
                if (this.navTabs[k]) this.navTabs[k].classList.add('active');
                if (this.viewSections[k]) this.viewSections[k].classList.remove('hidden');
            } else {
                if (this.navTabs[k]) this.navTabs[k].classList.remove('active');
                if (this.viewSections[k]) this.viewSections[k].classList.add('hidden');
            }
        });

        if (tabKey === 'online') {
            this.renderOnlineRooms();
        }
    }

    initShowcase3D() {
        if (!this.showcaseCanvas) return;
        this.showcaseScene = new THREE.Scene();
        this.showcaseCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        this.showcaseCamera.position.set(0, 0.2, 1.8);

        this.showcaseRenderer = new THREE.WebGLRenderer({ canvas: this.showcaseCanvas, alpha: true, antialias: true });
        this.showcaseRenderer.setSize(280, 220);

        // Lighting
        const light = new THREE.DirectionalLight(0x00f3ff, 1.5);
        light.position.set(2, 4, 3);
        this.showcaseScene.add(light);
        const ambient = new THREE.AmbientLight(0xffffff, 0.8);
        this.showcaseScene.add(ambient);

        this.updateShowcaseWeapon('assault_rifle');

        // Animation Loop
        const animate = () => {
            requestAnimationFrame(animate);
            if (this.showcaseMesh) {
                this.showcaseMesh.rotation.y += 0.015;
            }
            if (this.showcaseRenderer && this.showcaseScene && this.showcaseCamera) {
                this.showcaseRenderer.render(this.showcaseScene, this.showcaseCamera);
            }
        };
        animate();
    }

    updateShowcaseWeapon(weaponKey) {
        if (!this.showcaseScene) return;
        if (this.showcaseMesh) this.showcaseScene.remove(this.showcaseMesh);

        const config = WEAPON_CONFIGS[weaponKey];
        if (!config) return;

        const group = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: config.color, roughness: 0.2, metalness: 0.8 });
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x18142a });

        const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.7), bodyMat);
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 12), mat);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.02, -0.5);
        group.add(body); group.add(barrel);

        this.showcaseMesh = group;
        this.showcaseScene.add(group);
    }

    setupOnlineListeners() {
        const createRoomBtn = document.getElementById('create-room-btn');
        const sendChatBtn = document.getElementById('send-chat-btn');
        const chatInput = document.getElementById('chat-input');

        if (createRoomBtn) {
            createRoomBtn.addEventListener('click', () => {
                const name = prompt("방 이름을 입력하세요:", "Rivals Room #1");
                if (name && window.onlineManager) {
                    window.onlineManager.createRoom(name, "FFA", 4);
                    this.renderOnlineRooms();
                    alert(`[방 생성 완료] ${name} 방에 접속했습니다!`);
                }
            });
        }

        if (sendChatBtn && chatInput) {
            const sendFn = () => {
                const txt = chatInput.value;
                if (txt && window.onlineManager) {
                    window.onlineManager.sendChatMessage(txt);
                    chatInput.value = '';
                    this.renderChatMessages();
                }
            };
            sendChatBtn.addEventListener('click', sendFn);
            chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') sendFn();
            });
        }
    }

    renderOnlineRooms() {
        const listEl = document.getElementById('room-list-container');
        if (!listEl || !window.onlineManager) return;

        const rooms = window.onlineManager.getRooms();
        listEl.innerHTML = '';

        rooms.forEach(r => {
            const card = document.createElement('div');
            card.className = 'room-card';
            card.innerHTML = `
                <div class="room-info">
                    <span class="room-name">${r.name}</span>
                    <span class="room-meta">모드: ${r.mode} | 방장: ${r.host} | 핑: ${r.ping}ms</span>
                </div>
                <div class="room-slots">${r.players}/${r.maxPlayers}</div>
                <button class="btn-join-room" data-id="${r.id}">입장 (JOIN)</button>
            `;
            listEl.appendChild(card);
        });

        // Join button event listeners
        document.querySelectorAll('.btn-join-room').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const roomId = e.target.getAttribute('data-id');
                const res = window.onlineManager.joinRoom(roomId);
                if (res.success) {
                    alert(`[${res.room.name}] 방에 참가하였습니다! 매치를 시작합니다.`);
                    if (window.gameApp) window.gameApp.startNewGame();
                } else {
                    alert(res.message);
                }
            });
        });

        this.renderChatMessages();
    }

    renderChatMessages() {
        const chatBox = document.getElementById('chat-messages');
        if (!chatBox || !window.onlineManager) return;

        chatBox.innerHTML = '';
        window.onlineManager.chatMessages.forEach(m => {
            const item = document.createElement('div');
            item.className = 'chat-item';
            item.innerHTML = `<span class="chat-sender">${m.sender}:</span> ${m.text}`;
            chatBox.appendChild(item);
        });
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}

window.lobbyUI = new LobbyUIManager();
