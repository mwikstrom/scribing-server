import { FlowBatch, FlowOperation, FlowSyncInput } from "scribing";
import { FlowChange } from "./FlowChange";
import { FlowHeadData } from "./FlowHeadData";

/** @internal */
export const getMergeOperation = (
    input: FlowSyncInput,
    data: FlowHeadData
): FlowOperation | null | typeof CONFLICT_SYMBOL => {
    if (input.version === data.version) {
        return null;
    } else if (input.version > data.version) {
        return CONFLICT_SYMBOL;
    }
    const map = new Map(data.recent.map(c => [c.v, c.o]));
    const operations: FlowOperation[] = [];
    for (let v = input.version + 1; v <= data.version; ++v) {
        const found = map.get(v);
        if (found) {
            operations.push(found);
        } else {
            return CONFLICT_SYMBOL;
        }        
    }
    return FlowBatch.fromArray(operations);
};

/** @internal */
export const getMergedChanges = (
    before: readonly FlowChange[],
    changes: readonly FlowChange[],
): FlowChange[] => {
    const map = new Map<number, FlowChange>();
    for (const c of before.concat(changes)) {        
        map.set(c.v, c);
    }
    const sorted = [...map.values()].sort((a, b) => a.v - b.v);
    return sorted;
};

/** @internal */
export const CONFLICT_SYMBOL: unique symbol = Symbol("CONFLICT");
