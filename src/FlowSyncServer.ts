import { JsonStore } from "./JsonStore";
import { FlowHeadData } from "./internal/FlowHeadData";
import { ServerLogger } from "./ServerLogger";
import { 
    FlowContent, 
    FlowContentHashFunc, 
    FlowOperation, 
    FlowSyncInput, 
    FlowSyncOutput, 
    FlowSyncProtocol, 
    FlowSyncSnapshot,
} from "scribing";
import { getSnapshot, initHead, readHead, updateHead } from "./internal/head";
import { CONFLICT_SYMBOL } from "./internal/merge";
import { ABORT_SYMBOL } from "./internal/retry";
import { getSyncedHead } from "./internal/sync-head";
import { ONE_SECOND } from "./internal/time";
import { shouldTrim, getTrimmedHead } from "./internal/trim";
import { MemoryJsonStore } from "./MemoryJsonStore";
import { excludeMyPresence } from "./internal/sync-presence";

/** @public */
export interface FlowSyncServerOptions {
    store?: JsonStore;
    hashFunc?: FlowContentHashFunc;
}

/** @public */
export class FlowSyncServer implements FlowSyncProtocol {
    readonly #store: JsonStore;
    readonly #hashFunc?: FlowContentHashFunc;
    #trimActive = false;
    #trimTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(options: FlowSyncServerOptions = {}) {
        const {
            store = new MemoryJsonStore(),
            hashFunc,
        } = options;
        this.#store = store;
        this.#hashFunc = hashFunc;
    }

    async init(
        content = FlowContent.emptyParagraph,
        user = "",
    ): Promise<FlowSyncSnapshot | null> {
        const data = await initHead(this.#store, content, user);
        if (data === null) {
            return null;
        } else {
            return await getSnapshot(data, this.#hashFunc);
        }
    }

    async read(): Promise<FlowSyncSnapshot | null> {   
        const data = await readHead(this.#store);
        if (data === null) {
            return null;
        } else {
            return await getSnapshot(data, this.#hashFunc);
        }
    }
    
    async sync(
        input: FlowSyncInput,
        user = "",
        logger: ServerLogger = console,
    ): Promise<FlowSyncOutput | null> {
        let merge: FlowOperation | null = null;
        const attempt = async (dataBefore: FlowHeadData): Promise<FlowHeadData | typeof ABORT_SYMBOL> => {
            const result = getSyncedHead(input, user, dataBefore);
            if (result === CONFLICT_SYMBOL) {
                return ABORT_SYMBOL;
            }
            merge = result.merge;
            return result.dataAfter;
        };

        const dataAfter = await updateHead(logger, this.#store, attempt);
        if (typeof dataAfter === "symbol") {
            return null;
        }

        const digest = await dataAfter.content.digest(this.#hashFunc);
        const output: FlowSyncOutput = {
            version: dataAfter.version,
            digest,
            merge,
            presence: excludeMyPresence(dataAfter.presence, input.client, user),
        };

        if (shouldTrim(dataAfter.recent) && this.#trimTimer === null && !this.#trimActive) {
            this.#trimTimer = setTimeout(() => this.#trimInBackground(logger), TRIM_INTERVAL);
        }

        return output;
    }

    async trim(logger: ServerLogger = console): Promise<boolean> {
        const attempt = async (dataBefore: FlowHeadData) => {
            const dataAfter = await getTrimmedHead(logger, this.#store, dataBefore);
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
            const result = await updateHead(logger, this.#store, attempt);
            if (typeof result !== "symbol") {
                success = true;
            }
        } finally {
            this.#trimActive = false;
        }
        return success;
    }

    async #trimInBackground(logger: ServerLogger): Promise<void> {
        try {
            await this.trim(logger);
        } catch (error) {
            logger.error(`Background trim failed: ${String(error)}`);
        }
    }
}

const TRIM_INTERVAL = 10 * ONE_SECOND;
