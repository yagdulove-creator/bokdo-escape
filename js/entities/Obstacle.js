/**
 * Obstacle and Item Entity class for "복도탈출"
 */
class Obstacle {
    constructor(type, x, y) {
        this.type = type; // 'desk', 'chair', 'stack', 'milk', 'safe_door'
        this.x = x;
        this.y = y;
        this.passed = false;
        this.collected = false;

        this.width = 36;
        this.height = 42;

        this.configureType();
    }

    configureType() {
        switch (this.type) {
            case 'desk':
                this.width = 44;
                this.height = 36;
                this.spriteName = 'obstacle_desk';
                break;
            case 'chair':
                this.width = 32;
                this.height = 34;
                this.spriteName = 'obstacle_chair';
                break;
            case 'stack':
                this.width = 46;
                this.height = 56;
                this.spriteName = 'obstacle_stack';
                break;
            case 'high':
                this.width = 56;
                this.height = 380;
                this.spriteName = 'obstacle_high';
                break;
            case 'milk':
                this.width = 24;
                this.height = 24;
                this.spriteName = 'item_milk';
                break;
            case 'safe_door':
                this.width = 120;
                this.height = 140;
                this.spriteName = 'safe_door';
                break;
        }
    }

    getBounds() {
        return {
            x: this.x + 2,
            y: this.y,
            width: this.width - 4,
            height: this.height
        };
    }

    draw(ctx, scrollX) {
        const screenX = this.x - scrollX;
        if (screenX + this.width < -50 || screenX > 1050) return; // Frustum culling

        const sprite = pixelGraphics.getSprite(this.spriteName);
        if (sprite) {
            if (this.type === 'milk') {
                // Hover bounce animation for item
                const hoverY = Math.sin(Date.now() * 0.005) * 4;
                ctx.drawImage(sprite, screenX, this.y + hoverY, this.width, this.height);
            } else if (this.type === 'safe_door') {
                // Glowing Marathon Rest Zone Station Entrance
                ctx.save();
                ctx.shadowColor = '#0284c7';
                ctx.shadowBlur = 25;
                ctx.drawImage(sprite, screenX, this.y - 100, this.width, this.height);
                ctx.restore();
            } else {
                ctx.drawImage(sprite, screenX, this.y, this.width, this.height);
            }
        } else {
            ctx.fillStyle = '#888888';
            ctx.fillRect(screenX, this.y, this.width, this.height);
        }
    }
}
