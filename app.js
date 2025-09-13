new Vue({
    el: '#app',
    data: {
        deck: [],
        playerCards: [],
        dealerCards: [],
        inGame: false,
        dealerTurn: false,
        message: 'Vsaď si...',
        balance: 500,
        bet: 0
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
            this.inGame = false;
        },
        removeBet() {
            console.log("egg")
            this.balance += this.bet;
            this.bet = 0;
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
                this.balance += this.bet * 2;
                this.playSound('sfx-win');
            } else if (this.playerTotal < this.dealerTotal) {
                this.message = 'Dealer Vyhrává!';
                this.playSound('sfx-lost');
            } else {
                this.message = 'Push!';
                this.balance += this.bet;
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
    }
});