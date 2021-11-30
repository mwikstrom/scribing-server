import { FlowContent, FlowOperation, FlowSelection, FlowSyncInput } from "scribing";
import { FlowChange } from "./FlowChange";
import { FlowHeadData } from "./FlowHeadData";
import { CONFLICT_SYMBOL, getMergeOperation } from "./merge";
import { getSyncedPresence } from "./sync-presence";

/** @internal */
export interface SyncedHeadResult {
    dataAfter: FlowHeadData,
    merge: FlowOperation | null,
}

/** @internal */
export const getSyncedHead = (
    input: FlowSyncInput,
    user: string,
    dataBefore: FlowHeadData
): SyncedHeadResult | typeof CONFLICT_SYMBOL => {
    const merge = getMergeOperation(input, dataBefore);

    if (merge === CONFLICT_SYMBOL) {
        return CONFLICT_SYMBOL;
    }

    const operation = getOperationToApply(input.operation, merge);
    const version = operation === null ? dataBefore.version : dataBefore.version + 1;
    const recent = getSyncedRecent(dataBefore.recent, user, operation);
    const content = getSyncedContent(dataBefore.content, operation);
    const selection = getSyncedSelection(input.selection, merge);
    const presence = getSyncedPresence(dataBefore.presence, input.client, user, selection, operation);
    const dataAfter: FlowHeadData = {
        version,
        content,
        theme: dataBefore.theme,
        recent,
        presence,
    };

    return { dataAfter, merge };
};

const getOperationToApply = (
    given: FlowOperation | null,
    merge: FlowOperation | null,
): FlowOperation | null => {
    if (given === null || merge === null) {
        return given;
    } else {
        return merge.transform(given);
    }
};

const getSyncedSelection = (
    selection: FlowSelection | null,
    merge: FlowOperation | null,
): FlowSelection | null => {
    if (selection === null || merge === null) {
        return selection;
    } else {
        return merge.applyToSelection(selection, false);
    }
};

const getSyncedRecent = (
    before: readonly FlowChange[],    
    user: string,
    operation: FlowOperation | null,
): FlowChange[] => {
    if (operation === null) {
        return [...before];
    } else {
        return [...before, {
            t: new Date(),
            u: user,
            o: operation,
        }];
    }
};

const getSyncedContent = (
    before: FlowContent,
    operation: FlowOperation | null,
): FlowContent => {
    if (operation === null) {
        return before;
    } else {
        return operation.applyToContent(before);
    }
};
