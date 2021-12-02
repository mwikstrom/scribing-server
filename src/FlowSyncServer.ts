import { JsonStore } from "./JsonStore";
import { FlowHeadData } from "./internal/FlowHeadData";
import { ServerLogger } from "./ServerLogger";
import { 
    FlowContent, 
    FlowOperation, 
    FlowSyncInput, 
    FlowSyncOutput, 
    FlowSyncProtocol, 
    FlowSyncSnapshot,
} from "scribing";
import { readHead, updateHead } from "./internal/head";
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
    logger?: ServerLogger;
    initialContent?: FlowContent;
}

/** @public */
export class FlowSyncServer implements FlowSyncProtocol {
    readonly #store: JsonStore;
    readonly #logger: ServerLogger;
    readonly #initialContent: FlowContent;
    #trimActive = false;
    #trimTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(options: FlowSyncServerOptions = {}) {
        const {
            store = new MemoryJsonStore(),
            logger = console,
            initialContent = FlowContent.empty,
        } = options;
        this.#store = store;
        this.#logger = logger;
        this.#initialContent = initialContent;
    }

    async read(): Promise<FlowSyncSnapshot> {   
        const data = await readHead(this.#store, this.#initialContent);
        const { version, content, theme, presence } = data;
        const digest = await content.digest();
        return { version, content, digest, theme, presence }; 
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

        const dataAfter = await updateHead(
            this.#logger,
            this.#store,
            this.#initialContent,
            attempt,
        );
        
        if (dataAfter === ABORT_SYMBOL) {
            return null;
        }

        const digest = await dataAfter.content.digest();
        const output: FlowSyncOutput = {
            version: dataAfter.version,
            digest,
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
            const dataAfter = await getTrimmedHead(this.#logger, this.#store, dataBefore);
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
            const result = await updateHead(
                this.#logger,
                this.#store,
                this.#initialContent,
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
