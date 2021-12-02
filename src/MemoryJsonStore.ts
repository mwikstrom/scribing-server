import { JsonValue } from "paratype";
import { JsonReadResult, JsonStore, JsonWriteResult, WriteConditions } from "./JsonStore";

/** @public */
export class MemoryJsonStore implements JsonStore {
    #map = new Map<string, StoredValue>();

    async read(key: string): Promise<JsonReadResult | null> {
        const stored = this.#map.get(key);
        if (stored) {
            const { etag, data } = stored;
            const value = JSON.parse(data);
            return { etag, value };
        } else {
            return null;
        }
    }

    async write(key: string, value: JsonValue, conditions: WriteConditions = {}): Promise<JsonWriteResult | null> {
        const { ifMatch, ifNoneMatch } = conditions;
        const before = this.#map.get(key);        
        if (
            (ifMatch !== void(0) && !isMatch(ifMatch, before?.etag)) ||
            (ifNoneMatch !== void(0) && isMatch(ifNoneMatch, before?.etag))
        ) {
            return null;
        }
        const etag = nextEtag();
        const data = JSON.stringify(value);
        this.#map.set(key, Object.freeze({ etag, data }));
        return { etag };
    }
}

const isMatch = (test: string, current: string | undefined): boolean => {
    if (test === "*") {
        return current !== void(0);
    } else {
        return test === current;
    }
};

let ETAG_COUNTER = 0;
const nextEtag = (): string => String(++ETAG_COUNTER);

interface StoredValue {
    etag: string;
    data: string;
}
