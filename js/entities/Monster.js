/**
 * Monster Entity class for "복도탈출"
 * Chases the player down the hallway from the left.
 */
class Monster {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 64;
        this.height = 72;

        this.distanceFromPlayer = 400;
        this.baseSpeed = 6.0;
        this.speed = this.baseSpeed;
        
        this.isStunned = false;
        this.stunTimer = 0;

        this.animTimer = 0;
        this.pulsePhase = 0;
        this.heartbeatActive = false;

        this.maxHp = 800; // Significantly increased Boss HP!
        this.hp = 800;
        this.isDefeated = false;
        this.fireballCooldown = 180;
        this.minionCooldown = 180;
    }

    reset(startDistance = 350, stageMultiplier = 1.0, difficulty = 'NORMAL', isMobile = false) {
        this.difficulty = difficulty;
        this.isMobile = isMobile;
        let diffMult = 1.35; // Restored Normal difficulty speed to original!
        let dist = startDistance;

        if (difficulty === 'EASY') {
            diffMult = 0.95; // Increased Easy speed so boss chases properly!
            dist = 380;
        } else if (difficulty === 'HARD') {
            diffMult = 1.70; // Fast Boss speed for HARD mode!
            dist = 260;
        }

        this.distanceFromPlayer = dist;
        const mobileSpeedFactor = isMobile ? 0.75 : 1.0; // 25% slower on mobile
        this.baseSpeed = 2.8 * stageMultiplier * diffMult * mobileSpeedFactor;
        this.speed = this.baseSpeed;
        this.isStunned = false;
        this.stunTimer = 0;
        this.heartbeatActive = false;

        this.maxHp = 800;
        this.hp = 800;
        this.isDefeated = false;
        this.fireballCooldown = 150;
        this.minionCooldown = 180;
    }

    stun(durationFrames = 180) {
        this.isStunned = true;
        this.stunTimer = durationFrames;
        audioEngine.playMonsterRoar();
    }

    takeDamage(amount = 25, knockbackDist = 60) {
        if (this.isDefeated) return;

        this.hp = Math.max(0, this.hp - amount);
        this.distanceFromPlayer += knockbackDist; // Knockback boss backwards!
        audioEngine.playHitObstacle();

        if (this.hp <= 0) {
            this.isDefeated = true;
            this.distanceFromPlayer = 9999; // Disappear for current stage
            if (this.heartbeatActive) {
                this.heartbeatActive = false;
                audioEngine.stopHeartbeat();
            }
        }
    }

    update(playerSpeed, isPlayerStumbling) {
        if (this.isDefeated) return { spawnFireball: false, spawnMinion: false };

        // Fireball & Minion spawn check
        let spawnFireball = false;
        let spawnMinion = false;

        if (this.difficulty === 'NORMAL' || this.difficulty === 'HARD') {
            this.fireballCooldown--;
            if (this.fireballCooldown <= 0 && this.distanceFromPlayer < 650) {
                spawnFireball = true;
                this.fireballCooldown = (this.difficulty === 'HARD') ? 110 : 210; // HARD: 1.8s, NORMAL: 3.5s
            }
        }

        if (this.difficulty === 'HARD') {
            this.minionCooldown--;
            if (this.minionCooldown <= 0 && this.distanceFromPlayer < 650) {
                spawnMinion = true;
                this.minionCooldown = 180; // Every 3 seconds spawn minion
            }
        }

        if (this.isStunned) {
            this.stunTimer--;
            if (this.stunTimer <= 0) {
                this.isStunned = false;
            }
            // Stunned monster falls behind slightly
            this.distanceFromPlayer += 2.5;
            return { spawnFireball, spawnMinion };
        }

        // Catch-up logic:
        let catchUpRate = 0;
        const hardMult = (this.difficulty === 'HARD') ? 1.5 : (this.difficulty === 'EASY' ? 0.8 : 1.0);

        if (isPlayerStumbling) {
            catchUpRate = 2.2 * hardMult;
        } else {
            // Speed comparison
            const deltaSpeed = this.speed - playerSpeed;
            catchUpRate = deltaSpeed * 0.5 * hardMult;
        }

        this.distanceFromPlayer -= catchUpRate;

        // Minimum boundary
        if (this.distanceFromPlayer < 0) {
            this.distanceFromPlayer = 0;
        }

        // Animation pulse
        this.animTimer++;
        this.pulsePhase = Math.sin(this.animTimer * 0.15) * 4;

        // Heartbeat audio trigger based on proximity (only trigger on state change)
        const proximity = Math.max(0, 400 - this.distanceFromPlayer);
        if (proximity > 100) {
            if (!this.heartbeatActive) {
                this.heartbeatActive = true;
                const heartInterval = Math.max(200, 600 - proximity * 1.2);
                audioEngine.playHeartbeat(heartInterval);
            }
        } else {
            if (this.heartbeatActive) {
                this.heartbeatActive = false;
                audioEngine.stopHeartbeat();
            }
        }

        return { spawnFireball, spawnMinion };
    }

    getBounds(playerX) {
        if (this.isDefeated) return { x: -9999, y: -9999, width: 0, height: 0 };
        const currentX = playerX - this.distanceFromPlayer;
        return {
            x: currentX + 10,
            y: this.y,
            width: this.width - 15,
            height: this.height
        };
    }

    draw(ctx, playerX, scrollX = 0) {
        if (this.isDefeated) return;
        const worldX = playerX - this.distanceFromPlayer;
        const renderX = worldX - scrollX;
        const renderY = this.y + this.pulsePhase;

        ctx.save();

        if (this.isStunned) {
            ctx.globalAlpha = 0.4;
        }

        // Draw Shadow Aura Particles around monster
        ctx.fillStyle = 'rgba(74, 14, 78, 0.4)';
        ctx.beginPath();
        ctx.ellipse(renderX + this.width / 2, renderY + this.height / 2, this.width * 0.7, this.height * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Monster Pixel Sprite
        const sprite = pixelGraphics.getSprite('monster');
        if (sprite) {
            ctx.drawImage(sprite, renderX, renderY, this.width, this.height);
        } else {
            ctx.fillStyle = '#0d0714';
            ctx.fillRect(renderX, renderY, this.width, this.height);
        }

        // Glowing red eye light beam towards player
        const eyeX = renderX + this.width * 0.7;
        const eyeY = renderY + 25;
        const beamGradient = ctx.createRadialGradient(eyeX, eyeY, 2, eyeX + 80, eyeY, 120);
        beamGradient.addColorStop(0, 'rgba(255, 0, 68, 0.6)');
        beamGradient.addColorStop(1, 'rgba(255, 0, 68, 0)');
        
        ctx.fillStyle = beamGradient;
        ctx.beginPath();
        ctx.moveTo(eyeX, eyeY);
        ctx.lineTo(eyeX + 160, eyeY - 20);
        ctx.lineTo(eyeX + 160, eyeY + 40);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
}
