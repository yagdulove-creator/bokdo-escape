class Bot {
    constructor(id, team, scene, arenaMap, difficulty = 'medium') {
        this.id = id;
        this.team = team; // 'red' | 'blue'
        this.name = team === 'red' ? `🔴 BOT-${id}` : `🔵 BOT-${id}`;
        this.scene = scene;
        this.map = arenaMap;
        this.difficulty = difficulty;

        this.health = 100;
        this.maxHealth = 100;
        this.alive = true;
        this.respawnTimer = 0;

        // Movement
        this.position = new THREE.Vector3();
        this.velocity = new THREE.Vector3();
        this.gravity = 28;
        this.onGround = false;
        this.speed = { easy: 3.5, medium: 5.0, hard: 7.0 }[difficulty];

        // AI state
        this.state = 'roam'; // 'roam' | 'attack' | 'retreat'
        this.target = null; // Player reference
        this.targetPos = new THREE.Vector3();
        this.aiTimer = 0;
        this.aimOffset = new THREE.Vector3();
        this.aimError = { easy: 2.8, medium: 1.4, hard: 0.5 }[difficulty];
        this.attackRange = { easy: 12, medium: 22, hard: 35 }[difficulty];
        this.fireTimer = 0;
        this.fireRate = { easy: 1.8, medium: 1.1, hard: 0.6 }[difficulty];

        // Damage
        this.damage = { easy: 8, medium: 14, hard: 22 }[difficulty];

        this.group = this._buildModel();
        scene.add(this.group);
    }

    _buildModel() {
        const group = new THREE.Group();
        const teamColor = this.team === 'red' ? 0xee1133 : 0x0088ff;
        const armorMat = new THREE.MeshStandardMaterial({ color: teamColor, roughness: 0.3, metalness: 0.5 });
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x141024, roughness: 0.4 });
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdd99, roughness: 0.5 });
        const visorMat = new THREE.MeshBasicMaterial({ color: this.team === 'red' ? 0xff4444 : 0x44aaff, transparent: true, opacity: 0.7 });

        // Head (hitbox)
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), skinMat);
        head.position.y = 1.7;
        head.userData.isHead = true;
        group.add(head);

        // Helmet visor
        const visor = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.22, 0.18), visorMat);
        visor.position.set(0, 1.74, -0.2);
        group.add(visor);

        // Torso (hitbox body)
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.85, 0.4), armorMat);
        torso.position.y = 1.0;
        torso.userData.isBody = true;
        group.add(torso);

        // Leg L
        const legL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.8, 0.28), bodyMat);
        legL.position.set(-0.21, 0.4, 0);
        group.add(legL);

        // Leg R
        const legR = legL.clone();
        legR.position.set(0.21, 0.4, 0);
        group.add(legR);

        // Arm L
        const armL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.75, 0.22), armorMat);
        armL.position.set(-0.48, 1.0, 0);
        group.add(armL);

        // Arm R
        const armR = armL.clone();
        armR.position.set(0.48, 1.0, 0);
        group.add(armR);

        // Mini gun
        const gunMat = new THREE.MeshStandardMaterial({ color: 0x223344, roughness: 0.4, metalness: 0.9 });
        const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.32), gunMat);
        gunBody.position.set(0.55, 0.98, -0.15);
        group.add(gunBody);
        const gunBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.22, 6), gunMat);
        gunBarrel.rotation.x = Math.PI / 2;
        gunBarrel.position.set(0.55, 0.98, -0.37);
        group.add(gunBarrel);

        // Health bar (billboard)
        const barBg = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.12), new THREE.MeshBasicMaterial({ color: 0x1a1a2e, side: THREE.DoubleSide }));
        barBg.position.y = 2.35;
        group.add(barBg);

        this._hpBarFill = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 0.09), new THREE.MeshBasicMaterial({ color: teamColor }));
        this._hpBarFill.position.set(0, 2.35, 0.01);
        group.add(this._hpBarFill);

        this._legL = legL;
        this._legR = legR;
        this._armL = armL;

        return group;
    }

    setTarget(player) {
        this.target = player;
    }

    respawn(spawnPoints) {
        this.health = 100;
        this.alive = true;
        this.state = 'roam';
        this.velocity.set(0, 0, 0);
        const sp = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
        this.position.copy(sp);
        this.group.position.copy(this.position);
        this.group.visible = true;
    }

    takeDamage(dmg, attacker = null) {
        if (!this.alive) return;
        this.health = Math.max(0, this.health - dmg);
        this._updateHpBar();
        if (this.health <= 0) this._die(attacker);
    }

    _updateHpBar() {
        const pct = this.health / this.maxHealth;
        if (this._hpBarFill) {
            this._hpBarFill.scale.x = Math.max(0.001, pct);
            this._hpBarFill.position.x = -0.44 * (1 - pct);
        }
    }

    _die(attacker) {
        this.alive = false;
        this.group.visible = false;
        this.respawnTimer = 5 + Math.random() * 3;
        
        if (attacker && attacker.team && window.match) {
            window.match.onBotKillBot(attacker, this);
        }
    }

    _aiDecide(enemies) {
        let nearestEnemy = null;
        let minDist = Infinity;

        enemies.forEach(e => {
            if (!e.alive) return;
            const d = this.position.distanceTo(e.position);
            if (d < minDist) {
                minDist = d;
                nearestEnemy = e;
            }
        });

        this.target = nearestEnemy;

        if (!this.target) {
            this.state = 'roam';
            return;
        }

        if (this.health < 25) {
            this.state = 'retreat';
        } else if (minDist < this.attackRange) {
            this.state = 'attack';
        } else {
            this.state = 'roam'; // 거리가 멀면 타겟 방향으로 로밍
        }
    }

    _getTeamSpawn() {
        if (this.team === 'red') {
            return [
                new THREE.Vector3(-12, 2, -38),
                new THREE.Vector3(0, 2, -40),
                new THREE.Vector3(12, 2, -38),
                new THREE.Vector3(-20, 2, -30),
                new THREE.Vector3(20, 2, -30),
            ];
        } else {
            return [
                new THREE.Vector3(-12, 2, 38),
                new THREE.Vector3(0, 2, 40),
                new THREE.Vector3(12, 2, 38),
            ];
        }
    }

    update(dt, enemies, colliders) {
        if (!this.alive) {
            this.respawnTimer -= dt;
            if (this.respawnTimer <= 0) {
                this.respawn(this._getTeamSpawn());
            }
            return;
        }

        this.aiTimer -= dt;
        if (this.aiTimer <= 0) {
            this.aiTimer = 0.25 + Math.random() * 0.4;
            this._aiDecide(enemies);

            if (this.state === 'roam') {
                if (this.target) {
                    this.targetPos.copy(this.target.position);
                } else {
                    const center = this.team === 'red' ? new THREE.Vector3(0, 0, -30) : new THREE.Vector3(0, 0, 30);
                    this.targetPos.set(
                        center.x + (Math.random() - 0.5) * 50,
                        0,
                        center.z + (Math.random() - 0.5) * 30
                    );
                }
            } else if (this.state === 'attack') {
                this.aimOffset.set(
                    (Math.random() - 0.5) * this.aimError,
                    (Math.random() - 0.5) * this.aimError * 0.5,
                    (Math.random() - 0.5) * this.aimError
                );
                this.targetPos.copy(this.target.position).add(this.aimOffset);
                this.targetPos.y = this.target.position.y;
            } else if (this.state === 'retreat') {
                if (this.target) {
                    const away = this.position.clone().sub(this.target.position).normalize().multiplyScalar(20);
                    this.targetPos.copy(this.position).add(away);
                }
            }

            this.targetPos.x = Math.max(-68, Math.min(68, this.targetPos.x));
            this.targetPos.z = Math.max(-68, Math.min(68, this.targetPos.z));
        }

        // Move toward target
        const dir = new THREE.Vector3(
            this.targetPos.x - this.position.x,
            0,
            this.targetPos.z - this.position.z
        );
        const dist2d = dir.length();
        if (dist2d > 0.5) {
            dir.normalize();
            this.velocity.x += (dir.x * this.speed - this.velocity.x) * Math.min(1, 6 * dt);
            this.velocity.z += (dir.z * this.speed - this.velocity.z) * Math.min(1, 6 * dt);
        } else {
            this.velocity.x *= (1 - 8 * dt);
            this.velocity.z *= (1 - 8 * dt);
        }

        // Move & Collide (Raycaster physics)
        const BOT_RADIUS = 0.5;
        const BOT_HEIGHT = 1.8;
        
        this.position.x += this.velocity.x * dt;
        this.position.z += this.velocity.z * dt;

        if (colliders && colliders.length > 0) {
            const raycaster = new THREE.Raycaster();
            // 1. 벽 충돌 (가슴 높이에서 수평 Raycast)
            const origin = new THREE.Vector3(this.position.x, this.position.y + 1.0, this.position.z);
            const moveDirs = [
                new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
                new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)
            ];
            for (let d of moveDirs) {
                raycaster.set(origin, d);
                const hits = raycaster.intersectObjects(colliders, false);
                if (hits.length > 0 && hits[0].distance < BOT_RADIUS) {
                    const overlap = BOT_RADIUS - hits[0].distance;
                    this.position.addScaledVector(d, -overlap);
                }
            }

            // 2. 바닥/경사로 충돌
            this.velocity.y -= this.gravity * dt;
            this.position.y += this.velocity.y * dt;
            raycaster.set(new THREE.Vector3(this.position.x, this.position.y + BOT_HEIGHT - 0.2, this.position.z), new THREE.Vector3(0, -1, 0));
            const downHits = raycaster.intersectObjects(colliders, false);
            
            if (downHits.length > 0 && downHits[0].distance <= BOT_HEIGHT) {
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

        // Clamp to arena
        this.position.x = Math.max(-67, Math.min(67, this.position.x));
        this.position.z = Math.max(-67, Math.min(67, this.position.z));

        // Look toward target
        const lookDir = new THREE.Vector3(this.targetPos.x - this.position.x, 0, this.targetPos.z - this.position.z);
        if (lookDir.length() > 0.1) {
            const angle = Math.atan2(lookDir.x, lookDir.z);
            this.group.rotation.y = angle;
        }

        // Billboard health bar
        if (this._hpBarFill) {
            this.group.children.forEach(c => {
                if (c.geometry?.type === 'PlaneGeometry') {
                    // Update: use active camera position for accurate billboarding later in main.js, 
                    // but for now simple lookAt
                    c.lookAt(this.group.position.clone().add(new THREE.Vector3(0, 0, 100)));
                }
            });
        }

        // Attack / shoot player
        this.fireTimer -= dt;
        if (this.state === 'attack' && this.fireTimer <= 0 && this.target && this.target.alive) {
            const distToPlayer = this.position.distanceTo(this.target.position);
            if (distToPlayer < this.attackRange * 1.2) {
                this.fireTimer = this.fireRate;
                this.target.takeDamage(this.damage, this);
                if (window.audio) window.audio.playShot('pistol');
            }
        }

        // Walk animation
        const walkSpeed = Math.sqrt(this.velocity.x ** 2 + this.velocity.z ** 2);
        const t = Date.now() * 0.005;
        if (walkSpeed > 0.5) {
            if (this._legL) this._legL.rotation.x = Math.sin(t * 3) * 0.4;
            if (this._legR) this._legR.rotation.x = Math.sin(t * 3 + Math.PI) * 0.4;
            if (this._armL) this._armL.rotation.x = Math.sin(t * 3 + Math.PI) * 0.3;
        }

        this.group.position.copy(this.position);
    }
}
