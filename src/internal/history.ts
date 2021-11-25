import { FlowBatch } from "scribing";
import { BlobStore } from "../BlobStore";
import { FlowChange } from "../FlowChange";
import { ServerLogger } from "../ServerLogger";
import { updateChunkBlob } from "./chunk-blob";
import { ABORT_SYMBOL } from "./retry";

/** @internal */
export const storeHistory = async (
    logger: ServerLogger,
    blobStore: BlobStore,
    headVersion: number,
    changes: readonly FlowChange[],
): Promise<boolean> => {
    let tailVersion = headVersion - changes.length;
    while (changes.length > 0) {
        const count = await storeChunk(logger, blobStore, tailVersion, changes);
        if (count > 0) {
            tailVersion += count;
            changes = changes.slice(count);
        } else {
            return false;
        }
    }
    return true;
};

const storeChunk = async (
    logger: ServerLogger,
    blobStore: BlobStore,
    tailVersion: number,
    changes: readonly FlowChange[],
): Promise<number> => {
    const chunkNumber = Math.floor(tailVersion / CHUNK_VERSION_COUNT);
    const chunkVersion = chunkNumber * CHUNK_VERSION_COUNT;
    const insertionIndex = tailVersion - chunkVersion;
    const insertionCount = Math.max(0, Math.min(CHUNK_VERSION_COUNT - insertionIndex, changes.length));
    
    if (insertionCount > 0) {
        const result = await updateChunkBlob(
            logger,
            blobStore,
            chunkNumber, 
            async (dataBefore, blobLogger) => getMergedChunk(
                dataBefore,
                blobLogger,
                insertionIndex,
                insertionCount,
                changes
            ),
        );

        if (result === ABORT_SYMBOL) {
            return 0;
        }
    }

    return insertionCount;
};

const getMergedChunk = (
    dataBefore: readonly FlowChange[],
    logger: ServerLogger,
    insertionIndex: number,
    insertionCount: number,
    changes: readonly FlowChange[],
): FlowChange[] => {
    const keepBefore = dataBefore.slice(0, insertionIndex);
    const keepAfter = dataBefore.slice(insertionIndex + insertionCount);
    const missing = insertionIndex - keepBefore.length;

    if (missing > 0) {
        const missingEntry: FlowChange = {
            at: new Date(),
            op: new FlowBatch(),
            by: { key: "", uid: "", name: "" }
        };
        logger.error(`Inserting ${missing} missing change(s) at index ${insertionIndex}`);
        keepBefore.push(...new Array(missing).fill(missingEntry));
    }

    return [...keepBefore, ...changes.slice(0, insertionCount), ...keepAfter];
};

const CHUNK_VERSION_COUNT = 1000;
