class Minion {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 24;
        this.height = 24;
        this.speed = 3.5;
        this.active = true;
        this.spriteName = 'monster'; // uses minified monster sprite
    }

    update(deltaTime = 16) {
        if (!this.active) return;
        // Minion runs to the left towards player
        this.x -= this.speed * (deltaTime / 16);
        if (this.x < -50) {
            this.active = false;
        }
    }

    getBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }

    draw(ctx, scrollX) {
        if (!this.active) return;
        const screenX = this.x - scrollX;
        ctx.save();
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(screenX, this.y, this.width, this.height);
        // Inner shadow core
        ctx.fillStyle = '#450a0a';
        ctx.fillRect(screenX + 4, this.y + 4, this.width - 8, this.height - 8);
        ctx.restore();
    }
}

window.Minion = Minion;
