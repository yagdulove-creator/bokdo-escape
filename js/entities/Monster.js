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
    }

    reset(startDistance = 350, stageMultiplier = 1.0) {
        this.distanceFromPlayer = startDistance;
        this.baseSpeed = 2.8 * stageMultiplier;
        this.speed = this.baseSpeed;
        this.isStunned = false;
        this.stunTimer = 0;
        this.heartbeatActive = false;
    }

    stun(durationFrames = 180) {
        this.isStunned = true;
        this.stunTimer = durationFrames;
        audioEngine.playMonsterRoar();
    }

    update(playerSpeed, isPlayerStumbling) {
        if (this.isStunned) {
            this.stunTimer--;
            if (this.stunTimer <= 0) {
                this.isStunned = false;
            }
            // Stunned monster falls behind slightly
            this.distanceFromPlayer += 2.5;
            return;
        }

        // Catch-up logic:
        let catchUpRate = 0;
        if (isPlayerStumbling) {
            catchUpRate = 1.8;
        } else {
            // Speed comparison
            const deltaSpeed = this.speed - playerSpeed;
            catchUpRate = deltaSpeed * 0.5;
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
    }

    getBounds(playerX) {
        const currentX = playerX - this.distanceFromPlayer;
        return {
            x: currentX + 10,
            y: this.y,
            width: this.width - 15,
            height: this.height
        };
    }

    draw(ctx, playerX, scrollX = 0) {
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
