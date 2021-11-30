import { arrayType, recordType, RecordType, stringType, timestampType } from "paratype";
import { FlowOperation } from "scribing";

/** @internal */
export interface FlowChange {
    ts: Date;
    op: FlowOperation;
    by: string;
}

/** @internal */
export const FlowChangeType: RecordType<FlowChange> = recordType({
    ts: timestampType,
    op: FlowOperation.baseType,
    by: stringType,
});

/** @internal */
export const FlowChangeArrayType = arrayType(FlowChangeType);
