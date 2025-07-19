import winston from 'winston';
export declare const logger: winston.Logger;
export declare const log: {
    info: (message: string, meta?: any) => winston.Logger;
    warn: (message: string, meta?: any) => winston.Logger;
    error: (message: string, error?: Error | any) => void;
    debug: (message: string, meta?: any) => winston.Logger;
};
export default logger;
