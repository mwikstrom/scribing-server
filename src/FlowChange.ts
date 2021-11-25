import { arrayType, recordType, RecordType, timestampType } from "paratype";
import { FlowOperation } from "scribing";
import { ServerSession, ServerSessionType } from "./ServerSession";

/** @internal */
export interface FlowChange {
    at: Date;
    op: FlowOperation;
    by: ServerSession;
}

/** @internal */
export const FlowChangeType: RecordType<FlowChange> = recordType({
    at: timestampType,
    op: FlowOperation.baseType,
    by: ServerSessionType,
});

/** @internal */
export const FlowChangeArrayType = arrayType(FlowChangeType);
