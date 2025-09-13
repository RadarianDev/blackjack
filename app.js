new Vue({
    el: '#app',
    data: {
        supabase: null,
        leaderboard: [],

        deck: [],
        playerCards: [],
        dealerCards: [],
        inGame: false,
        dealerTurn: false,
        message: 'Vsaď si...',
        balance: 200,
        bet: 0,
        playerName: "Ty",
        lastTimePlayed: 0,
    },
    computed: {
        playerTotal() {
            return this.calculateTotal(this.playerCards);
        },
        dealerTotal() {
            return this.calculateTotal(this.dealerCards);
        }
    },
    methods: {
        createDeck() {
            const suits = ['♠', '♥', '♦', '♣'];
            const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
            let deck = [];
            for (let suit of suits) {
                for (let rank of ranks) {
                    deck.push({ suit, rank });
                }
            }
            return deck.sort(() => Math.random() - 0.5);
        },
        cardValue(card) {
            if (['J', 'Q', 'K'].includes(card.rank)) return 10;
            if (card.rank === 'A') return 11;
            return parseInt(card.rank);
        },
        calculateTotal(cards) {
            let total = 0;
            let aces = 0;
            for (let card of cards) {
                total += this.cardValue(card);
                if (card.rank === 'A') aces++;
            }
            while (total > 21 && aces > 0) {
                total -= 10;
                aces--;
            }
            return total;
        },
        dealerCardClass(card, index) {
            if (!this.dealerTurn && index === 0) {
                return { 'text-primary': true, 'border-primary': true };
            }
            if (['♥', '♦'].includes(card.suit)) {
                return { 'text-danger': true, 'border-danger': true };
            }
            return { 'text-dark': true };
        },
        placeBet(amount) {
            if (this.balance >= amount && !this.inGame) {
                this.bet += amount;
                this.balance -= amount;
                this.playSound('sfx-chip');
            }
        },
        deal() {
            if (this.bet === 0) return;
            this.deck = this.createDeck();
            this.playerCards = [this.deck.pop(), this.deck.pop()];
            this.dealerCards = [this.deck.pop(), this.deck.pop()];
            this.inGame = true;
            this.dealerTurn = false;
            this.message = '';
            this.playSound('sfx-deal');
        },
        hit() {
            this.playerCards.push(this.deck.pop());
            if (this.playerTotal > 21) {
                this.message = 'Bust! Dealer Vyhrává!';
                this.inGame = false;
                this.dealerTurn = true;
                this.bet = 0;
                this.playSound('sfx-lost');
            }
            else {
                this.playSound('sfx-hit');
            }
        },
        stand() {
            this.dealerTurn = true;
            while (this.dealerTotal < 21 && this.dealerTotal < this.playerTotal && this.dealerTotal !== 17) {
                this.dealerCards.push(this.deck.pop());
            }
            this.checkWinner();
            this.updateLeaderboard();
            this.inGame = false;
        },
        removeBet() {
            console.log("egg")
            this.balance += this.bet;
            this.bet = 0;
        },
        changeName() {
            var pname = window.prompt("Ach, to předchozí se nehodilo? Nuže dobrá... jakpak ti mám tedy říkat?");
            localStorage.setItem("blackjackPlayerName", pname);
            this.playerName = pname;
        },
        checkWinner() {
            if (this.playerTotal > 21) {
                this.message = 'Bust! Dealer Vyhrává!';
                this.bet = 0;
                this.playSound('sfx-lost');
                return;
            }
            if (this.dealerTotal > 21 || this.playerTotal > this.dealerTotal) {
                this.message = 'Vyhráváš!';
                this.setBalance(this.balance + this.bet * 2);
                this.playSound('sfx-win');
            } else if (this.playerTotal < this.dealerTotal) {
                this.message = 'Dealer Vyhrává!';
                this.setBalance(this.balance);
                this.playSound('sfx-lost');
            } else {
                this.message = 'Push!';
                this.setBalance(this.balance + this.bet);
                this.playSound('sfx-push');
            }
            this.bet = 0;
        },
        chipClass(value) {
            switch (value) {
                case 10: return 'btn-success';
                case 20: return 'btn-primary';
                case 50: return 'btn-warning';
                case 100: return 'btn-danger';
                case 200: return 'btn-light';
                default: return 'btn-secondary';
            }
        },
        playerCardClass(card) {
            if (['♥', '♦'].includes(card.suit)) {
                return 'bg-white text-danger border-danger';
            }
            return 'bg-white text-dark border-dark';
        },
        dealerCardClass(card, index) {
            if (!this.dealerTurn && index === 0) {
                return 'bg-primary text-white border-white'
            }
            if (['♥', '♦'].includes(card.suit)) {
                return 'bg-white text-danger border-danger';
            }
            return 'bg-white text-dark border-dark';
        },
        playSound(id) {
            const el = document.getElementById(id);
            if (el) {
                el.currentTime = 0;
                el.play();
            }
        },
        leaderboardColors(id) {
            if (id === 0) {
                return "table-warning";
            }
            if (id === 1) {
                return "table-secondary";
            }
            if (id === 2) {
                return "table-danger";
            }
            return "table-dark";
        },
        setBalance(num) {
            this.balance = num;
            localStorage.setItem("blackjackBalance", num);
            localStorage.setItem("blackjackLastTimePlayed", Date.now());
        },
        async fetchLeaderboard() {
            let { data, error } = await this.supabase
                .from('leaderboard')
                .select('*')
                .order('balance', { ascending: false })
                .limit(10);
            if (!error) {
                this.leaderboard = data;
            }
        },
        async updateLeaderboard() {
            const playerName = this.playerName;

            let { data: existing, error: fetchError } = await this.supabase
                .from('leaderboard')
                .select('balance')
                .eq('name', playerName)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') {
                // PGRST116 = no rows found
                console.error('Supabase fetch error:', fetchError.message);
                return;
            }

            // If entry exists and our balance is less or equal, skip update
            if (existing && this.balance <= existing.balance) {
                console.log(`Not updating leaderboard — current balance (${this.balance}) is not greater than stored (${existing.balance})`);
                return;
            }

            // Insert or update entry (only if balance is higher OR new player)
            let { error } = await this.supabase
                .from('leaderboard')
                .upsert(
                    { name: playerName, balance: this.balance },
                    { onConflict: 'name' }
                );

            if (error) {
                console.error('Supabase error:', error.message);
            } else {
                this.fetchLeaderboard();
            }
        },
        applyIdleIncome() {
            const now = Date.now();
            const elapsedSeconds = (now - this.lastTimePlayed) / 1000;
            const baseRate = 1.5;
            const bonus = Math.floor((baseRate * Math.sqrt(elapsedSeconds)) / 10) * 10;
            if (bonus > 0)
                window.alert("To byla doba, co jsme se neviděli. Mezitím ti přistálo do peněženky $" + bonus);
            this.setBalance(this.balance + bonus);
        }

    },
    mounted() {
        var pname = localStorage.getItem("blackjackPlayerName");
        if (pname === null) {
            pname = window.prompt("No počkej, tebe neznám. Jak se jmenuješ?");
            localStorage.setItem("blackjackPlayerName", pname);
        }
        this.playerName = pname;

        const bal = localStorage.getItem("blackjackBalance");
        if (bal === null || bal === NaN) {
            this.setBalance(200);
        } else {
            this.setBalance(bal);
        }

        const ltp = localStorage.getItem("blackjackLastTimePlayed") || Date.now();
        this.lastTimePlayed = ltp;

        console.warn({pname, bal, ltp});
        this.applyIdleIncome();

        this.supabase = supabase.createClient(
            'https://diivcdhwzwhwzjauhyyz.supabase.co',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpaXZjZGh3endod3pqYXVoeXl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NjYzOTcsImV4cCI6MjA3MzM0MjM5N30.IU734vihizNepKR_-x2L4pG3Yv-gdweyazoOUH3fCn0'
        );
        this.fetchLeaderboard();
    }
});