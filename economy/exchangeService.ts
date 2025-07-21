import { currencyService } from './currencyService';
import { accountService } from './accountService';
import { ledgerService } from './ledgerService';

export const exchangeService = {
  /**
   * Convert amount using configured exchange rates.
   */
  convert(amount: number, fromCurrency: string, toCurrency: string): number {
    const rate = currencyService.getExchangeRate(fromCurrency, toCurrency);
    return amount * rate;
  },

  /**
   * Register socket.io handlers for exchange events.
   */
  registerSocket(socket: any) {
    socket.on('economy:exchangeRateRequested', ({ fromCurrency, toCurrency }) => {
      const rate = currencyService.getExchangeRate(fromCurrency, toCurrency);
      socket.emit('economy:exchangeRate', { fromCurrency, toCurrency, rate });
    });

    socket.on(
      'economy:exchangePerformed',
      async ({ fromCurrency, toCurrency, amount }) => {
        try {
          const converted = this.convert(amount, fromCurrency, toCurrency);
          await accountService.transfer(
            socket.userId,
            socket.userId,
            amount,
            fromCurrency,
            'exchange-out'
          );
          await accountService.transfer(
            socket.userId,
            socket.userId,
            converted,
            toCurrency,
            'exchange-in'
          );
          socket.emit('economy:exchangeComplete', {
            fromCurrency,
            toCurrency,
            amount,
            converted,
          });
        } catch (e) {
          ledgerService.error('Exchange failed ' + e);
          socket.emit('economy:error', { error: 'exchange failed' });
        }
      }
    );
  },
};
