import { ServerLogger } from "../ServerLogger";

/** @internal */
export const retry = async <T>(
    logger: ServerLogger,
    callback: () => Promise<T | typeof RETRY_SYMBOL | typeof ABORT_SYMBOL>,
): Promise<T | typeof ABORT_SYMBOL> => {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; ++attempt) {
        if (attempt > 1) {
            const delay = Math.ceil(Math.random() * MAX_RETRY_DELAY);
            const message = `Waiting ${delay} ms before retrying, attempt ${attempt} of ${MAX_ATTEMPTS}`;
            if (attempt >= MAX_ATTEMPTS / 2) {
                logger.warn(message);
            } else {
                logger.log(message);
            }
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        const result = await callback();

        if (result === RETRY_SYMBOL) {
            continue;
        }

        return result;
    }
    
    logger.error(`Aborted after retrying ${MAX_ATTEMPTS} attempts`);
    return ABORT_SYMBOL;
};

/** @internal */
export const RETRY_SYMBOL: unique symbol = Symbol("RETRY");

/** @internal */
export const ABORT_SYMBOL: unique symbol = Symbol("ABORT");

const MAX_ATTEMPTS = 10;
const MAX_RETRY_DELAY = 1000;