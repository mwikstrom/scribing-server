import { FlowBatch, FlowOperation, FlowSyncInput } from "scribing";
import { FlowHeadData } from "./FlowHeadData";

/** @internal */
export const getMergeOperation = (
    input: FlowSyncInput,
    data: FlowHeadData
): FlowOperation | null | typeof CONFLICT_SYMBOL => {
    const behind = data.version - input.version;
    if (behind < 0 || behind > data.recent.length) {
        return CONFLICT_SYMBOL;
    } else if (behind === 0) {
        return null;
    } else {
        return FlowBatch.fromArray(data.recent.map(change => change.op).slice(-behind));
    }    
};

/** @internal */
export const CONFLICT_SYMBOL: unique symbol = Symbol("CONFLICT");
