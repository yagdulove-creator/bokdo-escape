class GameMatch {
    constructor() {
        this.blueRounds = 0;
        this.redRounds = 0;
        this.blueRoundKills = 0;
        this.redRoundKills = 0;

        this.playerDeaths = 0;
        this.totalDamage = 0;
        this.isRunning = false;
        this.botCount = 1;
        this.killsToWinRound = 5; // 라운드 승리 필요 킬수
    }

    startMatch(botCount, difficulty) {
        this.blueRounds = 0;
        this.redRounds = 0;
        this.blueRoundKills = 0;
        this.redRoundKills = 0;
        this.playerDeaths = 0;
        this.totalDamage = 0;
        this.isRunning = true;
        this.botCount = botCount;

        if (window.hud) {
            window.hud.updateScore(this.blueRounds, this.redRounds);
            window.hud.clearKillFeed();
        }

        const modeLabel = document.getElementById('match-mode-label');
        if (modeLabel) {
            modeLabel.innerText = `🔵 ROUND 1 🔴 (First to 5 Wins)`;
        }
    }

    onPlayerKillBot(bot, isHeadshot) {
        this.blueRoundKills++;
        if (window.hud) {
            window.hud.addKillMessage("🔵 BLUE TEAM", bot.name, "ASSAULT RIFLE", isHeadshot);
        }
        this._checkRoundWin();
    }

    onBotKillPlayer(bot) {
        this.playerDeaths++;
        this.redRoundKills++;
        if (window.hud) {
            window.hud.addKillMessage("🔴 RED TEAM", "🔵 YOU", "PLASMA PISTOL", false);
        }
        this._checkRoundWin();
    }
    
    onBotKillBot(killer, victim) {
        if(killer.team === 'red') this.redRoundKills++;
        else this.blueRoundKills++;

        if (window.hud) {
            const kName = killer.team === 'red' ? "🔴 RED" : "🔵 BLUE";
            const vName = victim.team === 'red' ? "🔴 RED" : "🔵 BLUE";
            window.hud.addKillMessage(kName, vName, "WEAPON", false);
        }
        this._checkRoundWin();
    }

    recordDamage(amount) {
        this.totalDamage += amount;
    }

    _checkRoundWin() {
        if (!this.isRunning) return;

        let roundOver = false;
        if (this.blueRoundKills >= this.killsToWinRound) {
            this.blueRounds++;
            roundOver = true;
        } else if (this.redRoundKills >= this.killsToWinRound) {
            this.redRounds++;
            roundOver = true;
        }

        if (roundOver) {
            this.blueRoundKills = 0;
            this.redRoundKills = 0;
            if (window.hud) window.hud.updateScore(this.blueRounds, this.redRounds);

            const totalRounds = this.blueRounds + this.redRounds + 1;
            const modeLabel = document.getElementById('match-mode-label');
            
            if (this.blueRounds >= 5 || this.redRounds >= 5) {
                if (modeLabel) modeLabel.innerText = `MATCH OVER`;
                this.endMatch();
            } else {
                if (modeLabel) modeLabel.innerText = `🔵 ROUND ${totalRounds} 🔴 (First to 5 Wins)`;
                
                // 모든 플레이어/봇 리스폰
                if(window.gameApp) {
                    window.gameApp.player.respawn();
                    window.gameApp.bots.forEach(b => b.respawn(b._getTeamSpawn()));
                }
            }
        }
    }

    update(dt) {
        if (!this.isRunning) return;
        // 타이머 대신 라운드 진행도 표시
        if (window.hud) {
            const el = document.getElementById('match-timer');
            if (el) el.innerText = `B: ${this.blueRoundKills} / R: ${this.redRoundKills}`;
        }
    }

    endMatch() {
        this.isRunning = false;
        const isWin = this.blueRounds >= this.redRounds;
        const kd = this.playerDeaths === 0 ? this.blueRounds.toFixed(2) : (this.blueRounds / this.playerDeaths).toFixed(2);
        if (window.hud) {
            window.hud.showGameOverModal({
                isWin,
                kills: this.blueRounds,
                deaths: this.playerDeaths,
                kd,
                damage: this.totalDamage
            });
        }
    }
}
