import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'info';
const nodeEnv = process.env.NODE_ENV || 'development';

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ level, message, timestamp, stack }) => {
        if (stack) {
            return `${timestamp} [${level.toUpperCase()}]: ${message}\n${stack}`;
        }
        return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
);

// Create logger instance
export const logger = winston.createLogger({
    level: logLevel,
    format: nodeEnv === 'production'
        ? winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json()
        )
        : logFormat,
    defaultMeta: { service: 'github-pr-summarizer' },
    transports: [
        // Console transport
        new winston.transports.Console({
            format: nodeEnv === 'production'
                ? winston.format.json()
                : winston.format.combine(
                    winston.format.colorize(),
                    logFormat
                )
        }),

        // File transports for production
        ...(nodeEnv === 'production' ? [
            new winston.transports.File({
                filename: 'logs/error.log',
                level: 'error',
                format: winston.format.combine(
                    winston.format.timestamp(),
                    winston.format.json()
                )
            }),
            new winston.transports.File({
                filename: 'logs/combined.log',
                format: winston.format.combine(
                    winston.format.timestamp(),
                    winston.format.json()
                )
            })
        ] : [])
    ]
});

// Add development-friendly log methods
export const log = {
    info: (message: string, meta?: any) => logger.info(message, meta),
    warn: (message: string, meta?: any) => logger.warn(message, meta),
    error: (message: string, error?: Error | any) => {
        if (error instanceof Error) {
            logger.error(message, { error: error.message, stack: error.stack });
        } else {
            logger.error(message, error);
        }
    },
    debug: (message: string, meta?: any) => logger.debug(message, meta)
};

export default logger; 