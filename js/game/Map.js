class ArenaMap {
    constructor(scene) {
        this.scene = scene;
        this.colliders = []; // THREE.Mesh directly
        this.jumpPads = [];
        this.healthPickups = [];
        this.lobbyObjects = [];
        this.portals = []; // { type: '1v1'|'2v2'|'3v3', pos, radius }

        this.buildLobby();
        this.buildArena();
    }

    // ==========================================
    // 🏰 ROBLOX RIVALS 스타일 3D 플레이어블 로비
    // ====================    buildLobby() {
        const LOBBY_Y = 50;

        // 로비 플로어 (보라빛 메인 홀)
        const floorGeo = new THREE.BoxGeometry(100, 1, 80);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x4a3580, roughness: 0.3, metalness: 0.3 });
        const lobbyFloor = new THREE.Mesh(floorGeo, floorMat);
        lobbyFloor.position.set(0, LOBBY_Y - 0.5, 180);
        lobbyFloor.receiveShadow = true;
        this.scene.add(lobbyFloor);
        this.colliders.push(lobbyFloor);
        this.lobbyObjects.push(lobbyFloor);

        // 로비 천장
        const ceilGeo = new THREE.BoxGeometry(100, 1, 80);
        const ceilMat = new THREE.MeshStandardMaterial({ color: 0x2d2050, roughness: 0.5 });
        const ceil = new THREE.Mesh(ceilGeo, ceilMat);
        ceil.position.set(0, LOBBY_Y + 14, 180);
        this.scene.add(ceil);
        this.colliders.push(ceil);
        this.lobbyObjects.push(ceil);

        // 로비 벽들
        this.createLobbyWall(0, LOBBY_Y + 7, 140, 100, 14, 1, 0x3d2e6b); // 뒤쪽
        this.createLobbyWall(0, LOBBY_Y + 7, 220, 100, 14, 1, 0x3d2e6b); // 앞쪽
        this.createLobbyWall(-50, LOBBY_Y + 7, 180, 1, 14, 80, 0x3d2e6b); // 왼쪽
        this.createLobbyWall(50, LOBBY_Y + 7, 180, 1, 14, 80, 0x3d2e6b); // 오른쪽

        // 랭킹 보드 (전광판 2개로 분리)
        this.createLeaderboard("NORMAL", -20, LOBBY_Y + 7, 141);
        this.createLeaderboard("HIDDEN", 20, LOBBY_Y + 7, 141);

        // 3개의 포탈 (1v1, 2v2, 3v3)
        this.createPortal("1v1", -25, LOBBY_Y + 0.1, 160, 0x00f3ff, [ {team:'red', offset:[-2,0]} ]);
        this.createPortal("2v2", 0, LOBBY_Y + 0.1, 160, 0xff00ff, [ {team:'red', offset:[-3,-2]}, {team:'red', offset:[3,-2]}, {team:'blue', offset:[0,2]} ]);
        this.createPortal("3v3", 25, LOBBY_Y + 0.1, 160, 0xffaa00, [ {team:'red', offset:[-4,-3]}, {team:'red', offset:[0,-3]}, {team:'red', offset:[4,-3]}, {team:'blue', offset:[-2,2]}, {team:'blue', offset:[2,2]} ]);

        // 디스코볼 천장
        const discoGeo = new THREE.SphereGeometry(1.8, 16, 16);
        const discoMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.0, metalness: 1.0 });
        const disco = new THREE.Mesh(discoGeo, discoMat);
        disco.position.set(0, LOBBY_Y + 13, 180);
        this.scene.add(disco);
        this.lobbyObjects.push(disco);

        // 로비 조명 포인트
        const light1 = new THREE.PointLight(0xff00ff, 2.0, 40);
        light1.position.set(-25, LOBBY_Y + 10, 160);
        this.scene.add(light1);
        this.lobbyObjects.push(light1);

        const light2 = new THREE.PointLight(0x00f3ff, 2.0, 40);
        light2.position.set(25, LOBBY_Y + 10, 160);
        this.scene.add(light2);
        this.lobbyObjects.push(light2);

        const centerLight = new THREE.PointLight(0xffaa00, 3.0, 40);
        centerLight.position.set(0, LOBBY_Y + 10, 180);
        this.scene.add(centerLight);
        this.lobbyObjects.push(centerLight);

        // NPC 스폰
        this.spawnLobbyNPCs(LOBBY_Y);

        // 중앙 PLAY 발판 생성
        this.createPlayPad(LOBBY_Y);
    }

    createPlayPad(LOBBY_Y = 50) {
        // 발판 본체 (빛나는 원형 플랫폼)
        const padGeo = new THREE.CylinderGeometry(5, 5.5, 0.4, 32);
        const padMat = new THREE.MeshStandardMaterial({
            color: 0x00f3ff, roughness: 0.1, metalness: 0.8,
            emissive: 0x003344, emissiveIntensity: 0.6
        });
        const pad = new THREE.Mesh(padGeo, padMat);
        pad.position.set(0, LOBBY_Y + 0.2, 190);
        this.scene.add(pad);
        this.lobbyObjects.push(pad);

        // 발광 링 효과
        const ringGeo = new THREE.TorusGeometry(5.5, 0.25, 8, 48);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.set(0, LOBBY_Y + 0.4, 190);
        this.scene.add(ring);
        this.lobbyObjects.push(ring);
        ring._isPlayRing = true;

        // PLAY 텍스트 간판
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.clearRect(0, 0, 512, 128);
        ctx.fillStyle = '#00f3ff';
        ctx.font = 'bold 72px "Orbitron", sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#00f3ff';
        ctx.shadowBlur = 20;
        ctx.fillText('▶ PLAY', 256, 90);
        const tex = new THREE.CanvasTexture(canvas);
        const signGeo = new THREE.PlaneGeometry(8, 2);
        const signMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
        const sign = new THREE.Mesh(signGeo, signMat);
        sign.position.set(0, LOBBY_Y + 4, 190);
        this.scene.add(sign);
        this.lobbyObjects.push(sign);

        // 조명
        const padLight = new THREE.PointLight(0x00f3ff, 3.0, 20);
        padLight.position.set(0, LOBBY_Y + 5, 190);
        this.scene.add(padLight);
        this.lobbyObjects.push(padLight);
    }
  // 조명
        const padLight = new THREE.PointLight(0x00f3ff, 3.0, 20);
        padLight.position.set(0, 5, 190);
        this.scene.add(padLight);
        this.lobbyObjects.push(padLight);
    }

    createLeaderboard(type, x, y, z) {
        const boardGeo = new THREE.BoxGeometry(30, 10, 1);
        const boardMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
        const board = new THREE.Mesh(boardGeo, boardMat);
        board.position.set(x, y, z);
        this.scene.add(board);
        this.colliders.push(board);
        this.lobbyObjects.push(board);

        const canvas = document.createElement('canvas');
        canvas.width = 1024; canvas.height = 512;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, 1024, 512);

        ctx.font = 'bold 40px "Rajdhani", sans-serif';
        ctx.textAlign = 'center';

        let ranks = [];
        if (type === "NORMAL") {
            ctx.fillStyle = '#00f3ff';
            ctx.fillText('🏆 레벨 & 연승 랭킹 보드 🏆', 512, 60);
            ranks = [
                { name: 'JOON', detail: 'Lv.999 | 연승: 999 🔥' },
                { name: 'Slayer', detail: 'Lv.120 | 연승: 20' },
                { name: 'NoobMaster', detail: 'Lv.95 | 연승: 15' },
                { name: 'GamerX', detail: 'Lv.88 | 연승: 12' },
                { name: 'ShadowKey', detail: 'Lv.82 | 연승: 10' }
            ];
        } else {
            ctx.fillStyle = '#ff00ff';
            ctx.fillText('👑 티어 랭킹 보드 (TOP 5) 👑', 512, 60);
            ranks = [
                { name: 'JOON', detail: '🥇 갓네메시스 (TOP 1)' },
                { name: 'ViperX', detail: '🥈 네메시스 (TOP 2)' },
                { name: 'ShadowKing', detail: '🥉 네메시스 (TOP 3)' },
                { name: 'Ghost_Zero', detail: '🏅 챔피언 (TOP 4)' },
                { name: 'Phantom', detail: '🏅 챔피언 (TOP 5)' }
            ];
        }

        ctx.textAlign = 'left';
        ctx.font = 'bold 32px "Inter", sans-serif';
        ranks.forEach((r, i) => {
            const yPos = 140 + i * 70;
            ctx.fillStyle = i === 0 ? '#ffaa00' : i === 1 ? '#e0e0e0' : i === 2 ? '#cd7f32' : '#ffffff';
            ctx.fillText(`${i + 1}. ${r.name}`, 100, yPos);
            ctx.fillStyle = '#00f3ff';
            ctx.fillText(`${r.detail}`, 500, yPos);
        });

        const tex = new THREE.CanvasTexture(canvas);
        const scrGeo = new THREE.PlaneGeometry(28, 9);
        const scrMat = new THREE.MeshBasicMaterial({ map: tex });
        const scr = new THREE.Mesh(scrGeo, scrMat);
        scr.position.set(x, y, z + 0.51);
        this.scene.add(scr);
        this.lobbyObjects.push(scr);
    }

    createPortal(type, x, y, z, color, botsConfig) {
        const portalGeo = new THREE.CylinderGeometry(5, 5.5, 0.5, 32);
        const portalMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.2, metalness: 0.5 });
        const portal = new THREE.Mesh(portalGeo, portalMat);
        portal.position.set(x, y, z);
        this.scene.add(portal);
        this.colliders.push(portal);
        this.lobbyObjects.push(portal);

        const ringGeo = new THREE.TorusGeometry(5.2, 0.3, 16, 64);
        const ringMat = new THREE.MeshBasicMaterial({ color: color });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.set(x, y + 0.3, z);
        this.scene.add(ring);
        this.lobbyObjects.push(ring);

        // 간판
        this.addNeonSign(type, x, 6, z - 3, color, 1.5);

        this.portals.push({ type, pos: new THREE.Vector3(x, y, z), radius: 5 });

        // 대기 중인 봇 생성
        botsConfig.forEach((cfg, idx) => {
            const bot = this.buildLobbyStaticBot(cfg.team, `${cfg.team.toUpperCase()} BOT`, type);
            bot.position.set(x + cfg.offset[0], 0, z + cfg.offset[1]);
            bot.lookAt(new THREE.Vector3(x, 0, z + 10)); // 앞을 보게
            this.scene.add(bot);
            this.lobbyObjects.push(bot);
        });
    }

    addNeonSign(text, x, y, z, color, scale = 2) {
        const bgGeo = new THREE.BoxGeometry(scale * text.length * 0.55, scale * 0.75, 0.2);
        const bgMat = new THREE.MeshStandardMaterial({ color: 0x110e20, roughness: 0.5 });
        const bg = new THREE.Mesh(bgGeo, bgMat);
        bg.position.set(x, y, z);
        this.scene.add(bg);
        this.lobbyObjects.push(bg);

        for (let i = 0; i < text.length; i++) {
            const charGeo = new THREE.BoxGeometry(scale * 0.4, scale * 0.55, 0.22);
            const charMat = new THREE.MeshBasicMaterial({ color: color });
            const char = new THREE.Mesh(charGeo, charMat);
            char.position.set(x - (text.length * scale * 0.25) + i * scale * 0.52, y, z + 0.05);
            this.scene.add(char);
            this.lobbyObjects.push(char);
        }
    }

    createLobbyWall(x, y, z, w, h, d, color) {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.4 });
        const wall = new THREE.Mesh(geo, mat);
        wall.position.set(x, y, z);
        this.scene.add(wall);
        this.colliders.push(wall);
    }

    getRandomTier() {
        const tiers = ['브론즈', '실버', '골드', '플래티넘', '다이아몬드', '루비', '오닉스', '챔피언', '네메시스'];
        return tiers[Math.floor(Math.random() * tiers.length)];
    }

    spawnLobbyNPCs(LOBBY_Y = 50) {
        const npcPositions = [
            { x: -35, z: 190 }, { x: 35, z: 190 }, { x: -10, z: 200 }, { x: 10, z: 200 },
            { x: -20, z: 205 }, { x: 20, z: 205 }, { x: 0, z: 195 }
        ];
        npcPositions.forEach((pos, i) => {
            const npc = this.buildNPCMesh(0x00f3ff, `GUEST-${i+1}`, this.getRandomTier(), Math.floor(Math.random()*90)+10, Math.floor(Math.random()*5));
            npc.position.set(pos.x, LOBBY_Y, pos.z);
            npc._dir = new THREE.Vector3((Math.random() - 0.5), 0, (Math.random() - 0.5)).normalize();
            npc._center = new THREE.Vector3(pos.x, LOBBY_Y, pos.z);
            npc._speed = 1.2 + Math.random() * 1.0;
            npc._isWandering = true;
            this.scene.add(npc);
            this.lobbyObjects.push(npc);
        });
    }


    buildLobbyStaticBot(team, name, mode) {
        const color = team === 'red' ? 0xee1133 : 0x0088ff;
        const tier = this.getRandomTier();
        const lv = Math.floor(Math.random()*40 + 10);
        return this.buildNPCMesh(color, name, tier, lv, 3);
    }

    buildNPCMesh(color, name, tier, lv, winstreak) {
        const group = new THREE.Group();
        const armorMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.3, metalness: 0.5 });
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x141024, roughness: 0.4 });
        const headMat = new THREE.MeshStandardMaterial({ color: 0xffea00, roughness: 0.3 });

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), headMat);
        head.position.y = 1.7;
        group.add(head);

        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.85, 0.4), armorMat);
        torso.position.y = 1.0;
        group.add(torso);

        const legL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.8, 0.28), bodyMat);
        legL.position.set(-0.21, 0.4, 0);
        group.add(legL);

        const legR = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.8, 0.28), bodyMat);
        legR.position.set(0.21, 0.4, 0);
        group.add(legR);

        const armL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.75, 0.22), bodyMat);
        armL.position.set(-0.48, 1.0, 0);
        group.add(armL);

        const armR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.75, 0.22), bodyMat);
        armR.position.set(0.48, 1.0, 0);
        group.add(armR);

        // 네임택 부착
        const nametag = this.createNametag(name, tier, lv, winstreak);
        nametag.position.y = 2.6;
        group.add(nametag);
        
        group.userData = { nametag: nametag, isNPC: true, name: name };

        return group;
    }

    createNametag(name, tier, lv, winstreak) {
        const canvas = document.createElement('canvas');
        canvas.width = 600; canvas.height = 100;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.roundRect(0, 0, 600, 100, 20);
        ctx.fill();

        let color = '#ffffff';
        if(tier.includes('네메시스')) color = '#ff00ff';
        else if(tier.includes('다이아')) color = '#00f3ff';
        else if(tier.includes('오닉스')) color = '#ff4400';

        ctx.fillStyle = color;
        ctx.font = 'bold 36px "Rajdhani", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`[${tier}] ${name} | Lv.${lv} | 연승 ${winstreak}`, 300, 60);

        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: tex });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(6, 1.0, 1);
        return sprite;
    }

    // ==========================================
    // 🎯 전투 아레나 맵 빌드
    // ==========================================
    buildArena() {
        const floorGeo = new THREE.BoxGeometry(140, 2, 140);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0xd0dce8, roughness: 0.3, metalness: 0.2 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.set(0, -1, 0);
        this.scene.add(floor);
        this.colliders.push(floor);

        const grid = new THREE.GridHelper(140, 35, 0x00f3ff, 0xb0c4d4);
        grid.position.y = 0.02;
        this.scene.add(grid);

        this.createSolidWall(0, 10, -70, 140, 20, 4, 0x2a3850);
        this.createSolidWall(0, 10, 70, 140, 20, 4, 0x2a3850);
        this.createSolidWall(-70, 10, 0, 4, 20, 140, 0x2a3850);
        this.createSolidWall(70, 10, 0, 4, 20, 140, 0x2a3850);

        this.createStructure(0, 3, 0, 28, 6, 28, 0x334a65, 0x00f3ff);

        this.createTower(-35, 0, -35);
        this.createTower(35, 0, -35);
        this.createTower(-35, 0, 35);
        this.createTower(35, 0, 35);

        // 경사로 (물리엔진이 raycast로 처리)
        this.createRamp(0, 1.5, -20, 8, 3, 12, 0);
        this.createRamp(0, 1.5, 20, 8, 3, 12, Math.PI);

        this.createCoverBlock(-15, 1.5, -15, 6, 3, 6, 0x00f3ff);
        this.createCoverBlock(15, 1.5, -15, 6, 3, 6, 0xff0055);
        this.createCoverBlock(-15, 1.5, 15, 6, 3, 6, 0xff0055);
        this.createCoverBlock(15, 1.5, 15, 6, 3, 6, 0x00f3ff);
        this.createCoverBlock(-45, 2, 0, 8, 4, 16, 0x334a65);
        this.createCoverBlock(45, 2, 0, 8, 4, 16, 0x334a65);

        this.createJumpPad(-25, 0.1, -25, 6);
        this.createJumpPad(25, 0.1, -25, 6);
        this.createJumpPad(-25, 0.1, 25, 6);
        this.createJumpPad(25, 0.1, 25, 6);

        this.createHealthPickup(-35, 12.5, -35);
        this.createHealthPickup(35, 12.5, 35);
    }

    createSolidWall(x, y, z, w, h, d, color) {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.3, metalness: 0.4 });
        const wall = new THREE.Mesh(geo, mat);
        wall.position.set(x, y, z);
        this.scene.add(wall);
        this.colliders.push(wall);
    }

    createStructure(x, y, z, w, h, d, color, edgeColor) {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.3, metalness: 0.5 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        this.scene.add(mesh);
        this.colliders.push(mesh);
    }

    createTower(x, z) {
        this.createStructure(x, 6, z, 14, 12, 14, 0x2a3850, 0x00f3ff);
        this.createCoverBlock(x - 6, 12.5, z, 1, 1, 12, 0x00f3ff);
        this.createCoverBlock(x + 6, 12.5, z, 1, 1, 12, 0x00f3ff);
    }

    createRamp(x, y, z, w, h, d, rotY) {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mat = new THREE.MeshStandardMaterial({ color: 0x3d5470, roughness: 0.4 });
        const ramp = new THREE.Mesh(geo, mat);
        ramp.position.set(x, y, z);
        ramp.rotation.y = rotY;
        ramp.rotation.x = Math.PI / 12; // 경사
        this.scene.add(ramp);
        this.colliders.push(ramp);
    }

    createCoverBlock(x, y, z, w, h, d, glowColor) {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mat = new THREE.MeshStandardMaterial({ color: 0x2d4060, roughness: 0.3, metalness: 0.5 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        this.scene.add(mesh);
        this.colliders.push(mesh);
    }

    createJumpPad(x, y, z, size) {
        const padGeo = new THREE.CylinderGeometry(size / 2, size / 2 + 0.5, 0.4, 16);
        const padMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9 });
        const pad = new THREE.Mesh(padGeo, padMat);
        pad.position.set(x, y, z);
        this.scene.add(pad);
        this.colliders.push(pad); // 점프패드 위에도 올라갈 수 있도록
        this.jumpPads.push({ pos: new THREE.Vector3(x, y, z), radius: size / 2 + 0.5, boostForce: 28 });
    }

    createHealthPickup(x, y, z) {
        const group = new THREE.Group();
        group.position.set(x, y, z);
        const mat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
        group.add(new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.4, 0.4), mat));
        group.add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.4, 0.4), mat));
        this.scene.add(group);
        this.healthPickups.push({ mesh: group, pos: new THREE.Vector3(x, y, z), active: true, respawnTimer: 0 });
    }

    update(dt, cameraPos, isAdmin = false) {
        this.healthPickups.forEach(hp => {
            if (hp.active) {
                hp.mesh.rotation.y += dt * 2;
                hp.mesh.position.y = hp.pos.y + Math.sin(Date.now() * 0.004) * 0.3;
            } else {
                hp.respawnTimer -= dt;
                if (hp.respawnTimer <= 0) { hp.active = true; hp.mesh.visible = true; }
            }
        });

        this.lobbyObjects.forEach(obj => {
            if (obj.isMesh && obj.geometry.type === 'SphereGeometry') {
                obj.rotation.y += dt * 0.5; // 디스코볼
            }
            // PLAY 발판 링 회전
            if (obj._isPlayRing) {
                obj.rotation.z += dt * 1.2;
            }
            if (obj.userData && obj.userData.nametag && cameraPos) {
                obj.userData.nametag.lookAt(cameraPos);
            }

            if (obj._isWandering) {
                if (isAdmin && cameraPos && obj.position.distanceTo(cameraPos) < 25) {
                    // 관리자를 향해 이동
                    const dirToAdmin = new THREE.Vector3(cameraPos.x - obj.position.x, 0, cameraPos.z - obj.position.z);
                    if (dirToAdmin.length() > 3) {
                        dirToAdmin.normalize();
                        obj.position.x += dirToAdmin.x * (obj._speed * 2) * dt;
                        obj.position.z += dirToAdmin.z * (obj._speed * 2) * dt;
                        obj.lookAt(obj.position.clone().add(dirToAdmin));
                    }
                } else {
                    // 일반 배회
                    obj.position.x += obj._dir.x * obj._speed * dt;
                    obj.position.z += obj._dir.z * obj._speed * dt;
                    const distFromCenter = obj.position.distanceTo(obj._center);
                    if (distFromCenter > 8) {
                        obj._dir.negate();
                    }
                    obj.lookAt(obj.position.clone().add(obj._dir));
                }
            }
        });
    }
}
