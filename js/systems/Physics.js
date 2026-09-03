/**
 * Physics & Particle Effects System for "복도탈출"
 */
class Physics {
    constructor() {
        this.particles = [];
    }

    // AABB Bounding Box Collision Check
    checkCollision(rect1, rect2) {
        return (
            rect1.x < rect2.x + rect2.width &&
            rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height &&
            rect1.y + rect1.height > rect2.y
        );
    }

    // Spawn Particle Sparkle / Dust
    spawnDust(x, y, count = 5, color = '#cbd5e1') {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 3 - 1,
                size: Math.random() * 4 + 2,
                color: color,
                alpha: 1.0,
                life: Math.random() * 20 + 10
            });
        }
    }

    spawnSplinters(x, y) {
        this.spawnDust(x, y, 12, '#b45309');
    }

    spawnSparkles(x, y) {
        this.spawnDust(x, y, 10, '#38bdf8');
    }

    // Update only (no draw) - called from game update loop
    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= 1.0 / p.life;
            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    updateAndDrawParticles(ctx, scrollX) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            const screenX = p.x - scrollX;
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.alpha);
            ctx.fillStyle = p.color;
            ctx.fillRect(screenX, p.y, p.size, p.size);
            ctx.restore();
        }
    }
}
