/** @public */
export interface BlobStore {
    read(key: string): Promise<BlobReadResult | null>;
    write(key: string, blob: Blob, conditions?: BlobConditions): Promise<BlobWriteResult | null>;
}

/** @public */
export interface BlobReadResult {
    blob: Blob;
    etag: string;
}

/** @public */
export interface BlobWriteResult {
    etag: string;
}

/** @public */
export interface BlobConditions {
    ifMatch?: string;
    ifNoneMatch?: string;
}