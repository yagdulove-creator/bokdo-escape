/**
 * Main Game Controller for "복도탈출" (Hallway Escape)
 */
class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;

        // Systems & Entities
        this.map = new Map();
        this.physics = new Physics();
        this.ui = new UI();

        this.player = new Player(120, this.map.groundY - 54);
        this.monster = new Monster(0, this.map.groundY - 72);

        // Game State
        this.state = 'MENU'; // MENU, HOWTO, PLAYING, SAFEZONE, GAMEOVER
        this.difficulty = 'NORMAL'; // EASY, NORMAL, HARD
        this.stage = 1;
        this.score = 0;
        this.coins = 0;
        this.dodgedObstacles = 0;
        this.flashbangCount = 0;

        // Projectile Shooting & Charging & Minions & AutoFire
        this.arrows = [];
        this.fireballs = [];
        this.minions = [];
        this.shootCooldown = 0;
        this.isCharging = false;
        this.chargeFrames = 0;
        this.chargeTargetX = 0;
        this.chargeTargetY = 0;
        this.autoFireEnabled = false; // Mobile Auto Bow Fire Toggle

        // Camera Scroll
        this.scrollX = 0;

        // Input state
        this.keys = {
            jump: false,
            slide: false,
            left: false,
            right: false,
            sprint: false
        };

        this.crtEnabled = false;
        this.initEvents();
        this.gameLoop = this.gameLoop.bind(this);
        requestAnimationFrame(this.gameLoop);
    }

    shootArrow(targetWorldX, targetWorldY, chargeRatio = 0.0) {
        if (!this.player.hasBow || this.shootCooldown > 0) return;

        const arrowStartX = this.player.x + 20;
        const arrowStartY = this.player.y + 20;
        const arrow = new Arrow(arrowStartX, arrowStartY, targetWorldX, targetWorldY, chargeRatio);
        this.arrows.push(arrow);
        this.shootCooldown = 14; // Cooldown frames (~0.23s)
        this.physics.spawnSparkles(arrowStartX, arrowStartY);
    }

    initEvents() {
        // Keyboard listeners
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
                this.keys.jump = true;
                if (this.state === 'PLAYING') this.player.jump();
                e.preventDefault();
            }
            if (e.code === 'ArrowDown' || e.code === 'KeyS') {
                this.keys.slide = true;
                if (this.state === 'PLAYING') this.player.slide();
                e.preventDefault();
            }
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.keys.left = true;
            if (e.code === 'ArrowRight' || e.code === 'KeyD') this.keys.right = true;
            if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.keys.sprint = true;
            if (e.code === 'KeyF' || e.code === 'KeyZ') {
                if (this.state === 'PLAYING') {
                    // Quick shoot towards monster on keypress
                    this.shootArrow(this.player.x - 300, this.player.y + 20, 0.5);
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') this.keys.jump = false;
            if (e.code === 'ArrowDown' || e.code === 'KeyS') {
                this.keys.slide = false;
                if (this.state === 'PLAYING') this.player.stopSlide();
            }
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.keys.left = false;
            if (e.code === 'ArrowRight' || e.code === 'KeyD') this.keys.right = false;
            if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.keys.sprint = false;
        });

        // Robust Touch & Mouse Control Listeners for Mobile & PC
        const bindTouch = (id, key) => {
            const btn = document.getElementById(id);
            if (!btn) return;

            const onStart = (e) => {
                if (e.cancelable) e.preventDefault();
                audioEngine.init();
                this.keys[key] = true;
                if (key === 'jump' && this.state === 'PLAYING') this.player.jump();
                if (key === 'slide' && this.state === 'PLAYING') this.player.slide();
            };

            const onEnd = (e) => {
                if (e.cancelable) e.preventDefault();
                this.keys[key] = false;
                if (key === 'slide' && this.state === 'PLAYING') this.player.stopSlide();
            };

            btn.addEventListener('touchstart', onStart, { passive: false });
            btn.addEventListener('touchend', onEnd, { passive: false });
            btn.addEventListener('touchcancel', onEnd, { passive: false });
            btn.addEventListener('mousedown', onStart);
            btn.addEventListener('mouseup', onEnd);
        };

        bindTouch('touch-jump-btn', 'jump');
        bindTouch('touch-slide-btn', 'slide');

        // Difficulty Selector Buttons
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const diff = e.target.getAttribute('data-diff');
                if (diff) {
                    this.difficulty = diff;
                    this.ui.setDifficultyUI(diff);
                    audioEngine.playItemPickup();
                }
            });
        });

        // Canvas Charging Pointer Handlers (Press & Hold for 2.0s Charge Shot)
        const handlePointerStart = (clientX, clientY) => {
            audioEngine.init();
            if (this.state !== 'PLAYING') return;

            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const touchX = (clientX - rect.left) * scaleX;
            const touchY = (clientY - rect.top) * scaleY;

            this.chargeTargetX = touchX + this.scrollX;
            this.chargeTargetY = touchY;

            // Trigger jump / slide based on screen height regions
            if (touchY < this.canvas.height * 0.35) {
                this.player.jump();
            } else if (touchY > this.canvas.height * 0.75) {
                this.player.slide();
            }

            // Start bow charging if bow equipped
            if (this.player.hasBow && this.shootCooldown <= 0) {
                this.isCharging = true;
                this.chargeFrames = 0;
            }
        };

        const handlePointerMove = (clientX, clientY) => {
            if (this.isCharging) {
                const rect = this.canvas.getBoundingClientRect();
                const scaleX = this.canvas.width / rect.width;
                const scaleY = this.canvas.height / rect.height;
                const touchX = (clientX - rect.left) * scaleX;
                const touchY = (clientY - rect.top) * scaleY;
                this.chargeTargetX = touchX + this.scrollX;
                this.chargeTargetY = touchY;
            }
        };

        const handlePointerEnd = () => {
            if (this.isCharging) {
                const ratio = Math.min(1.0, this.chargeFrames / 120); // 120 frames = 2.0s charge
                this.shootArrow(this.chargeTargetX, this.chargeTargetY, ratio);
                this.isCharging = false;
                this.chargeFrames = 0;
            }
        };

        this.canvas.addEventListener('touchstart', (e) => {
            if (e.touches && e.touches[0]) {
                handlePointerStart(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: true });

        this.canvas.addEventListener('touchmove', (e) => {
            if (e.touches && e.touches[0]) {
                handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: true });

        this.canvas.addEventListener('touchend', handlePointerEnd);
        this.canvas.addEventListener('touchcancel', handlePointerEnd);

        this.canvas.addEventListener('mousedown', (e) => {
            handlePointerStart(e.clientX, e.clientY);
        });

        this.canvas.addEventListener('mousemove', (e) => {
            handlePointerMove(e.clientX, e.clientY);
        });

        window.addEventListener('mouseup', handlePointerEnd);

        // UI Buttons
        document.getElementById('btn-start').addEventListener('click', () => {
            audioEngine.init();
            this.startGame();
        });
        document.getElementById('btn-how-to').addEventListener('click', () => this.ui.showScreen('HOWTO'));
        document.getElementById('btn-back-menu').addEventListener('click', () => this.ui.showScreen('MENU'));

        document.getElementById('btn-audio-toggle').addEventListener('click', (e) => {
            audioEngine.init();
            const enabled = audioEngine.toggleSound();
            e.target.textContent = `사운드: ${enabled ? 'ON' : 'OFF'}`;
        });

        document.getElementById('btn-crt-toggle').addEventListener('click', (e) => {
            this.crtEnabled = !this.crtEnabled;
            const crtElem = document.getElementById('crt-overlay');
            if (this.crtEnabled) {
                crtElem.classList.add('crt');
                e.target.textContent = 'CRT 효과: ON';
            } else {
                crtElem.classList.remove('crt');
                e.target.textContent = 'CRT 효과: OFF';
            }
        });

        const btnAutoFire = document.getElementById('btn-autofire-toggle');
        if (btnAutoFire) {
            btnAutoFire.addEventListener('click', (e) => {
                this.autoFireEnabled = !this.autoFireEnabled;
                e.target.textContent = `🏹 모바일 활 자동 발사: ${this.autoFireEnabled ? 'ON' : 'OFF'}`;
                if (this.autoFireEnabled) {
                    e.target.style.borderColor = '#eab308';
                    e.target.style.color = '#fef08a';
                } else {
                    e.target.style.borderColor = '#64748b';
                    e.target.style.color = '#ffffff';
                }
                audioEngine.playItemPickup();
            });
        }

        document.getElementById('btn-retry').addEventListener('click', () => {
            audioEngine.init();
            this.startGame();
        });
        document.getElementById('btn-next-stage').addEventListener('click', () => {
            audioEngine.init();
            this.startNextStage();
        });
        document.getElementById('btn-menu').addEventListener('click', () => this.ui.showScreen('MENU'));

        // Easy Mode Prompt Buttons
        const btnEasyYes = document.getElementById('btn-easy-yes');
        if (btnEasyYes) {
            btnEasyYes.addEventListener('click', () => {
                audioEngine.init();
                audioEngine.playWarpSound();
                this.state = 'VORTEX';
                this.ui.showScreen('VORTEX');

                setTimeout(() => {
                    audioEngine.playSafeZoneArrival();
                    this.state = 'SAFEZONE';
                    this.ui.populateSafeZone(this.stage, this.score, this.coins);
                    this.ui.showScreen('SAFEZONE');
                }, 2500);
            });
        }

        const btnEasyNo = document.getElementById('btn-easy-no');
        if (btnEasyNo) {
            btnEasyNo.addEventListener('click', () => {
                audioEngine.init();
                audioEngine.playSafeZoneArrival();
                this.state = 'SAFEZONE';
                this.ui.populateSafeZone(this.stage, this.score, this.coins);
                this.ui.showScreen('SAFEZONE');
            });
        }

        // Shop Buttons
        document.querySelectorAll('.buy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const item = e.target.getAttribute('data-item');
                const cost = parseInt(e.target.getAttribute('data-cost'));
                this.buyShopItem(item, cost, e.target);
            });
        });
    }

    startGame() {
        this.stage = 1;
        this.score = 0;
        this.coins = 50; // Starter coins
        this.dodgedObstacles = 0;
        this.startStage(1);
    }

    startStage(stageNum) {
        this.stage = stageNum;
        this.map.generateStage(stageNum);

        this.arrows = [];
        this.fireballs = [];
        this.minions = [];
        this.shootCooldown = 0;
        this.isCharging = false;
        this.chargeFrames = 0;

        // Mobile device detection (User Agent & Touch capability)
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || ('ontouchstart' in window);

        this.player.reset(120, this.map.groundY - 54);
        if (this.isMobile) {
            // Lower player & monster speed by 25% on mobile for comfortable touch control
            this.player.baseSpeed = 3.15; // standard PC default is 4.2
        } else {
            this.player.baseSpeed = 4.2;
        }

        this.player.setBow(this.difficulty === 'NORMAL' || this.difficulty === 'HARD');
        this.monster.reset(350, 1.0 + (stageNum - 1) * 0.10, this.difficulty, this.isMobile);

        this.scrollX = 0;
        this.state = 'PLAYING';
        this.ui.showScreen('PLAYING');
        this.ui.setTouchControls(true);

        audioEngine.stopHeartbeat();
        audioEngine.startBGM();
    }

    startNextStage() {
        this.startStage(this.stage + 1);
    }

    buyShopItem(item, cost, btnElem) {
        if (this.coins >= cost) {
            this.coins -= cost;
            if (item === 'shoes') {
                this.player.baseSpeed *= 1.1;
            } else if (item === 'drink') {
                this.player.maxStamina += 20;
                this.player.stamina = this.player.maxStamina;
            } else if (item === 'heal') {
                // Heal Stamina +30
                this.player.stamina = Math.min(this.player.maxStamina, this.player.stamina + 30);
            }
            audioEngine.playItemPickup();
            btnElem.textContent = '구매 완료!';
            btnElem.disabled = true;
            this.ui.populateSafeZone(this.stage, this.score, this.coins);
        }
    }

    update() {
        if (this.state !== 'PLAYING') return;

        // Bow Charging Audio & Frame Increment
        if (this.isCharging) {
            this.chargeFrames = Math.min(120, this.chargeFrames + 1);
            if (this.chargeFrames % 12 === 0) {
                audioEngine.playBowCharge(this.chargeFrames / 120);
            }
        }

        // 0. Update Shoot Cooldown & Projectiles (Arrows)
        if (this.shootCooldown > 0) this.shootCooldown--;

        // Auto Fire Bow (No charging, fires standard arrow at monster every cooldown)
        if (this.autoFireEnabled && this.player.hasBow && this.shootCooldown <= 0 && !this.monster.isDefeated) {
            const monsterWorldX = this.player.x - this.monster.distanceFromPlayer;
            const monsterWorldY = this.monster.y + 30;
            this.shootArrow(monsterWorldX, monsterWorldY, 0.0);
            this.shootCooldown = 25; // Continuous automatic firing every ~0.4s
        }

        for (let i = this.arrows.length - 1; i >= 0; i--) {
            const arrow = this.arrows[i];
            arrow.update();

            const screenX = arrow.x - this.scrollX;
            if (screenX > 1050 || screenX < -150 || arrow.y < -100 || arrow.y > 600) {
                this.arrows.splice(i, 1);
                continue;
            }

            // Check collision with Monster
            if (!this.monster.isDefeated) {
                const arrowBounds = arrow.getBounds();
                const monsterBounds = this.monster.getBounds(this.player.x);
                if (this.physics.checkCollision(arrowBounds, monsterBounds)) {
                    this.monster.takeDamage(arrow.damage, arrow.knockback);
                    this.physics.spawnDust(arrow.x, arrow.y, 14, '#a855f7');
                    this.physics.spawnDust(arrow.x, arrow.y, 10, '#ffcc00');
                    this.arrows.splice(i, 1);
                    continue;
                }
            }

            // Check collision with Minions
            for (let j = this.minions.length - 1; j >= 0; j--) {
                const minion = this.minions[j];
                if (minion.active && this.physics.checkCollision(arrow.getBounds(), minion.getBounds())) {
                    this.physics.spawnDust(minion.x, minion.y, 12, '#4a0e4e');
                    minion.active = false;
                    this.arrows.splice(i, 1);
                    break;
                }
            }
        }

        // 1. Update Player Physics & Position
        this.player.update(this.keys);
        this.player.x += this.player.currentSpeed;
        this.score += this.player.currentSpeed * 0.2;

        // 2. Camera Scroll Offset (Center on player)
        this.scrollX = this.player.x - 180;

        // 3. Update Monster Physics & Spawns (Fireballs & Minions)
        const spawnFlags = this.monster.update(this.player.currentSpeed, this.player.isStumbling);
        if (spawnFlags) {
            const monsterWorldX = this.player.x - this.monster.distanceFromPlayer;
            if (spawnFlags.spawnFireball) {
                const fireball = new Fireball(
                    monsterWorldX + 40,
                    this.monster.y + 25,
                    this.player.x + 10,
                    this.player.y + 10
                );
                this.fireballs.push(fireball);
                audioEngine.playFireballSound();
            }
            if (spawnFlags.spawnMinion) {
                const minion = new Minion(monsterWorldX + 50, this.map.groundY - 32);
                this.minions.push(minion);
                this.physics.spawnDust(minion.x, minion.y, 8, '#4a0e4e');
            }
        }

        // Update Fireballs & Check Collision with Player
        for (let i = this.fireballs.length - 1; i >= 0; i--) {
            const fb = this.fireballs[i];
            fb.update();

            const fbBounds = fb.getBounds();
            const playerBounds = this.player.getBounds();

            if (this.physics.checkCollision(fbBounds, playerBounds)) {
                this.player.stamina = Math.max(0, this.player.stamina - 35);
                this.player.stumble();
                this.physics.spawnDust(this.player.x + 15, this.player.y + 20, 16, '#ef4444');
                audioEngine.playHitObstacle();
                this.fireballs.splice(i, 1);

                if (this.player.stamina <= 0) {
                    this.gameOver();
                    return;
                }
                continue;
            }

            const fbScreenX = fb.x - this.scrollX;
            if (fbScreenX > 1100 || fbScreenX < -200 || fb.y > 600 || fb.y < -100) {
                this.fireballs.splice(i, 1);
            }
        }

        // Update Minions & Check Collision with Player
        for (let i = this.minions.length - 1; i >= 0; i--) {
            const minion = this.minions[i];
            minion.update();

            if (minion.active && this.physics.checkCollision(minion.getBounds(), this.player.getBounds())) {
                this.player.stamina = Math.max(0, this.player.stamina - 10);
                this.player.stumble();
                this.physics.spawnDust(this.player.x + 10, this.player.y + 20, 10, '#4a0e4e');
                audioEngine.playHitObstacle();
                minion.active = false;

                if (this.player.stamina <= 0) {
                    this.gameOver();
                    return;
                }
            }

            const minionScreenX = minion.x - this.scrollX;
            if (!minion.active || minionScreenX > 1100 || minionScreenX < -200) {
                this.minions.splice(i, 1);
            }
        }

        // 4. Check Monster Catch Condition (Only if monster is active & not defeated)
        if (!this.monster.isDefeated && this.monster.distanceFromPlayer <= 12) {
            this.gameOver();
            return;
        }

        // 5. Check Obstacle Collisions & Items
        const playerBounds = this.player.getBounds();

        this.map.obstacles.forEach(obs => {
            if (obs.collected) return;
            const obsBounds = obs.getBounds();

            if (this.physics.checkCollision(playerBounds, obsBounds)) {
                if (obs.type === 'milk') {
                    // Item pickup - Only gives Coins & Score (No natural stamina regen)
                    obs.collected = true;
                    this.coins += 15;
                    this.score += 200;
                    this.physics.spawnSparkles(obs.x, obs.y);
                    audioEngine.playItemPickup();
                } else if (obs.type === 'safe_door') {
                    // REACHED SAFE ZONE!
                    this.reachSafeZone();
                } else {
                    // Hit Obstacle (Desk / Chair / Stack / High Overhead)
                    if (!this.player.isStumbling) {
                        this.player.stumble();
                        this.physics.spawnSplinters(this.player.x + 20, this.player.y + 20);
                    }
                }
            } else {
                // Count dodged obstacles
                if (!obs.passed && obs.x < this.player.x && obs.type !== 'milk' && obs.type !== 'safe_door') {
                    obs.passed = true;
                    this.dodgedObstacles++;
                    this.score += 50;
                }
            }
        });

        // 6. Update HUD UI
        const distanceLeftMeters = (this.map.stageLength - this.player.x) / 8;
        this.ui.updateHUD(
            this.stage,
            distanceLeftMeters,
            this.map.stageDistance,
            this.player.x,
            this.monster.distanceFromPlayer,
            this.player.stamina,
            this.player.maxStamina,
            this.score,
            this.monster.hp,
            this.monster.maxHp,
            this.difficulty,
            this.monster.isDefeated
        );

        // 7. Particle system update
        this.physics.updateParticles();
    }

    reachSafeZone() {
        audioEngine.stopHeartbeat();
        audioEngine.stopBGM();
        this.coins += 50;
        this.ui.setTouchControls(false);

        if (this.difficulty === 'EASY') {
            this.state = 'EASY_PROMPT';
            this.ui.showScreen('EASY_PROMPT');
        } else {
            audioEngine.playSafeZoneArrival();
            this.state = 'SAFEZONE';
            this.ui.populateSafeZone(this.stage, this.score, this.coins);
            this.ui.showScreen('SAFEZONE');
        }
    }

    gameOver() {
        this.state = 'GAMEOVER';
        audioEngine.stopHeartbeat();
        audioEngine.stopBGM();
        audioEngine.playGameOverSound();
        this.ui.populateGameOver(this.stage, this.score, this.dodgedObstacles);
        this.ui.showScreen('GAMEOVER');
        this.ui.setTouchControls(false);
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 1. Draw Parallax Background & Hallway Floor
        this.map.drawBackground(this.ctx, this.scrollX);

        // 2. Draw Obstacles & Items & Safe Zone Door
        this.map.obstacles.forEach(obs => {
            obs.draw(this.ctx, this.scrollX);
        });

        // 3. Draw Player & Bow
        this.player.draw(this.ctx, this.scrollX);
        if (this.isCharging) {
            const ratio = Math.min(1.0, this.chargeFrames / 120);
            this.player.drawChargeGauge(this.ctx, this.scrollX, ratio);
        }

        // 4. Draw Projectiles (Arrows, Fireballs, Minions)
        this.arrows.forEach(arrow => arrow.draw(this.ctx, this.scrollX));
        this.fireballs.forEach(fb => fb.draw(this.ctx, this.scrollX));
        this.minions.forEach(m => m.draw(this.ctx, this.scrollX));

        // 5. Draw Monster
        this.monster.draw(this.ctx, this.player.x, this.scrollX);

        // 6. Render Particle Effects (only in draw, not update)
        this.physics.updateAndDrawParticles(this.ctx, this.scrollX);
    }

    gameLoop = () => {
        this.update();
        this.draw();
        requestAnimationFrame(this.gameLoop);
    }
}

// Initialize Game on Load
window.addEventListener('load', () => {
    new Game();
});
