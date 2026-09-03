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
        this.state = 'MENU'; // MENU, HOWTO, PLAYING, SAFEZONE, GAMEOVER, GAME_WARP, VORTEX, RECORDING
        this.stage = 1;
        this.score = 0;
        this.coins = 0;
        this.dodgedObstacles = 0;
        this.flashbangCount = 0;

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
        // Note: left/right/sprint/slide buttons removed - jump only on mobile

        // Canvas Direct Touch Tapping (Upper 50% = Jump, Lower 50% = Slide)
        // Properly account for canvas CSS scaling on mobile
        this.canvas.addEventListener('touchstart', (e) => {
            audioEngine.init();
            if (this.state !== 'PLAYING') return;
            const rect = this.canvas.getBoundingClientRect();
            const scaleY = this.canvas.height / rect.height;
            const touchY = (e.touches[0].clientY - rect.top) * scaleY;
            if (touchY < this.canvas.height * 0.5) {
                this.player.jump();
            } else {
                this.player.slide();
            }
        }, { passive: true });

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

        // Warp dialog buttons
        document.getElementById('btn-warp-yes').addEventListener('click', () => {
            audioEngine.init();
            this.startVortex();
        });
        document.getElementById('btn-warp-no').addEventListener('click', () => {
            // Dismiss dialog - go to normal safe zone screen
            this.state = 'SAFEZONE';
            this.ui.populateSafeZone(this.stage, this.score, this.coins);
            this.ui.showScreen('SAFEZONE');
        });

        // Recording screen continue button
        document.getElementById('btn-rec-continue').addEventListener('click', () => {
            audioEngine.init();
            this.startNextStage();
        });
        document.getElementById('btn-retry').addEventListener('click', () => {
            audioEngine.init();
            this.startGame();
        });
        document.getElementById('btn-next-stage').addEventListener('click', () => {
            audioEngine.init();
            this.startNextStage();
        });
        document.getElementById('btn-menu').addEventListener('click', () => this.ui.showScreen('MENU'));

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

        this.player.reset(120, this.map.groundY - 54);
        this.monster.reset(350, 1.0 + (stageNum - 1) * 0.10);

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
            } else if (item === 'flash') {
                this.flashbangCount++;
                this.monster.stun(240); // Stuns monster in next stage start
            }
            audioEngine.playItemPickup();
            btnElem.textContent = '구매 완료!';
            btnElem.disabled = true;
            this.ui.populateSafeZone(this.stage, this.score, this.coins);
        }
    }

    update() {
        if (this.state !== 'PLAYING') return;

        // 1. Update Player Physics & Position
        this.player.update(this.keys);
        this.player.x += this.player.currentSpeed;
        this.score += this.player.currentSpeed * 0.2;

        // 2. Camera Scroll Offset (Center on player)
        this.scrollX = this.player.x - 180;

        // 3. Update Monster Physics & Proximity
        this.monster.update(this.player.currentSpeed, this.player.isStumbling);

        // 4. Check Monster Catch Condition (Outside safe zone)
        if (this.monster.distanceFromPlayer <= 12) {
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
                    // Item pickup
                    obs.collected = true;
                    this.player.stamina = Math.min(this.player.maxStamina, this.player.stamina + 35);
                    this.coins += 15;
                    this.score += 200;
                    this.physics.spawnSparkles(obs.x, obs.y);
                    audioEngine.playItemPickup();
                } else if (obs.type === 'safe_door') {
                    // REACHED SAFE ZONE!
                    this.reachSafeZone();
                } else {
                    // Hit Obstacle (Desk / Chair / Stack)
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
            this.score
        );

        // 7. Particle system update
        this.physics.updateParticles();
    }

    reachSafeZone() {
        audioEngine.stopHeartbeat();
        audioEngine.stopBGM();
        audioEngine.playSafeZoneArrival();
        this.coins += 50;
        this.ui.setTouchControls(false);

        // Stage 1 special: show game-warp error dialog instead of normal safe zone
        if (this.stage === 1) {
            this.state = 'GAME_WARP';
            this.ui.showScreen('GAME_WARP');
        } else {
            this.state = 'SAFEZONE';
            this.ui.populateSafeZone(this.stage, this.score, this.coins);
            this.ui.showScreen('SAFEZONE');
        }
    }

    startVortex() {
        this.state = 'VORTEX';
        this.ui.showScreen('VORTEX');
        audioEngine.stopBGM();
        audioEngine.playWarpSound();

        // Vortex text countdown
        const vortexTextEl = document.getElementById('vortex-text');
        const messages = [
            '게임 세계로 진입 중...',
            '현실과의 연결 해제...',
            '데이터 스트림 동기화...',
            '경계선 돌파...',
            '진입 완료!'
        ];
        let msgIdx = 0;
        const msgTimer = setInterval(() => {
            msgIdx++;
            if (msgIdx < messages.length && vortexTextEl) {
                vortexTextEl.textContent = messages[msgIdx];
            }
        }, 1000);

        // After 5 seconds → show recording screen
        setTimeout(() => {
            clearInterval(msgTimer);
            this.state = 'RECORDING';
            this.ui.showScreen('RECORDING');
        }, 5000);
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

        // 3. Draw Player
        this.player.draw(this.ctx, this.scrollX);

        // 4. Draw Monster
        this.monster.draw(this.ctx, this.player.x, this.scrollX);

        // 5. Render Particle Effects (only in draw, not update)
        this.physics.updateAndDrawParticles(this.ctx, this.scrollX);
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(this.gameLoop);
    }
}

// Initialize Game on Load
window.addEventListener('load', () => {
    new Game();
});
