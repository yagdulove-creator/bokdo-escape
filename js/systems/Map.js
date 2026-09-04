/**
 * School Hallway Map & Parallax Background System for "복도탈출"
 */
class Map {
    constructor() {
        this.stageNumber = 1;
        this.stageDistance = 800; // Target distance in meters to safe zone
        this.obstacles = [];
        this.decorations = [];
        this.groundY = 410; // Floor surface Y coordinate
        this.stageLength = 0; // Calculated length in pixels
    }

    generateStage(stageNum) {
        this.stageNumber = stageNum;
        this.stageDistance = 600 + stageNum * 250;
        this.stageLength = this.stageDistance * 8; // Convert meters to pixels
        this.obstacles = [];
        this.decorations = [];

        // Generate Parallax Wall Decor (Classroom Doors, Lockers, Posters, Windows)
        let currentX = 200;
        while (currentX < this.stageLength - 300) {
            const r = Math.random();
            if (r < 0.35) {
                // Classroom Door
                this.decorations.push({
                    type: 'door',
                    x: currentX,
                    label: `교실 ${stageNum}-${Math.floor(Math.random() * 5 + 1)}`
                });
                currentX += 180;
            } else if (r < 0.7) {
                // Lockers Row
                this.decorations.push({
                    type: 'lockers',
                    x: currentX,
                    width: 140
                });
                currentX += 200;
            } else {
                // Hallway Window with Night View
                this.decorations.push({
                    type: 'window',
                    x: currentX,
                    width: 120
                });
                currentX += 240;
            }
        }

        // Generate Obstacles (Desks, Chairs, Stacks, Items)
        let obsX = 500;
        const minGap = Math.max(160, 280 - stageNum * 20);
        const maxGap = Math.max(260, 420 - stageNum * 25);

        while (obsX < this.stageLength - 400) {
            const typeRoll = Math.random();
            let obsType = 'desk';

            if (typeRoll < 0.3) {
                obsType = 'desk';
            } else if (typeRoll < 0.55) {
                obsType = 'chair';
            } else if (typeRoll < 0.75) {
                obsType = 'high'; // Overhead obstacle requiring sliding
            } else if (typeRoll < 0.9 && stageNum >= 2) {
                obsType = 'stack'; // Higher stack appears from stage 2
            } else {
                obsType = 'desk';
            }

            // Spawn obstacle Y position so feet rest on ground or hangs overhead
            let spawnY = this.groundY - 36;
            if (obsType === 'chair') spawnY = this.groundY - 34;
            if (obsType === 'stack') spawnY = this.groundY - 56;
            if (obsType === 'high') spawnY = 0; // Starts from ceiling Y=0 down to Y=380 (blocks double jump!)

            const obstacle = new Obstacle(obsType, obsX, spawnY);
            this.obstacles.push(obstacle);

            // Chance to spawn Milk item after obstacle
            if (Math.random() < 0.35) {
                const milkItem = new Obstacle('milk', obsX + 120, this.groundY - 60);
                this.obstacles.push(milkItem);
            }

            obsX += minGap + Math.random() * (maxGap - minGap);
        }

        // Spawn Final Safe Zone Goal Door at stage end
        const safeZoneY = this.groundY - 54;
        const safeDoor = new Obstacle('safe_door', this.stageLength, safeZoneY);
        this.obstacles.push(safeDoor);
    }

    drawBackground(ctx, scrollX) {
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;

        // 1. Base Wall Background Color (Bright Morning Sunny Beige/Cream)
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, width, height);

        // Upper Wall Accent Stripe (Warm Yellow School Trim)
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(0, 0, width, 45);

        // Wall Panel Trim Line
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(0, 180, width, 10);

        // 2. Render Continuous Straight Row of Hallway Windows (Evenly spaced)
        const windowWidth = 110;
        const windowGap = 45;
        const windowCycle = windowWidth + windowGap;
        const startWin = Math.floor(scrollX / windowCycle) * windowCycle - windowCycle;

        for (let wx = startWin; wx < scrollX + width + windowCycle; wx += windowCycle) {
            const screenWx = wx - scrollX;

            // Blue morning sky inside window
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(screenWx, 105, windowWidth, 125);

            // Bright Sun
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(screenWx + 30, 130, 16, 0, Math.PI * 2);
            ctx.fill();

            // Fluffy White Clouds
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(screenWx + 70, 135, 10, 0, Math.PI * 2);
            ctx.arc(screenWx + 82, 138, 8, 0, Math.PI * 2);
            ctx.fill();

            // Window Frame & Center Glass Divider
            ctx.fillStyle = '#94a3b8';
            ctx.fillRect(screenWx - 3, 101, windowWidth + 6, 6); // Top sill
            ctx.fillRect(screenWx - 3, 230, windowWidth + 6, 6); // Bottom sill
            ctx.fillRect(screenWx - 3, 101, 6, 135); // Left border
            ctx.fillRect(screenWx + windowWidth - 3, 101, 6, 135); // Right border
            ctx.fillRect(screenWx + windowWidth / 2 - 2, 105, 4, 125); // Center pane divider
        }

        // 3. Render Classroom Doors & Lockers along wall floor line
        this.decorations.forEach(dec => {
            const screenX = dec.x - scrollX;
            if (screenX < -150 || screenX > width + 150) return;

            if (dec.type === 'door') {
                // Classroom Wooden Door Frame
                ctx.fillStyle = '#d97706';
                ctx.fillRect(screenX, 190, 66, 180);
                ctx.fillStyle = '#f59e0b';
                ctx.fillRect(screenX + 5, 195, 56, 170);
                // Glass window panel in door
                ctx.fillStyle = '#bae6fd';
                ctx.fillRect(screenX + 14, 205, 38, 36);
                // Room Name Tag
                ctx.fillStyle = '#0284c7';
                ctx.fillRect(screenX + 12, 196, 42, 10);
            } else if (dec.type === 'lockers') {
                // Bright Pastel Lockers
                ctx.fillStyle = '#38bdf8';
                ctx.fillRect(screenX, 230, dec.width, 140);
                // Locker door slits
                ctx.fillStyle = '#0284c7';
                for (let i = 0; i < dec.width; i += 24) {
                    ctx.fillRect(screenX + i + 2, 230, 20, 140);
                    ctx.fillRect(screenX + i + 6, 240, 12, 16);
                }
            }
        });

        // 3. Hallway Ceiling Fluorescent Lights
        const lightSpacing = 240;
        const startLight = Math.floor(scrollX / lightSpacing) * lightSpacing;
        for (let lx = startLight; lx < scrollX + width + lightSpacing; lx += lightSpacing) {
            const screenLx = lx - scrollX;
            ctx.fillStyle = '#94a3b8';
            ctx.fillRect(screenLx, 10, 80, 12);
            // Light Glow
            ctx.fillStyle = '#fffbebe6';
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 8;
            ctx.fillRect(screenLx + 4, 14, 72, 6);
            ctx.shadowBlur = 0;
        }

        // 4. Hallway Floor (Warm Bright Wood Flooring)
        ctx.fillStyle = '#d97706';
        ctx.fillRect(0, this.groundY, width, height - this.groundY);

        // Floor Top Border Line
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(0, this.groundY, width, 5);

        // Floor Perspective Plank Lines
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 2;
        const tileWidth = 60;
        const tileOffset = (scrollX % tileWidth);
        for (let tx = -tileOffset; tx < width; tx += tileWidth) {
            ctx.beginPath();
            ctx.moveTo(tx, this.groundY + 5);
            ctx.lineTo(tx - 40, height);
            ctx.stroke();
        }
    }
}
