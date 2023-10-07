import * as winston from "winston";
import "winston-daily-rotate-file";
import moment from 'moment-timezone';

const timestampFormat = () => moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss.SSS');
const myFormat = winston.format.printf(
  ({ level, message, label, timestamp }) => {
    return `${timestamp} [${label}] ${level}: ${message}`;
  }
);

const customLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
};

const logger = winston.createLogger({
  levels: customLevels,
  format: winston.format.combine(
    winston.format.label({ label: "production" }),
    winston.format.timestamp({ format: timestampFormat }),
    myFormat
  ),
  transports: [
    // new winston.transports.Console(),
    new winston.transports.DailyRotateFile({
      level: "info",
      filename: "logs/info/%DATE%.log",
      datePattern: "YYYY-MM-DD-HH",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "30d",
    }),
    new winston.transports.DailyRotateFile({
      level: "error",
      filename: "logs/error/%DATE%.log",
      datePattern: "YYYY-MM-DD-HH",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "30d",
    }),
    new winston.transports.DailyRotateFile({
      level: "http",
      filename: "logs/http/%DATE%.log",
      datePattern: "YYYY-MM-DD-HH",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "30d",
    }),
    new winston.transports.DailyRotateFile({
      level: "warn",
      filename: "logs/warn/%DATE%.log",
      datePattern: "YYYY-MM-DD-HH",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "30d",
    }),
    new winston.transports.DailyRotateFile({
      level: "debug",
      filename: "logs/debug/%DATE%.log",
      datePattern: "YYYY-MM-DD-HH",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "30d",
    }),
  ],
});

export default logger;
