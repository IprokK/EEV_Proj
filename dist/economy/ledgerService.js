"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ledgerService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logFile = path_1.default.join(__dirname, 'economy.log');
const logStream = fs_1.default.createWriteStream(logFile, { flags: 'a' });
function logLine(line) {
    const message = `${new Date().toISOString()} ${line}\n`;
    console.log(message.trim());
    logStream.write(message);
}
exports.ledgerService = {
    log: logLine,
    error(msg) {
        logLine(`ERROR: ${msg}`);
    },
};
