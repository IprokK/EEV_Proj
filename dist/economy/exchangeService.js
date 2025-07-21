"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exchangeService = void 0;
const currencyService_1 = require("./currencyService");
const accountService_1 = require("./accountService");
const ledgerService_1 = require("./ledgerService");
exports.exchangeService = {
    /**
     * Convert amount using configured exchange rates.
     */
    convert(amount, fromCurrency, toCurrency) {
        const rate = currencyService_1.currencyService.getExchangeRate(fromCurrency, toCurrency);
        return amount * rate;
    },
    /**
     * Register socket.io handlers for exchange events.
     */
    registerSocket(socket) {
        socket.on('economy:exchangeRateRequested', ({ fromCurrency, toCurrency }) => {
            const rate = currencyService_1.currencyService.getExchangeRate(fromCurrency, toCurrency);
            socket.emit('economy:exchangeRate', { fromCurrency, toCurrency, rate });
        });
        socket.on('economy:exchangePerformed', async ({ fromCurrency, toCurrency, amount }) => {
            try {
                const converted = this.convert(amount, fromCurrency, toCurrency);
                await accountService_1.accountService.transfer(socket.userId, socket.userId, amount, fromCurrency, 'exchange-out');
                await accountService_1.accountService.transfer(socket.userId, socket.userId, converted, toCurrency, 'exchange-in');
                socket.emit('economy:exchangeComplete', {
                    fromCurrency,
                    toCurrency,
                    amount,
                    converted,
                });
            }
            catch (e) {
                ledgerService_1.ledgerService.error('Exchange failed ' + e);
                socket.emit('economy:error', { error: 'exchange failed' });
            }
        });
    },
};
