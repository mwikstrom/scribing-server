import { arrayType, recordType, RecordType, stringType, timestampType } from "paratype";
import { FlowOperation } from "scribing";

/** @internal */
export interface FlowChange {
    at: Date;
    op: FlowOperation;
    by: string;
}

/** @internal */
export const FlowChangeType: RecordType<FlowChange> = recordType({
    at: timestampType,
    op: FlowOperation.baseType,
    by: stringType,
});

/** @internal */
export const FlowChangeArrayType = arrayType(FlowChangeType);
