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

        this.jumpForce = -12.5;
        this.gravity = 0.6;

        this.stamina = 100;
        this.maxStamina = 100;
        this.isSprinting = false;

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
        this.stamina = this.maxStamina;
        this.height = this.normalHeight;
    }

    jump() {
        if (this.isGrounded && !this.isStumbling) {
            this.vy = this.jumpForce;
            this.isGrounded = false;
            this.isJumping = true;
            this.isSliding = false;
            this.height = this.normalHeight;
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
            if (this.stamina < this.maxStamina) {
                this.stamina = Math.min(this.maxStamina, this.stamina + 0.2);
            }
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
            ctx.restore();
        } else {
            // Fallback rectangle
            ctx.fillStyle = '#ff3366';
            ctx.fillRect(screenX, this.y, this.width, this.height);
        }
    }
}
