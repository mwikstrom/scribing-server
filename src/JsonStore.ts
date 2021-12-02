import { JsonValue } from "paratype";

/** @public */
export interface JsonStore {
    read(key: string): Promise<JsonReadResult | null>;
    write(key: string, value: JsonValue, conditions?: WriteConditions): Promise<JsonWriteResult | null>;
}

/** @public */
export interface JsonReadResult {
    value: JsonValue;
    etag: string;
}

/** @public */
export interface JsonWriteResult {
    etag: string;
}

/** @public */
export interface WriteConditions {
    ifMatch?: string;
    ifNoneMatch?: string;
}