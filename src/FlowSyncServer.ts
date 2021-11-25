import { BlobStore } from "./BlobStore";
import { FlowHeadData } from "./internal/FlowHeadData";
import { ServerLogger } from "./ServerLogger";
import { FlowOperation, FlowSyncInput, FlowSyncOutput, FlowSyncProtocol, FlowSyncSnapshot } from "scribing";
import { readHeadBlob, updateHeadBlob } from "./internal/head-blob";
import { CONFLICT_SYMBOL } from "./internal/merge";
import { ABORT_SYMBOL } from "./internal/retry";
import { getSyncedHead } from "./internal/sync-head";
import { ONE_SECOND } from "./internal/time";
import { shouldTrim, getTrimmedHead } from "./internal/trim";
import { MemoryBlobStore } from "./MemoryBlobStore";
import { excludeMyPresence } from "./internal/sync-presence";

/** @public */
export class FlowSyncServer implements FlowSyncProtocol {
    #blobStore: BlobStore;
    #logger: ServerLogger;
    #trimActive = false;
    #trimTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(blobStore: BlobStore = new MemoryBlobStore(), logger: ServerLogger = console) {
        this.#blobStore = blobStore;
        this.#logger = logger;
    }

    async read(): Promise<FlowSyncSnapshot> {   
        const data = await readHeadBlob(this.#blobStore);
        const { version, content, theme, presence } = data;
        return { version, content, theme, presence }; 
    }
    
    async sync(input: FlowSyncInput, user = ""): Promise<FlowSyncOutput | null> {
        let merge: FlowOperation | null = null;
        const attempt = async (dataBefore: FlowHeadData): Promise<FlowHeadData | typeof ABORT_SYMBOL> => {
            const result = getSyncedHead(input, user, dataBefore);
            if (result === CONFLICT_SYMBOL) {
                return ABORT_SYMBOL;
            }
            merge = result.merge;
            return result.dataAfter;
        };

        const dataAfter = await updateHeadBlob(
            this.#logger,
            this.#blobStore,
            attempt,
        );
        
        if (dataAfter === ABORT_SYMBOL) {
            return null;
        }

        const output: FlowSyncOutput = {
            version: dataAfter.version,
            merge,
            presence: excludeMyPresence(dataAfter.presence, input.client, user),
        };

        if (shouldTrim(dataAfter.recent) && this.#trimTimer === null && !this.#trimActive) {
            this.#trimTimer = setTimeout(() => this.#trimInBackground(), TRIM_INTERVAL);
        }

        return output;
    }

    async trim(): Promise<boolean> {
        const attempt = async (dataBefore: FlowHeadData) => {
            const dataAfter = await getTrimmedHead(this.#logger, this.#blobStore, dataBefore);
            if (dataAfter !== ABORT_SYMBOL) {
                success = dataAfter.recent.length !== dataBefore.recent.length;
            }
            return dataAfter;
        };

        if (this.#trimTimer !== null) {
            clearTimeout(this.#trimTimer);
            this.#trimTimer = null;
        }

        if (this.#trimActive) {
            return false;
        }

        let success = false;
        try {
            this.#trimActive = true;
            const result = await updateHeadBlob(
                this.#logger,
                this.#blobStore,
                attempt,
            );
            if (result !== ABORT_SYMBOL) {
                success = true;
            }
        } finally {
            this.#trimActive = false;
        }
        return success;
    }

    async #trimInBackground(): Promise<void> {
        try {
            await this.trim();
        } catch (error) {
            this.#logger.error(`Background trim failed: ${String(error)}`);
        }
    }
}

const TRIM_INTERVAL = 10 * ONE_SECOND;
