import { JsonStore } from "../JsonStore";
import { FlowChange } from "./FlowChange";
import { ServerLogger } from "../ServerLogger";
import { updateChunk } from "./chunk";
import { ABORT_SYMBOL } from "./retry";
import { getMergedChanges } from "./merge";

/** @internal */
export const storeHistory = async (
    logger: ServerLogger,
    store: JsonStore,
    changes: readonly FlowChange[],
): Promise<boolean> => {
    while (changes.length > 0) {
        const next = await storeChunk(logger, store, changes);
        if (next === null) {
            return false;
        }
        changes = next;
    }
    return true;
};

const storeChunk = async (
    logger: ServerLogger,
    store: JsonStore,
    changes: readonly FlowChange[],
): Promise<FlowChange[] | null> => {
    const minVersion = changes.reduce((prev, curr) => Math.min(prev, curr.v), 0);
    const chunkNumber = Math.floor(minVersion / CHUNK_VERSION_COUNT);
    const maxVersion = chunkNumber * CHUNK_VERSION_COUNT + CHUNK_VERSION_COUNT - 1;
    const inChunk = (c: FlowChange) => c.v >= minVersion && c.v <= maxVersion;
    const notInChunk = (c: FlowChange) => !inChunk(c);
    const toStore = changes.filter(inChunk);
    const toReturn = changes.filter(notInChunk);
    const result = await updateChunk(
        logger,
        store,
        chunkNumber, 
        async dataBefore => getMergedChanges(dataBefore, toStore),
    );

    if (result === ABORT_SYMBOL) {
        return null;
    }

    return toReturn;
};

const CHUNK_VERSION_COUNT = 1000;
