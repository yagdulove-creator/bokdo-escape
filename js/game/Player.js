class Player {
    constructor(camera, scene, arenaMap) {
        this.camera = camera;
        this.scene = scene;
        this.map = arenaMap;

        // Position (시원하고 시야가 넓은 높은 위치)
        this.position = new THREE.Vector3(0, 12.0, 45);
        this.velocity = new THREE.Vector3();
        this.onGround = false;

        // Camera rotation (ONLY pitch/yaw, no roll)
        this.yaw = Math.PI;  // 좌우 회전 (정면 적진 조준)
        this.pitch = -0.12;  // 상하 회전 (약간 내려다보기)


        this.maxPitch = Math.PI * 70 / 180;  // 최대 위아래 각도

        // Player stats
        this.health = 100;
        this.shield = 50;
        this.maxHealth = 100;
        this.maxShield = 50;
        this.alive = true;
        this.respawnTimer = 0;

        // Movement params
        this.speed = 8.5;
        this.sprintSpeed = 13.5;
        this.jumpVelocity = 12;
        this.gravity = 30;
        this.friction = 14;

        // Input state
        this.keys = {};
        this.isSprinting = false;
        this.isCrouching = false;
        this.isSliding = false;
        this.slideTimer = 0;
        this.slideVelocity = new THREE.Vector3();

        // ADS
        this.isADS = false;

        // Eye height
        this.eyeHeight = 1.75;
        this.crouchEyeHeight = 1.0;

        // FOV
        this.baseFOV = 75;
        this.adsFOV = 42;

        // Temp vectors for reuse
        this._moveDir = new THREE.Vector3();
        this._fwd = new THREE.Vector3();
        this._right = new THREE.Vector3();
        this._boxMin = new THREE.Vector3();
        this._boxMax = new THREE.Vector3();

        this.mouseX = 0;
        this.mouseY = 0;

        this._bindEvents();
        this._updateCamera();
    }

    _bindEvents() {
        document.addEventListener('keydown', e => { this.keys[e.code] = true; });
        document.addEventListener('keyup', e => { this.keys[e.code] = false; });

        // 마우스 이동 - 카메라 회전 (기울기 없음)
        document.addEventListener('mousemove', e => {
            if (!document.pointerLockElement) return;

            const SENSITIVITY = 0.0018;
            // ★ yaw만 좌우 회전, pitch만 상하 회전 (Z축 roll 없음)
            this.yaw   -= e.movementX * SENSITIVITY;
            this.pitch -= e.movementY * SENSITIVITY;

            // 상하 각도 제한 (70도 이내)
            this.pitch = Math.max(-this.maxPitch, Math.min(this.maxPitch, this.pitch));
        });

        document.addEventListener('mousedown', e => {
            if (!document.pointerLockElement) return;
            if (e.button === 2) {
                this.isADS = true;
                if (window.weaponMgr?.viewmodel) window.weaponMgr.viewmodel.setADS(true);
                if (window.weaponMgr?.activeType === 'sniper' && window.hud) window.hud.toggleScopeOverlay(true);
            }
        });

        document.addEventListener('mouseup', e => {
            if (e.button === 2) {
                this.isADS = false;
                if (window.weaponMgr?.viewmodel) window.weaponMgr.viewmodel.setADS(false);
                if (window.hud) window.hud.toggleScopeOverlay(false);
            }
        });

        // Weapon switch
        document.addEventListener('keydown', e => {
            if (e.code === 'Digit1') window.weaponMgr?.switchWeapon(0);
            else if (e.code === 'Digit2') window.weaponMgr?.switchWeapon(1);
            else if (e.code === 'Digit3') window.weaponMgr?.switchWeapon(2);
            else if (e.code === 'Digit4') window.weaponMgr?.switchWeapon(3);
            else if (e.code === 'KeyR') window.weaponMgr?.reload();
            else if (e.code === 'Escape') {
                const pauseMenu = document.getElementById('pause-menu');
                if (pauseMenu) {
                    if (document.pointerLockElement) {
                        document.exitPointerLock();
                        pauseMenu.classList.remove('hidden');
                    }
                }
            }
        });

        document.addEventListener('wheel', e => {
            if (!window.weaponMgr) return;
            const idx = window.weaponMgr.activeIdx;
            const next = e.deltaY > 0 ? (idx + 1) % 4 : (idx - 1 + 4) % 4;
            window.weaponMgr.switchWeapon(next);
        });
    }

    _updateCamera() {
        // ★ 핵심: euler(yaw, pitch, 0) 순서를 YXZ로 설정 - Z축 기울기 완전 차단
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = this.yaw;
        this.camera.rotation.x = this.pitch;
        this.camera.rotation.z = 0; // 항상 0으로 강제

        const eyeH = this.isCrouching ? this.crouchEyeHeight : this.eyeHeight;
        this.camera.position.set(
            this.position.x,
            this.position.y + eyeH,
            this.position.z
        );
    }

    update(dt, colliders, jumpPads, healthPickups) {
        if (!this.alive) {
            this.respawnTimer -= dt;
            if (this.respawnTimer <= 0) this.respawn();
            return;
        }



        // Movement input
        const forward = this.keys['KeyW'] || this.keys['ArrowUp'];
        const backward = this.keys['KeyS'] || this.keys['ArrowDown'];
        const left = this.keys['KeyA'] || this.keys['ArrowLeft'];
        const right = this.keys['KeyD'] || this.keys['ArrowRight'];
        const jumping = this.keys['Space'];
        this.isCrouching = this.keys['ControlLeft'] || this.keys['KeyC'];
        this.isSprinting = this.keys['ShiftLeft'] && forward && !this.isCrouching;

        // Forward vector from YAW ONLY (no pitch influence on horizontal movement)
        this._fwd.set(
            -Math.sin(this.yaw),
            0,
            -Math.cos(this.yaw)
        );
        this._right.set(
            Math.cos(this.yaw),
            0,
            -Math.sin(this.yaw)
        );

        this._moveDir.set(0, 0, 0);
        if (forward)  this._moveDir.add(this._fwd);
        if (backward) this._moveDir.sub(this._fwd);
        if (left)     this._moveDir.sub(this._right);
        if (right)    this._moveDir.add(this._right);

        if (this._moveDir.lengthSq() > 0) this._moveDir.normalize();

        const currentSpeed = this.isSprinting ? this.sprintSpeed : (this.isCrouching ? this.speed * 0.5 : this.speed);

        // Slide
        if (this.isSprinting && this.isCrouching && this.onGround && this.slideTimer <= 0) {
            this.isSliding = true;
            this.slideTimer = 0.6;
            this.slideVelocity.copy(this._moveDir).multiplyScalar(18);
        }

        if (this.isSliding) {
            this.slideTimer -= dt;
            this.velocity.x = this.slideVelocity.x;
            this.velocity.z = this.slideVelocity.z;
            if (this.slideTimer <= 0) { this.isSliding = false; }
        } else {
            this.velocity.x += (this._moveDir.x * currentSpeed - this.velocity.x) * Math.min(1, this.friction * dt);
            this.velocity.z += (this._moveDir.z * currentSpeed - this.velocity.z) * Math.min(1, this.friction * dt);
        }

        // Jump
        if (jumping && this.onGround) {
            this.velocity.y = this.jumpVelocity;
            this.onGround = false;
            if (window.audio) window.audio.playJump();
        }

        // Gravity
        this.velocity.y -= this.gravity * dt;

        // Move & Collide (Raycaster physics)
        const PLAYER_RADIUS = 0.5;
        const PLAYER_HEIGHT = 1.8;
        
        this.position.x += this.velocity.x * dt;
        this.position.z += this.velocity.z * dt;

        if (colliders && colliders.length > 0) {
            const raycaster = new THREE.Raycaster();
            // 1. 벽 충돌 (가슴 높이에서 수평 Raycast)
            const origin = new THREE.Vector3(this.position.x, this.position.y + 1.0, this.position.z);
            const dirs = [
                new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
                new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)
            ];
            for (let dir of dirs) {
                raycaster.set(origin, dir);
                const hits = raycaster.intersectObjects(colliders, false);
                if (hits.length > 0 && hits[0].distance < PLAYER_RADIUS) {
                    const overlap = PLAYER_RADIUS - hits[0].distance;
                    this.position.addScaledVector(dir, -overlap);
                }
            }

            // 2. 바닥/경사로 충돌 (머리 위에서 아래로 Raycast)
            this.position.y += this.velocity.y * dt;
            raycaster.set(new THREE.Vector3(this.position.x, this.position.y + PLAYER_HEIGHT - 0.2, this.position.z), new THREE.Vector3(0, -1, 0));
            const downHits = raycaster.intersectObjects(colliders, false);
            
            if (downHits.length > 0 && downHits[0].distance <= PLAYER_HEIGHT) {
                if (this.velocity.y <= 0) {
                    this.position.y = downHits[0].point.y;
                    this.velocity.y = 0;
                    this.onGround = true;
                }
            } else {
                this.onGround = false;
            }
        }

        // 낙사 방지
        if (this.position.y <= -5.0) {
            this.takeDamage(1000, null); // 즉사
        }

        // Jump pads
        if (jumpPads) jumpPads.forEach(jp => {
            const d = new THREE.Vector3(this.position.x - jp.pos.x, 0, this.position.z - jp.pos.z).length();
            if (d < jp.radius && this.position.y < jp.pos.y + 2) {
                this.velocity.y = jp.boostForce;
                if (window.audio) window.audio.playJump();
            }
        });

        // Health pickups
        if (healthPickups) healthPickups.forEach(hp => {
            if (!hp.active) return;
            const d = this.position.distanceTo(hp.pos);
            if (d < 2.5 && this.health < this.maxHealth) {
                this.health = Math.min(this.maxHealth, this.health + 40);
                hp.active = false;
                hp.mesh.visible = false;
                hp.respawnTimer = 15;
            }
        });

        // Shield regen
        if (this.shield < this.maxShield) {
            this.shield = Math.min(this.maxShield, this.shield + 2 * dt);
        }

        // FOV ADS
        const targetFOV = this.isADS ? this.adsFOV : this.baseFOV;
        this.camera.fov += (targetFOV - this.camera.fov) * dt * 8;
        this.camera.updateProjectionMatrix();

        // Movement state HUD
        if (window.hud) {
            if (this.isSliding) window.hud.showMovementState("🏃 SLIDING", true);
            else if (this.isSprinting) window.hud.showMovementState("⚡ SPRINT", true);
            else window.hud.showMovementState("", false);
            window.hud.updateHealthShield(this.health, this.shield);
        }

        this._updateCamera();
    }

    // _resolveCollisions 제거됨 (Raycaster로 대체)

    takeDamage(amount, attacker) {
        if (!this.alive) return;

        // Shield absorbs first
        const toShield = Math.min(this.shield, amount);
        this.shield -= toShield;
        const toHealth = amount - toShield;
        this.health -= toHealth;

        if (window.hud) {
            window.hud.triggerDamageFlash();
            window.hud.updateHealthShield(this.health, this.shield);
        }

        if (this.health <= 0) {
            this.health = 0;
            this.alive = false;
            this.respawnTimer = 4;
            if (window.match && attacker) window.match.onBotKillPlayer(attacker);
        }
    }

    respawn() {
        this.health = 100;
        this.shield = 50;
        this.alive = true;
        this.velocity.set(0, 0, 0);
        // 시원하고 시야가 트인 높고 안전한 스폰 지점 (Y = 12.0)
        this.position.set(0, 12.0, 45);
        this.yaw = Math.PI; // 정면(북쪽 적진 방향) 바라보기
        this.pitch = -0.12; // 약간 아래쪽 아레나를 넓게 내려다보기
        this._updateCamera();
        if (window.hud) window.hud.updateHealthShield(100, 50);
    }



}
