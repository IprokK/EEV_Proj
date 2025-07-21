declare const __dirname: string;
import fs from 'fs';
import path from 'path';

const logFile = path.join(__dirname, 'economy.log');
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

function logLine(line: string) {
  const message = `${new Date().toISOString()} ${line}\n`;
  console.log(message.trim());
  logStream.write(message);
}

export const ledgerService = {
  log: logLine,
  error(msg: string) {
    logLine(`ERROR: ${msg}`);
  },
};
