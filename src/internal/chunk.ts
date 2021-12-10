import { JsonStore } from "../JsonStore";
import { FlowChange, FlowChangeArrayType } from "./FlowChange";
import { ServerLogger } from "../ServerLogger";
import { ABORT_SYMBOL } from "./retry";
import { update } from "./update";
import { CONFLICT_SYMBOL } from "./merge";

/** @internal */
export const updateChunk = async (
    logger: ServerLogger,
    store: JsonStore,
    chunkNumber: number,
    callback: (dataBefore: FlowChange[], logger: ServerLogger) => Promise<FlowChange[] | typeof ABORT_SYMBOL>,
): Promise<readonly FlowChange[] | typeof ABORT_SYMBOL | typeof CONFLICT_SYMBOL> => update(
    logger,
    store,
    getChunkKey(chunkNumber),
    FlowChangeArrayType,
    async () => INITIAL_CHUNK_DATA,
    callback,
);

const getChunkKey = (chunkNumber: number) => `changes_${chunkNumber.toFixed(0).padStart(13, "0")}`;

const INITIAL_CHUNK_DATA: FlowChange[] = Object.freeze(new Array<FlowChange>(0)) as FlowChange[];
