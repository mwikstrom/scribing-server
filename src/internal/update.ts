import { Type } from "paratype";
import { WriteConditions, JsonReadResult, JsonStore } from "../JsonStore";
import { prefixLogger, ServerLogger } from "../ServerLogger";
import { CONFLICT_SYMBOL } from "./merge";
import { ABORT_SYMBOL, retry, RETRY_SYMBOL } from "./retry";

/** @internal */
export const update = <T>(
    logger: ServerLogger,
    store: JsonStore,
    key: string,
    dataType: Type<T>,
    initial: () => Promise<T | typeof CONFLICT_SYMBOL>,
    callback: (data: T, logger: ServerLogger) => Promise<T | typeof ABORT_SYMBOL>,
): Promise<T | typeof ABORT_SYMBOL | typeof CONFLICT_SYMBOL> => {
    const prefixedLogger = prefixLogger(logger, `Update ${key}: `);
    return retry(
        prefixedLogger, 
        async () => attempt(store, key, dataType, initial, data => callback(data, prefixedLogger)),
    );
};

const attempt = async <T>(
    store: JsonStore,
    key: string,
    dataType: Type<T>,
    initial: () => Promise<T | typeof CONFLICT_SYMBOL>,
    callback: (data: T) => Promise<T | typeof ABORT_SYMBOL>,
): Promise<T | typeof RETRY_SYMBOL | typeof ABORT_SYMBOL | typeof CONFLICT_SYMBOL> => {
    const readResult = await store.read(key);
    const dataBefore = readResult === null ? await initial() : dataType.fromJsonValue(readResult.value);
    if (typeof dataBefore === "symbol") {
        return dataBefore;
    }

    const dataAfter = await callback(dataBefore);

    if (dataAfter !== ABORT_SYMBOL && !dataType.equals(dataBefore, dataAfter)) {
        const valueAfter = dataType.toJsonValue(dataAfter);
        const writeCondition = getWriteCondition(readResult);
        const writeResult = await store.write(key, valueAfter, writeCondition);
        if (writeResult === null) {
            return RETRY_SYMBOL;
        }
    }

    return dataAfter;
};

const getWriteCondition = (readResult: JsonReadResult | null): WriteConditions => {
    if (readResult === null) {
        return { ifNoneMatch: "*" };
    } else {
        return { ifMatch: readResult.etag };
    }
};
