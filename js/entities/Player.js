/**
 * Player Entity class for "복도탈출"
 */
class Player {
    constructor(x, y) {
        this.startX = x;
        this.startY = y;
        
        this.x = x;
        this.y = y;
        this.width = 36;
        this.height = 54;
        
        this.normalHeight = 54;
        this.slideHeight = 28;

        this.vx = 0;
        this.vy = 0;

        this.baseSpeed = 4.2;
        this.speedMultiplier = 1.0;
        this.currentSpeed = this.baseSpeed;

        this.isGrounded = true;
        this.isJumping = false;
        this.isSliding = false;
        this.isStumbling = false;
        this.stumbleTimer = 0;

        this.maxJumps = 2;
        this.jumpCount = 0;

        this.jumpForce = -12.5;
        this.gravity = 0.6;

        this.stamina = 100;
        this.maxStamina = 100;
        this.isSprinting = false;
        this.hasBow = false;

        this.animTimer = 0;
        this.animFrame = 0;

        this.groundY = y;
    }

    reset(x, y) {
        this.x = x;
        this.y = y;
        this.groundY = y;
        this.vy = 0;
        this.vx = 0;
        this.isGrounded = true;
        this.isJumping = false;
        this.isSliding = false;
        this.isStumbling = false;
        this.stumbleTimer = 0;
        this.jumpCount = 0;
        this.stamina = this.maxStamina;
        this.height = this.normalHeight;
    }

    setBow(enabled = true) {
        this.hasBow = enabled;
    }

    jump() {
        if (this.isStumbling) return;

        if (this.isGrounded) {
            // First Jump (from ground)
            this.vy = this.jumpForce;
            this.isGrounded = false;
            this.isJumping = true;
            this.isSliding = false;
            this.height = this.normalHeight;
            this.jumpCount = 1;
            audioEngine.playJump();
        } else if (this.jumpCount < this.maxJumps) {
            // Air / Double Jump
            this.vy = this.jumpForce * 0.95;
            this.isJumping = true;
            this.isSliding = false;
            this.height = this.normalHeight;
            this.jumpCount = 2;
            audioEngine.playJump();
        }
    }

    slide() {
        if (!this.isSliding && !this.isStumbling) {
            if (this.isGrounded) {
                this.isSliding = true;
                this.height = this.slideHeight;
                this.y = this.groundY + (this.normalHeight - this.slideHeight);
                audioEngine.playSlide();
            } else {
                // Fast fall if airborne
                this.vy += 8;
            }
        }
    }

    stopSlide() {
        if (this.isSliding) {
            this.isSliding = false;
            this.height = this.normalHeight;
            this.y = this.groundY;
        }
    }

    stumble() {
        if (!this.isStumbling) {
            this.isStumbling = true;
            this.stumbleTimer = 45; // 0.75 seconds penalty
            this.currentSpeed = this.baseSpeed * 0.3;
            audioEngine.playHitObstacle();
        }
    }

    update(keys) {
        // Stumble recovery timer
        if (this.isStumbling) {
            this.stumbleTimer--;
            if (this.stumbleTimer <= 0) {
                this.isStumbling = false;
            }
        }

        // Sprinting handling
        if (keys.sprint && this.stamina > 0 && !this.isStumbling) {
            this.isSprinting = true;
            this.speedMultiplier = 1.3;
            this.stamina = Math.max(0, this.stamina - 0.5);
        } else {
            this.isSprinting = false;
            this.speedMultiplier = 1.0;
            // Note: Automatic stamina regeneration disabled per user request!
        }

        // Left / Right Speed adjustment
        let moveDir = 0;
        if (keys.left) moveDir -= 1;
        if (keys.right) moveDir += 1;

        if (!this.isStumbling) {
            const targetSpeed = (this.baseSpeed + moveDir * 2.0) * this.speedMultiplier;
            this.currentSpeed += (targetSpeed - this.currentSpeed) * 0.1;
        }

        // Vertical physics (gravity & ground level)
        this.y += this.vy;
        if (!this.isGrounded) {
            this.vy += this.gravity;
            if (this.y >= this.groundY) {
                this.y = this.groundY;
                this.vy = 0;
                this.isGrounded = true;
                this.isJumping = false;
                this.jumpCount = 0;
                audioEngine.playFootstep();
            }
        }

        // Slide timer / key release check
        if (this.isSliding && !keys.slide) {
            this.stopSlide();
        }

        // Animation frame counter
        this.animTimer++;
        if (this.animTimer % 6 === 0) {
            this.animFrame = (this.animFrame + 1) % 2;
            if (this.isGrounded && !this.isSliding && !this.isStumbling) {
                audioEngine.playFootstep();
            }
        }
    }

    getBounds() {
        return {
            x: this.x + 4,
            y: this.y,
            width: this.width - 8,
            height: this.height
        };
    }

    draw(ctx, scrollX = 0) {
        let spriteName = 'player_run1';

        if (this.isStumbling) {
            spriteName = 'player_jump';
        } else if (!this.isGrounded) {
            spriteName = 'player_jump';
        } else if (this.isSliding) {
            spriteName = 'player_slide';
        } else {
            spriteName = this.animFrame === 0 ? 'player_run1' : 'player_run2';
        }

        const screenX = this.x - scrollX;
        const sprite = pixelGraphics.getSprite(spriteName);
        if (sprite) {
            ctx.save();
            if (this.isStumbling) {
                ctx.globalAlpha = (Math.floor(Date.now() / 80) % 2 === 0) ? 0.5 : 1.0;
            }
            ctx.drawImage(sprite, screenX, this.y, this.width, this.height);

            // Draw Bow on player when equipped (NORMAL/HARD difficulty)
            if (this.hasBow) {
                ctx.strokeStyle = '#b45309';
                ctx.lineWidth = 3;
                ctx.beginPath();
                // Curved wooden bow string & arc
                ctx.arc(screenX + 22, this.y + 24, 14, -Math.PI * 0.45, Math.PI * 0.45);
                ctx.stroke();

                ctx.strokeStyle = '#e2e8f0';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(screenX + 22 + 14 * Math.cos(-Math.PI * 0.45), this.y + 24 + 14 * Math.sin(-Math.PI * 0.45));
                ctx.lineTo(screenX + 22 + 14 * Math.cos(Math.PI * 0.45), this.y + 24 + 14 * Math.sin(Math.PI * 0.45));
                ctx.stroke();
            }

            ctx.restore();
        } else {
            // Fallback rectangle
            ctx.fillStyle = '#ff3366';
            ctx.fillRect(screenX, this.y, this.width, this.height);
        }
    }

    drawChargeGauge(ctx, scrollX, chargeRatio) {
        if (chargeRatio <= 0 || !this.hasBow) return;

        const screenX = this.x - scrollX;
        const barX = screenX - 4;
        const barY = this.y - 20;
        const barW = 44;
        const barH = 8;
        const pct = Math.min(1.0, Math.max(0, chargeRatio));

        ctx.save();

        // Dark background box
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.strokeStyle = (pct >= 1.0) ? '#ffcc00' : '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(barX, barY, barW, barH);

        // Fill progress bar
        const fillW = Math.max(0, (barW - 2) * pct);
        ctx.fillStyle = (pct >= 1.0) ? '#ef4444' : ((pct > 0.5) ? '#fbbf24' : '#38bdf8');
        ctx.fillRect(barX + 1, barY + 1, fillW, barH - 2);

        // Text display above bar
        ctx.font = 'bold 8px DungGeunMo, monospace';
        ctx.fillStyle = (pct >= 1.0) ? '#ffcc00' : '#ffffff';
        ctx.textAlign = 'center';
        const pctText = (pct >= 1.0) ? '100% MAX!' : `${Math.floor(pct * 100)}%`;
        ctx.fillText(pctText, screenX + 18, barY - 3);

        ctx.restore();
    }
}
