declare const __dirname: string;
import fs from 'fs';
import path from 'path';

interface Config {
  startBalance: number;
  batchIntervalMs: number;
  exchangeRates: Record<string, Record<string, number>>;
}

const configPath = path.join(__dirname, 'config.json');
const config: Config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const countryCurrencies: Record<string, string> = {
  US: 'USD',
  RU: 'RUB',
  DE: 'EUR',
};

export const currencyService = {
  config,

  /**
   * Get currency code for a given country.
   */
  getCurrencyForCountry(countryCode: string): string {
    return countryCurrencies[countryCode] || 'USD';
  },

  /**
   * Get exchange rate between two currencies.
   */
  getExchangeRate(from: string, to: string): number {
    return config.exchangeRates[from]?.[to] ?? 1;
  }
};
