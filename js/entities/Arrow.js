/**
 * Arrow Projectile class for "복도탈출"
 */
class Arrow {
    constructor(x, y, targetX, targetY, chargeRatio = 0.0) {
        this.x = x;
        this.y = y;
        this.width = 24;
        this.height = 8;
        this.chargeRatio = Math.min(1.0, Math.max(0.0, chargeRatio));
        
        // Scale power with charge ratio
        this.speed = 13 + this.chargeRatio * 10;
        this.damage = Math.floor(12 + this.chargeRatio * 68); // 12 ~ 80 DMGBoss HP
        this.knockback = Math.floor(35 + this.chargeRatio * 115); // 35 ~ 150 Knockback
        this.active = true;

        // Calculate velocity vector toward target
        const dx = targetX - x;
        const dy = targetY - y;
        this.angle = Math.atan2(dy, dx);
        
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
    }

    getBounds() {
        return {
            x: this.x - 10,
            y: this.y - 6,
            width: this.width,
            height: this.height + 4
        };
    }

    draw(ctx, scrollX) {
        const screenX = this.x - scrollX;
        ctx.save();
        ctx.translate(screenX, this.y);
        ctx.rotate(this.angle);

        // Fully Charged Glow effect
        if (this.chargeRatio >= 0.8) {
            ctx.fillStyle = 'rgba(255, 204, 0, 0.5)';
            ctx.beginPath();
            ctx.arc(0, 0, 16, 0, Math.PI * 2);
            ctx.fill();
        }

        // Arrow Shaft
        ctx.fillStyle = (this.chargeRatio >= 0.8) ? '#fbbf24' : '#d97706';
        ctx.fillRect(-12, -1.5, 20, 3);

        // Metallic Arrowhead
        ctx.fillStyle = (this.chargeRatio >= 0.8) ? '#ffffff' : '#e2e8f0';
        ctx.beginPath();
        ctx.moveTo(8, -4 - this.chargeRatio * 2);
        ctx.lineTo(15 + this.chargeRatio * 4, 0);
        ctx.lineTo(8, 4 + this.chargeRatio * 2);
        ctx.closePath();
        ctx.fill();

        // Red Fletching Feathers
        ctx.fillStyle = (this.chargeRatio >= 0.8) ? '#ff0044' : '#ef4444';
        ctx.fillRect(-12, -4, 4, 3);
        ctx.fillRect(-12, 1.5, 4, 3);

        ctx.restore();
    }
}
