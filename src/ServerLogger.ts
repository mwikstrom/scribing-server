/** @public */
export interface ServerLogger {
    log(message: string): void;
    warn(message: string): void;
    error(message: string): void;
}

/** @public */
export function prefixLogger(logger: ServerLogger, prefix: string): ServerLogger {
    const log = prefixLogFunc(logger, "log", prefix);
    const warn = prefixLogFunc(logger, "warn", prefix);
    const error = prefixLogFunc(logger, "error", prefix);
    return { log, warn, error };
}

const prefixLogFunc = <K extends keyof ServerLogger>(
    logger: ServerLogger,
    func: K,
    prefix: string
) => (message: string) => logger[func](prefix + message);
