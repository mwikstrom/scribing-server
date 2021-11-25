import { BlobStore } from "../BlobStore";
import { FlowChange, FlowChangeArrayType } from "../FlowChange";
import { ServerLogger } from "../ServerLogger";
import { ABORT_SYMBOL } from "./retry";
import { updateBlob } from "./update-blob";

/** @internal */
export const updateChunkBlob = async (
    logger: ServerLogger,
    blobStore: BlobStore,
    chunkNumber: number,
    callback: (dataBefore: FlowChange[], logger: ServerLogger) => Promise<FlowChange[] | typeof ABORT_SYMBOL>,
): Promise<readonly FlowChange[] | typeof ABORT_SYMBOL> => updateBlob(
    logger,
    blobStore,
    getChunkBlobKey(chunkNumber),
    FlowChangeArrayType,
    INITIAL_CHUNK_DATA,
    callback,
);

const getChunkBlobKey = (chunkNumber: number) => `changes_${chunkNumber.toFixed(0).padStart(13, "0")}`;

const INITIAL_CHUNK_DATA: FlowChange[] = Object.freeze(new Array<FlowChange>(0)) as FlowChange[];
