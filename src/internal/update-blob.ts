import { Type } from "paratype";
import { BlobConditions, BlobReadResult, BlobStore } from "../BlobStore";
import { prefixLogger, ServerLogger } from "../ServerLogger";
import { getJsonBlob, getJsonData } from "./json-blob";
import { ABORT_SYMBOL, retry, RETRY_SYMBOL } from "./retry";

/** @internal */
export const updateBlob = <T>(
    logger: ServerLogger,
    store: BlobStore,
    key: string,
    dataType: Type<T>,
    initial: T,
    callback: (data: T, logger: ServerLogger) => Promise<T | typeof ABORT_SYMBOL>,
): Promise<T | typeof ABORT_SYMBOL> => {
    const prefixedLogger = prefixLogger(logger, `Update blob ${key}: `);
    return retry(
        prefixedLogger, 
        async () => attempt(store, key, dataType, initial, data => callback(data, prefixedLogger)),
    );
};

const attempt = async <T>(
    store: BlobStore,
    key: string,
    dataType: Type<T>,
    initial: T,
    callback: (data: T) => Promise<T | typeof ABORT_SYMBOL>,
): Promise<T | typeof RETRY_SYMBOL | typeof ABORT_SYMBOL> => {
    const readResult = await store.read(key);
    const dataBefore = readResult === null ? initial : await getJsonData(readResult, dataType);
    const dataAfter = await callback(dataBefore);

    if (dataAfter !== ABORT_SYMBOL && !dataType.equals(dataBefore, dataAfter)) {
        const blobAfter = getJsonBlob(dataAfter, dataType);
        const writeCondition = getWriteCondition(readResult);
        const writeResult = await store.write(key, blobAfter, writeCondition);
        if (writeResult === null) {
            return RETRY_SYMBOL;
        }
    }

    return dataAfter;
};

const getWriteCondition = (readResult: BlobReadResult | null): BlobConditions => {
    if (readResult === null) {
        return { ifNoneMatch: "*" };
    } else {
        return { ifMatch: readResult.etag };
    }
};
