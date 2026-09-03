// ==========================================
// 무기 데이터
// ==========================================
const WEAPON_CONFIGS = {
    assault_rifle: {
        name: "M4A1 ASSAULT RIFLE",
        type: "primary",
        damage: 24,
        headshotMult: 2.0,
        fireRate: 0.09,
        reloadTime: 1.8,
        magSize: 30,
        reserveAmmo: 90,
        spread: 0.025,
        recoilX: 0.001,
        recoilY: 0.005,
        range: 200,
        auto: true,
        adsMultiplier: 0.3,
        color: 0x445566
    },
    pistol: {
        name: "DESERT EAGLE PISTOL",
        type: "secondary",
        damage: 38,
        headshotMult: 2.5,
        fireRate: 0.35,
        reloadTime: 1.2,
        magSize: 8,
        reserveAmmo: 40,
        spread: 0.015,
        recoilX: 0.002,
        recoilY: 0.01,
        range: 100,
        auto: false,
        adsMultiplier: 0.4,
        color: 0x333344
    },
    shotgun: {
        name: "M870 SHOTGUN",
        type: "primary",
        damage: 18,
        headshotMult: 1.5,
        pellets: 8,
        fireRate: 0.9,
        reloadTime: 2.5,
        magSize: 6,
        reserveAmmo: 30,
        spread: 0.1,
        recoilX: 0.003,
        recoilY: 0.018,
        range: 30,
        auto: false,
        adsMultiplier: 0.6,
        color: 0x5a3a1a
    },
    sniper: {
        name: "AWM SNIPER",
        type: "primary",
        damage: 99,
        headshotMult: 3.0,
        fireRate: 1.8,
        reloadTime: 3.2,
        magSize: 5,
        reserveAmmo: 20,
        spread: 0.002,
        recoilX: 0.002,
        recoilY: 0.025,
        range: 999,
        auto: false,
        adsMultiplier: 0.05,
        color: 0x2a3828
    }
};

// ==========================================
// 총기 3D 뷰모델 빌더
// ==========================================
class WeaponViewModel {
    constructor(type, scene, camera) {
        this.type = type;
        this.config = WEAPON_CONFIGS[type];
        this.scene = scene;
        this.camera = camera;
        this.mesh = null;
        this.isADS = false;
        this.recoilVec = new THREE.Vector3();

        this._basePos = new THREE.Vector3(0.28, -0.22, -0.48);
        this._adsPos = new THREE.Vector3(0, -0.08, -0.4);
        this._currentPos = this._basePos.clone();

        this._breathOffset = new THREE.Vector3();
        this._recoilRot = new THREE.Euler();
        this._lerpT = 0;

        this.build();
    }

    build() {
        this.mesh = new THREE.Group();
        const t = this.type;

        if (t === 'assault_rifle') this._buildAssaultRifle();
        else if (t === 'pistol') this._buildPistol();
        else if (t === 'shotgun') this._buildShotgun();
        else if (t === 'sniper') this._buildSniper();

        this.camera.add(this.mesh);
        this.mesh.position.copy(this._basePos);
    }

    _buildAssaultRifle() {
        const metalDark = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.3, metalness: 0.9 });
        const metalMid = new THREE.MeshStandardMaterial({ color: 0x2a2a3e, roughness: 0.3, metalness: 0.8 });
        const neon = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
        const pistolGrip = new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.8, metalness: 0.2 });

        // Receiver body
        const receiverGeo = new THREE.BoxGeometry(0.06, 0.06, 0.38);
        const receiver = new THREE.Mesh(receiverGeo, metalDark);
        receiver.position.set(0, 0, 0);
        this.mesh.add(receiver);

        // Barrel
        const barrelGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.25, 8);
        const barrel = new THREE.Mesh(barrelGeo, metalMid);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.005, -0.295);
        this.mesh.add(barrel);

        // Handguard
        const hgGeo = new THREE.BoxGeometry(0.055, 0.045, 0.22);
        const hg = new THREE.Mesh(hgGeo, metalMid);
        hg.position.set(0, -0.005, -0.18);
        this.mesh.add(hg);

        // Pistol grip
        const gripGeo = new THREE.BoxGeometry(0.038, 0.12, 0.055);
        const grip = new THREE.Mesh(gripGeo, pistolGrip);
        grip.position.set(0, -0.075, 0.07);
        grip.rotation.x = 0.18;
        this.mesh.add(grip);

        // Magazine
        const magGeo = new THREE.BoxGeometry(0.03, 0.12, 0.04);
        const mag = new THREE.Mesh(magGeo, pistolGrip);
        mag.position.set(0, -0.07, 0.02);
        mag.rotation.x = 0.08;
        this.mesh.add(mag);

        // Stock
        const stockGeo = new THREE.BoxGeometry(0.055, 0.05, 0.18);
        const stock = new THREE.Mesh(stockGeo, metalDark);
        stock.position.set(0, -0.005, 0.23);
        this.mesh.add(stock);

        // Scope rail
        const railGeo = new THREE.BoxGeometry(0.012, 0.008, 0.28);
        const rail = new THREE.Mesh(railGeo, metalMid);
        rail.position.set(0, 0.034, 0.02);
        this.mesh.add(rail);

        // Neon strip
        const neonGeo = new THREE.BoxGeometry(0.003, 0.003, 0.22);
        const neonStrip = new THREE.Mesh(neonGeo, neon);
        neonStrip.position.set(0.025, -0.006, -0.18);
        this.mesh.add(neonStrip);

        // Muzzle device
        const muzzleGeo = new THREE.CylinderGeometry(0.018, 0.015, 0.055, 8);
        const muzzle = new THREE.Mesh(muzzleGeo, metalMid);
        muzzle.rotation.x = Math.PI / 2;
        muzzle.position.set(0, 0.005, -0.42);
        this.mesh.add(muzzle);
    }

    _buildPistol() {
        const metalDark = new THREE.MeshStandardMaterial({ color: 0x0d0d1a, roughness: 0.25, metalness: 1.0 });
        const grip = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.85, metalness: 0.1 });
        const gold = new THREE.MeshBasicMaterial({ color: 0xffaa00 });

        // Slide (upper)
        const slideGeo = new THREE.BoxGeometry(0.045, 0.055, 0.22);
        const slide = new THREE.Mesh(slideGeo, metalDark);
        slide.position.set(0, 0.01, -0.04);
        this.mesh.add(slide);

        // Frame (lower)
        const frameGeo = new THREE.BoxGeometry(0.045, 0.04, 0.18);
        const frame = new THREE.Mesh(frameGeo, metalDark);
        frame.position.set(0, -0.02, -0.02);
        this.mesh.add(frame);

        // Grip
        const gripGeo = new THREE.BoxGeometry(0.038, 0.14, 0.05);
        const gripMesh = new THREE.Mesh(gripGeo, grip);
        gripMesh.position.set(0, -0.095, 0.065);
        gripMesh.rotation.x = 0.18;
        this.mesh.add(gripMesh);

        // Trigger guard
        const tgGeo = new THREE.TorusGeometry(0.024, 0.007, 8, 12, Math.PI * 1.1);
        const tg = new THREE.Mesh(tgGeo, metalDark);
        tg.position.set(0, -0.03, 0.04);
        tg.rotation.x = -0.4;
        this.mesh.add(tg);

        // Barrel
        const barrelGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.14, 8);
        const barrel = new THREE.Mesh(barrelGeo, metalDark);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.005, -0.16);
        this.mesh.add(barrel);

        // Gold sight
        const sightGeo = new THREE.BoxGeometry(0.012, 0.015, 0.008);
        const sightF = new THREE.Mesh(sightGeo, gold);
        sightF.position.set(0, 0.04, -0.13);
        this.mesh.add(sightF);
    }

    _buildShotgun() {
        const wood = new THREE.MeshStandardMaterial({ color: 0x5c3310, roughness: 0.8, metalness: 0.05 });
        const metal = new THREE.MeshStandardMaterial({ color: 0x1e1e26, roughness: 0.3, metalness: 0.9 });
        const neon = new THREE.MeshBasicMaterial({ color: 0xff0055 });

        // Barrel tubes (double)
        const barrelGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.42, 8);
        const barrel1 = new THREE.Mesh(barrelGeo, metal);
        barrel1.rotation.x = Math.PI / 2;
        barrel1.position.set(-0.015, 0.005, -0.18);
        this.mesh.add(barrel1);

        const barrel2 = new THREE.Mesh(barrelGeo, metal);
        barrel2.rotation.x = Math.PI / 2;
        barrel2.position.set(0.015, 0.005, -0.18);
        this.mesh.add(barrel2);

        // Receiver
        const rcvrGeo = new THREE.BoxGeometry(0.065, 0.065, 0.28);
        const rcvr = new THREE.Mesh(rcvrGeo, metal);
        rcvr.position.set(0, 0, 0.04);
        this.mesh.add(rcvr);

        // Wood stock
        const stockGeo = new THREE.BoxGeometry(0.05, 0.055, 0.22);
        const stock = new THREE.Mesh(stockGeo, wood);
        stock.position.set(0, -0.005, 0.24);
        this.mesh.add(stock);

        // Pistol grip
        const gripGeo = new THREE.BoxGeometry(0.04, 0.13, 0.055);
        const grip = new THREE.Mesh(gripGeo, wood);
        grip.position.set(0, -0.085, 0.08);
        grip.rotation.x = 0.2;
        this.mesh.add(grip);

        // Pump
        const pumpGeo = new THREE.BoxGeometry(0.06, 0.038, 0.1);
        const pump = new THREE.Mesh(pumpGeo, wood);
        pump.position.set(0, -0.03, -0.15);
        this.mesh.add(pump);

        // Neon strip
        const neonGeo = new THREE.BoxGeometry(0.003, 0.003, 0.28);
        const neonStrip = new THREE.Mesh(neonGeo, neon);
        neonStrip.position.set(0.029, -0.005, 0.04);
        this.mesh.add(neonStrip);
    }

    _buildSniper() {
        const green = new THREE.MeshStandardMaterial({ color: 0x1a2a18, roughness: 0.4, metalness: 0.7 });
        const metal = new THREE.MeshStandardMaterial({ color: 0x222232, roughness: 0.2, metalness: 0.95 });
        const scopeMat = new THREE.MeshStandardMaterial({ color: 0x0d0d15, roughness: 0.1, metalness: 0.9 });

        // Receiver
        const rcvrGeo = new THREE.BoxGeometry(0.055, 0.055, 0.35);
        const rcvr = new THREE.Mesh(rcvrGeo, green);
        rcvr.position.set(0, 0, 0);
        this.mesh.add(rcvr);

        // Long barrel
        const barrelGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.42, 8);
        const barrel = new THREE.Mesh(barrelGeo, metal);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.006, -0.34);
        this.mesh.add(barrel);

        // Bipod legs
        const bipodGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.14, 6);
        const bL = new THREE.Mesh(bipodGeo, metal);
        bL.position.set(-0.02, -0.07, -0.2);
        bL.rotation.z = 0.3;
        this.mesh.add(bL);
        const bR = bL.clone();
        bR.position.set(0.02, -0.07, -0.2);
        bR.rotation.z = -0.3;
        this.mesh.add(bR);

        // Scope body
        const scopeBodyGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.22, 12);
        const scopeBody = new THREE.Mesh(scopeBodyGeo, scopeMat);
        scopeBody.rotation.x = Math.PI / 2;
        scopeBody.position.set(0, 0.055, -0.04);
        this.mesh.add(scopeBody);

        // Scope lens glow
        const lensGeo = new THREE.CircleGeometry(0.022, 12);
        const lensMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, side: THREE.DoubleSide });
        const lens = new THREE.Mesh(lensGeo, lensMat);
        lens.position.set(0, 0.055, -0.155);
        this.mesh.add(lens);

        // Stock
        const stockGeo = new THREE.BoxGeometry(0.05, 0.05, 0.20);
        const stock = new THREE.Mesh(stockGeo, green);
        stock.position.set(0, 0, 0.25);
        this.mesh.add(stock);

        // Grip
        const gripGeo = new THREE.BoxGeometry(0.035, 0.12, 0.05);
        const grip = new THREE.Mesh(gripGeo, green);
        grip.position.set(0, -0.08, 0.07);
        grip.rotation.x = 0.18;
        this.mesh.add(grip);

        // Mag
        const magGeo = new THREE.BoxGeometry(0.025, 0.12, 0.038);
        const mag = new THREE.Mesh(magGeo, metal);
        mag.position.set(0, -0.07, 0.01);
        this.mesh.add(mag);
    }

    recoil() {
        this._recoilRot.x += this.config.recoilY;
        this.mesh.position.z += 0.025;
    }

    setADS(ads) {
        this.isADS = ads;
    }

    update(dt) {
        const targetPos = this.isADS ? this._adsPos : this._basePos;
        this.mesh.position.lerp(targetPos, dt * 12);

        // Recover recoil
        this.mesh.rotation.x += (this._recoilRot.x - this.mesh.rotation.x) * dt * 8;
        this._recoilRot.x += (0 - this._recoilRot.x) * dt * 6;

        // Breathing bob
        const t = Date.now() * 0.001;
        this.mesh.position.y += Math.sin(t * 1.4) * 0.0008 * dt * 60;
        this.mesh.position.x += Math.sin(t * 0.9) * 0.0004 * dt * 60;
    }

    getMuzzleWorldPos() {
        const muzzle = new THREE.Vector3(0, 0, -0.55);
        muzzle.applyEuler(this.camera.rotation);
        muzzle.add(this.camera.position);
        return muzzle;
    }

    remove() {
        if (this.mesh) this.camera.remove(this.mesh);
    }
}

class WeaponManager {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;

        this.loadout = ['shotgun', 'pistol', 'assault_rifle', 'sniper'];
        this.activeIdx = 2;

        this.ammo = {};
        this.reserve = {};
        this.lastShot = {};

        this.loadout.forEach(t => {
            this.ammo[t] = WEAPON_CONFIGS[t].magSize;
            this.reserve[t] = WEAPON_CONFIGS[t].reserveAmmo;
            this.lastShot[t] = 0;
        });

        this.isReloading = false;
        this.reloadTimeout = null;
        this.muzzleFlash = null;

        this.viewmodel = null;
        this._equipWeapon(this.activeIdx);
        this._createMuzzleFlash();
    }

    _equipWeapon(idx) {
        if (this.viewmodel) this.viewmodel.remove();
        this.activeIdx = idx;
        const type = this.loadout[idx];
        this.viewmodel = new WeaponViewModel(type, this.scene, this.camera);
        if (window.hud) {
            window.hud.updateAmmo(this.ammo[type], this.reserve[type]);
            window.hud.updateWeaponSlots(idx);
        }
        this.isReloading = false;
    }

    _createMuzzleFlash() {
        const flashGeo = new THREE.SphereGeometry(0.06, 8, 8);
        const flashMat = new THREE.MeshBasicMaterial({ color: 0xffee88, transparent: true, opacity: 0 });
        this.muzzleFlash = new THREE.Mesh(flashGeo, flashMat);
        this.camera.add(this.muzzleFlash);
        this.muzzleFlash.position.set(0, 0, -0.6);
    }

    switchWeapon(idx) {
        if (idx < 0 || idx >= this.loadout.length) return;
        if (this.isReloading) {
            clearTimeout(this.reloadTimeout);
            this.isReloading = false;
        }
        this._equipWeapon(idx);
    }

    get activeConfig() { return WEAPON_CONFIGS[this.loadout[this.activeIdx]]; }
    get activeType() { return this.loadout[this.activeIdx]; }

    tryShoot(raycaster, scene, bots, player) {
        const type = this.activeType;
        const cfg = this.activeConfig;
        const now = performance.now() / 1000;

        if (this.isReloading || this.ammo[type] <= 0) {
            if (this.ammo[type] <= 0) this.reload();
            return false;
        }
        if (now - (this.lastShot[type] || 0) < cfg.fireRate) return false;

        this.lastShot[type] = now;
        this.ammo[type]--;

        if (window.hud) {
            window.hud.updateAmmo(this.ammo[type], this.reserve[type]);
            window.hud.showReloading(false);
        }

        // Recoil
        if (this.viewmodel) this.viewmodel.recoil();
        if (player) {
            player.pitch += cfg.recoilY * (this.viewmodel?.isADS ? 0.4 : 1.0);
            player.yaw -= (Math.random() - 0.5) * cfg.recoilX * 2;
        }

        // Muzzle flash
        this.muzzleFlash.material.opacity = 1;
        setTimeout(() => { this.muzzleFlash.material.opacity = 0; }, 60);

        // Audio
        if (window.audio) window.audio.playShot(type);

        // Raycast shooting
        const pellets = cfg.pellets || 1;
        let hit = false;
        let didHeadshot = false;

        for (let p = 0; p < pellets; p++) {
            const spread = cfg.spread * (this.viewmodel?.isADS ? cfg.adsMultiplier : 1.0);
            const dir = raycaster.ray.direction.clone();
            dir.x += (Math.random() - 0.5) * spread;
            dir.y += (Math.random() - 0.5) * spread;
            dir.z += (Math.random() - 0.5) * spread;
            dir.normalize();

            const ray = new THREE.Raycaster(raycaster.ray.origin, dir, 0.01, cfg.range);
            const botMeshes = bots.flatMap(b => b.group ? [b.group.children.find(c => c.isHitbox || c.userData.isBody), b.group.children.find(c => c.userData.isHead)].filter(Boolean) : []);
            const hits = ray.intersectObjects(botMeshes, true);

            if (hits.length > 0) {
                const target = hits[0].object;
                const botRef = bots.find(b => b.group && b.group.children.some(c => c === target || (target.parent && c === target.parent)));
                if (botRef && botRef.alive) {
                    const isHead = target.userData.isHead === true;
                    const dmg = Math.round(cfg.damage * (isHead ? cfg.headshotMult : 1));
                    botRef.takeDamage(dmg);
                    if (window.hud) {
                        window.hud.triggerHitmarker(isHead);
                        window.hud.spawnDamageNumber(dmg, hits[0].point, isHead, this.camera);
                    }
                    if (window.match) window.match.recordDamage(dmg);
                    if (!botRef.alive && window.match) window.match.onPlayerKillBot(botRef, isHead);
                    hit = true;
                    didHeadshot = isHead;
                }
            }
        }

        if (this.ammo[type] === 0) {
            setTimeout(() => this.reload(), 200);
        }
        return hit;
    }

    reload() {
        const type = this.activeType;
        const cfg = this.activeConfig;
        if (this.isReloading) return;
        if (this.ammo[type] >= cfg.magSize) return;
        if (this.reserve[type] <= 0) return;

        this.isReloading = true;
        if (window.hud) window.hud.showReloading(true);
        if (window.audio) window.audio.playReload();

        this.reloadTimeout = setTimeout(() => {
            const needed = cfg.magSize - this.ammo[type];
            const canTake = Math.min(needed, this.reserve[type]);
            this.ammo[type] += canTake;
            this.reserve[type] -= canTake;
            this.isReloading = false;
            if (window.hud) {
                window.hud.showReloading(false);
                window.hud.updateAmmo(this.ammo[type], this.reserve[type]);
            }
        }, cfg.reloadTime * 1000);
    }

    update(dt) {
        if (this.viewmodel) this.viewmodel.update(dt);
    }
}
