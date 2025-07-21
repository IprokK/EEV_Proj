"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.currencyService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const configPath = path_1.default.join(__dirname, 'config.json');
const config = JSON.parse(fs_1.default.readFileSync(configPath, 'utf8'));
const countryCurrencies = {
    US: 'USD',
    RU: 'RUB',
    DE: 'EUR',
};
exports.currencyService = {
    config,
    /**
     * Get currency code for a given country.
     */
    getCurrencyForCountry(countryCode) {
        return countryCurrencies[countryCode] || 'USD';
    },
    /**
     * Get exchange rate between two currencies.
     */
    getExchangeRate(from, to) {
        var _a, _b;
        return (_b = (_a = config.exchangeRates[from]) === null || _a === void 0 ? void 0 : _a[to]) !== null && _b !== void 0 ? _b : 1;
    }
};
