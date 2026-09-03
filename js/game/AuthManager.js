class AuthManager {
    constructor() {
        this.currentUser = null;
        this.users = {
            "JOON": { password: "140627", isAdmin: true, name: "JOON [관리자]" }
        };

        this.loadUsers();
    }

    loadUsers() {
        try {
            const saved = localStorage.getItem('battlegun_users');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.users = { ...this.users, ...parsed };
            }
        } catch (e) {
            console.error("User storage load error:", e);
        }
    }

    saveUsers() {
        try {
            localStorage.setItem('battlegun_users', JSON.stringify(this.users));
        } catch (e) {
            console.error("User storage save error:", e);
        }
    }

    login(username, password) {
        if (!username || !password) {
            return { success: false, message: "아이디와 비밀번호를 모두 입력하세요." };
        }

        const uKey = username.trim();
        const user = this.users[uKey];

        if (user && user.password === password) {
            this.currentUser = { username: uKey, ...user };
            return { success: true, user: this.currentUser };
        } else {
            return { success: false, message: "아이디 또는 비밀번호가 일치하지 않습니다!" };
        }
    }

    register(username, password) {
        if (!username || !password) {
            return { success: false, message: "아이디와 비밀번호를 입력해주세요." };
        }

        const uKey = username.trim();
        if (this.users[uKey]) {
            return { success: false, message: "이미 존재하는 아이디입니다." };
        }

        this.users[uKey] = {
            password: password,
            isAdmin: false,
            name: uKey
        };
        this.saveUsers();
        this.currentUser = { username: uKey, ...this.users[uKey] };
        return { success: true, user: this.currentUser };
    }

    loginAsGuest() {
        const guestId = `GUEST_${Math.floor(1000 + Math.random() * 9000)}`;
        this.currentUser = { username: guestId, isAdmin: false, name: guestId };
        return { success: true, user: this.currentUser };
    }
}

window.authManager = new AuthManager();
