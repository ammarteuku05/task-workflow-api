export enum LogLevel {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
}

export interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: string;
    context?: string;
    requestId?: string;
    data?: any;
}

class Logger {
    private formatLog(level: LogLevel, message: string, context?: string, requestId?: string, data?: any): LogEntry {
        return {
            level,
            message,
            timestamp: new Date().toISOString(),
            context,
            requestId,
            data,
        };
    }

    private print(entry: LogEntry) {
        const output = JSON.stringify(entry);
        if (entry.level === LogLevel.ERROR) {
            console.error(output);
        } else if (entry.level === LogLevel.WARN) {
            console.warn(output);
        } else {
            console.log(output);
        }
    }

    debug(message: string, context?: string, requestId?: string, data?: any) {
        if (process.env.NODE_ENV === 'test' && !process.env.DEBUG_TESTS) return;
        this.print(this.formatLog(LogLevel.DEBUG, message, context, requestId, data));
    }

    info(message: string, context?: string, requestId?: string, data?: any) {
        this.print(this.formatLog(LogLevel.INFO, message, context, requestId, data));
    }

    warn(message: string, context?: string, requestId?: string, data?: any) {
        this.print(this.formatLog(LogLevel.WARN, message, context, requestId, data));
    }

    error(message: string, error?: any, context?: string, requestId?: string, data?: any) {
        const errorData = error instanceof Error ? {
            message: error.message,
            stack: error.stack,
            ...data
        } : { ...data, error };

        this.print(this.formatLog(LogLevel.ERROR, message, context, requestId, errorData));
    }
}

export const logger = new Logger();
