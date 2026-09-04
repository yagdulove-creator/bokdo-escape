/**
 * Fireball Projectile class fired by Monster in "복도탈출"
 */
class Fireball {
    constructor(x, y, targetX, targetY) {
        this.x = x;
        this.y = y;
        this.width = 24;
        this.height = 24;
        this.speed = 7.5;
        this.active = true;
        this.animTimer = 0;

        // Angle towards target (player)
        const dx = targetX - x;
        const dy = targetY - y;
        const angle = Math.atan2(dy, dx);
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.animTimer++;
    }

    getBounds() {
        return {
            x: this.x + 2,
            y: this.y + 2,
            width: this.width - 4,
            height: this.height - 4
        };
    }

    draw(ctx, scrollX) {
        const screenX = this.x - scrollX;
        if (screenX < -50 || screenX > 1050) return;

        ctx.save();
        const pulse = Math.sin(this.animTimer * 0.3) * 3;

        // Outer Flame Glow
        ctx.fillStyle = 'rgba(255, 68, 0, 0.4)';
        ctx.beginPath();
        ctx.arc(screenX + 12, this.y + 12, 16 + pulse, 0, Math.PI * 2);
        ctx.fill();

        // Fireball Core
        ctx.fillStyle = '#ff3300';
        ctx.beginPath();
        ctx.arc(screenX + 12, this.y + 12, 10, 0, Math.PI * 2);
        ctx.fill();

        // Hot Yellow Center
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.arc(screenX + 12, this.y + 12, 5, 0, Math.PI * 2);
        ctx.fill();

        // White Core Spark
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(screenX + 10, this.y + 10, 4, 4);

        ctx.restore();
    }
}
