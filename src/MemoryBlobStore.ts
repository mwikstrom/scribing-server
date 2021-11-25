import { BlobConditions, BlobReadResult, BlobStore, BlobWriteResult } from ".";

/** @public */
export class MemoryBlobStore implements BlobStore {
    #blobs = new Map<string, BlobReadResult>();

    async read(key: string): Promise<BlobReadResult | null> {
        return this.#blobs.get(key) ?? null;
    }

    async write(key: string, blob: Blob, conditions: BlobConditions = {}): Promise<BlobWriteResult | null> {
        const { ifMatch, ifNoneMatch } = conditions;
        const before = this.#blobs.get(key);        
        if (
            (ifMatch !== void(0) && !isMatch(ifMatch, before?.etag)) ||
            (ifNoneMatch !== void(0) && isMatch(ifNoneMatch, before?.etag))
        ) {
            return null;
        }
        const etag = nextEtag();
        this.#blobs.set(key, Object.freeze({ blob, etag }));
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
