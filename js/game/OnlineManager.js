class OnlineManager {
    constructor() {
        this.rooms = [
            { id: "101", name: "🔥 RIVALS PRO 1v1", mode: "1v1", players: 1, maxPlayers: 2, ping: 12, host: "Viper_KR" },
            { id: "102", name: "⚡ NEON FFA CARNAGE", mode: "FFA", players: 3, maxPlayers: 4, ping: 18, host: "CyberNinja" },
            { id: "103", name: "🎯 SNIPER ONLY ARENA", mode: "1v1", players: 1, maxPlayers: 2, ping: 15, host: "OneShot" },
            { id: "104", name: "⚔️ SCYTHE MELEE BRAWL", mode: "FFA", players: 2, maxPlayers: 4, ping: 22, host: "ShadowBlade" }
        ];

        this.currentRoom = null;
        this.chatMessages = [
            { sender: "System", text: "온라인 라이벌스 네트워크에 연결되었습니다." },
            { sender: "Viper_KR", text: "1v1 프로 대전 하실 분?" },
            { sender: "CyberNinja", text: "FFA 방 1명 더 오세요!" }
        ];
    }

    getRooms() {
        return this.rooms;
    }

    createRoom(name, mode, maxPlayers) {
        const id = Math.floor(100 + Math.random() * 900).toString();
        const newRoom = {
            id: id,
            name: name || `ROOM #${id}`,
            mode: mode,
            players: 1,
            maxPlayers: parseInt(maxPlayers),
            ping: Math.floor(10 + Math.random() * 15),
            host: "YOU"
        };
        this.rooms.unshift(newRoom);
        this.currentRoom = newRoom;
        return newRoom;
    }

    joinRoom(roomId) {
        const room = this.rooms.find(r => r.id === roomId);
        if (room) {
            if (room.players < room.maxPlayers) {
                room.players++;
                this.currentRoom = room;
                return { success: true, room: room };
            } else {
                return { success: false, message: "방이 가득 찼습니다!" };
            }
        }
        return { success: false, message: "존재하지 않는 방입니다." };
    }

    sendChatMessage(text) {
        if (!text || text.trim() === '') return;
        const msg = { sender: "YOU", text: text.trim() };
        this.chatMessages.push(msg);
        return msg;
    }
}

window.onlineManager = new OnlineManager();
