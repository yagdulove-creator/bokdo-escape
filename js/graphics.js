/**
 * Procedural Pixel Art Sprite Generator for "복도탈출"
 * Renders high quality pixel art sprites onto offscreen canvases for fast rendering.
 */
class PixelGraphics {
    constructor() {
        this.cache = {};
        this.initSprites();
    }

    // Helper: Create offscreen canvas of given pixel width & height
    createCanvas(width, height) {
        const c = document.createElement('canvas');
        c.width = width;
        c.height = height;
        const ctx = c.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        return { canvas: c, ctx: ctx };
    }

    // Convert pixel matrix string array into canvas sprite
    // Palette is a map of char -> hex color
    drawPixelMatrix(ctx, matrix, palette, pixelSize = 2) {
        for (let y = 0; y < matrix.length; y++) {
            const row = matrix[y];
            for (let x = 0; x < row.length; x++) {
                const char = row[x];
                if (char !== '.' && palette[char]) {
                    ctx.fillStyle = palette[char];
                    ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
                }
            }
        }
    }

    initSprites() {
        // Pixel Palettes
        const playerPalette = {
            'S': '#fcd0a1', // Skin
            'H': '#2b1b17', // Hair
            'B': '#1e293b', // Uniform Blazer/Pants
            'W': '#f8fafc', // Shirt / Shoes white
            'E': '#0f172a', // Eyes
            'R': '#ff3366', // Tie/Accent red
            'G': '#475569'  // Shoe sole
        };

        const monsterPalette = {
            'M': '#0d0714', // Core dark shadow
            'D': '#1a0d28', // Outer shadow
            'R': '#ff0044', // Glowing eye red
            'Y': '#ffcc00', // Eye center
            'W': '#ffffff', // Fangs white
            'P': '#4a0e4e'  // Aura purple
        };

        const furniturePalette = {
            'T': '#b45309', // Wood top
            'D': '#78350f', // Dark wood
            'M': '#64748b', // Metal legs
            'K': '#334155', // Dark metal
            'P': '#cbd5e1'  // Plastic bucket
        };

        // --- 1. Player Run Frame 1 ---
        const playerRun1 = [
            "..HHHHH...",
            ".HHHHHHH..",
            ".HSSSSSH..",
            ".HSEESSH..",
            "..SRRSS...",
            ".BBWBBBB..",
            ".BBWBBBB..",
            "..BBBB....",
            "..B..BB...",
            "..W...WW.."
        ];
        const p1 = this.createCanvas(24, 24);
        this.drawPixelMatrix(p1.ctx, playerRun1, playerPalette, 2);
        this.cache['player_run1'] = p1.canvas;

        // --- Player Run Frame 2 ---
        const playerRun2 = [
            "..HHHHH...",
            ".HHHHHHH..",
            ".HSSSSSH..",
            ".HSEESSH..",
            "..SRRSS...",
            ".BBWBBBB..",
            ".BBWBBBB..",
            "..BBBB....",
            ".BB....B..",
            ".WW...WW.."
        ];
        const p2 = this.createCanvas(24, 24);
        this.drawPixelMatrix(p2.ctx, playerRun2, playerPalette, 2);
        this.cache['player_run2'] = p2.canvas;

        // --- Player Jump Frame ---
        const playerJump = [
            "..HHHHH...",
            ".HHHHHHH..",
            ".HSSSSSH..",
            ".HSEESSH..",
            "..SRRSS...",
            ".BBWBBBB..",
            ".BBWBBBB..",
            "..BBBB....",
            ".B....B...",
            ".W....W..."
        ];
        const pj = this.createCanvas(24, 24);
        this.drawPixelMatrix(pj.ctx, playerJump, playerPalette, 2);
        this.cache['player_jump'] = pj.canvas;

        // --- Player Slide Frame ---
        const playerSlide = [
            "..........",
            "..........",
            "..........",
            "..HHHHH...",
            ".HHHHHHH..",
            ".HSEESSRBB",
            ".BBWBBBBBB",
            "..WW...WW."
        ];
        const ps = this.createCanvas(24, 24);
        this.drawPixelMatrix(ps.ctx, playerSlide, playerPalette, 2);
        this.cache['player_slide'] = ps.canvas;

        // --- 2. Monster Shadow Frame ---
        const monsterMatrix = [
            "...PPPPMMM...",
            "..PPMMMMMMM..",
            ".PMMMMMMMMMM.",
            ".PMRRMMMRRMM.",
            ".PMRYMMMRYMM.",
            ".PMMMMMMMMMM.",
            ".PMMWWMWWMMM.",
            "..PMMMMMMMM..",
            "...PMMMMMMM..",
            "..PMM..MMMMM.",
            ".PMM....MMMM."
        ];
        const m1 = this.createCanvas(32, 32);
        this.drawPixelMatrix(m1.ctx, monsterMatrix, monsterPalette, 2.5);
        this.cache['monster'] = m1.canvas;

        // --- 3. Obstacle: Desk ---
        const deskMatrix = [
            "TTTTTTTTTTTTTT",
            "DDDDDDDDDDDDDD",
            "M............M",
            "M............M",
            "M............M",
            "K............K"
        ];
        const d1 = this.createCanvas(32, 24);
        this.drawPixelMatrix(d1.ctx, deskMatrix, furniturePalette, 2);
        this.cache['obstacle_desk'] = d1.canvas;

        // --- Obstacle: Chair ---
        const chairMatrix = [
            "...TTTT...",
            "...DDDD...",
            "...M..M...",
            "TTTTTTTTTT",
            "DDDDDDDDDD",
            "M........M",
            "K........K"
        ];
        const c1 = this.createCanvas(24, 24);
        this.drawPixelMatrix(c1.ctx, chairMatrix, furniturePalette, 2);
        this.cache['obstacle_chair'] = c1.canvas;

        // --- Obstacle: Stacked Desk & Chair ---
        const deskChairMatrix = [
            "....TTTT....",
            "....DDDD....",
            "TTTTTTTTTTTT",
            "DDDDDDDDDDDD",
            "M..........M",
            "M..........M",
            "K..........K"
        ];
        const dc = this.createCanvas(32, 32);
        this.drawPixelMatrix(dc.ctx, deskChairMatrix, furniturePalette, 2.5);
        this.cache['obstacle_stack'] = dc.canvas;

        // --- Obstacle: High Overhead Banner (Slide Only) ---
        this.createHighObstacleSprite();

        // --- Item: Soda Can / Milk Box ---
        const milkMatrix = [
            "..WW..",
            ".WWRW.",
            ".WWRW.",
            ".WWRW.",
            "..WW.."
        ];
        const milkPalette = { 'W': '#ffffff', 'R': '#3b82f6' };
        const itemMilk = this.createCanvas(16, 16);
        this.drawPixelMatrix(itemMilk.ctx, milkMatrix, milkPalette, 2.5);
        this.cache['item_milk'] = itemMilk.canvas;

        // --- Safe Zone Goal Door ---
        this.createSafeDoorSprite();
    }

    createSafeDoorSprite() {
        const { canvas, ctx } = this.createCanvas(140, 140);
        
        // 1. Blue & White Striped Marathon Tent Roof / Canopy
        const stripeWidth = 14;
        for (let i = 0; i < 140; i += stripeWidth) {
            ctx.fillStyle = (i / stripeWidth) % 2 === 0 ? '#0284c7' : '#ffffff';
            ctx.fillRect(i, 0, stripeWidth, 24);
        }

        // 2. Station Frame Pillars
        ctx.fillStyle = '#64748b';
        ctx.fillRect(4, 24, 8, 116);
        ctx.fillRect(128, 24, 8, 116);

        // 3. Overhead Marathon Banner Sign
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(16, 26, 108, 28);
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 9px DungGeunMo, monospace';
        ctx.fillText('🏁 마라톤 휴식구역 🏁', 20, 44);

        // 4. Refreshment Table (Water, Sports Drinks, Sponges)
        ctx.fillStyle = '#d97706'; // Wood table
        ctx.fillRect(20, 90, 100, 12);
        ctx.fillStyle = '#78350f'; // Table legs
        ctx.fillRect(24, 102, 6, 38);
        ctx.fillRect(110, 102, 6, 38);

        // Water Bottles & Sports Drinks on table
        const drinkColors = ['#38bdf8', '#ff3366', '#38bdf8', '#34d399', '#38bdf8'];
        drinkColors.forEach((col, idx) => {
            const bx = 28 + idx * 16;
            ctx.fillStyle = col;
            ctx.fillRect(bx, 74, 8, 16);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(bx + 2, 72, 4, 3); // Bottle cap
        });

        // Wet Sponges & Energy Bars
        ctx.fillStyle = '#fde047';
        ctx.fillRect(94, 82, 12, 8); // Sponge
        ctx.fillRect(108, 84, 8, 6); // Energy bar

        // 5. Checkered Flag & Medical Cross Icon
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(60, 58, 20, 20); // Medical box
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(68, 62, 4, 12); // Cross vertical
        ctx.fillRect(64, 66, 12, 4); // Cross horizontal

        this.cache['safe_door'] = canvas;
    }

    createHighObstacleSprite() {
        const { canvas, ctx } = this.createCanvas(56, 380);

        // Ceiling Mount Heavy Steel Beams & Metal Frame (Stretches all the way up to ceiling!)
        ctx.fillStyle = '#475569';
        ctx.fillRect(4, 0, 10, 340);
        ctx.fillRect(42, 0, 10, 340);

        // Cross Metal Braces
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 3;
        for (let y = 20; y < 340; y += 40) {
            ctx.beginPath();
            ctx.moveTo(4, y);
            ctx.lineTo(52, y + 30);
            ctx.stroke();
        }

        // Warning Hazard Wall Box at bottom
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 260, 56, 120);

        // Yellow and Black Stripes
        ctx.fillStyle = '#eab308';
        for (let i = 0; i < 56; i += 16) {
            ctx.beginPath();
            ctx.moveTo(i, 260);
            ctx.lineTo(i + 12, 260);
            ctx.lineTo(i - 4, 380);
            ctx.lineTo(i - 16, 380);
            ctx.fill();
        }

        // Border Steel Frame
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 3;
        ctx.strokeRect(2, 40, 52, 335);

        // Warning Icon & Text
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(8, 330, 40, 38);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px DungGeunMo, monospace';
        ctx.fillText('▼숙이기', 6, 354);

        this.cache['obstacle_high'] = canvas;
    }

    getSprite(name) {
        return this.cache[name] || null;
    }
}

// Global graphics instance
const pixelGraphics = new PixelGraphics();
