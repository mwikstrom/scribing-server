import { arrayType, nonNegativeIntegerType, recordType, RecordType, stringType, timestampType } from "paratype";
import { FlowOperation } from "scribing";

/** @internal */
export interface FlowChange {
    /** Timestamp */
    t: Date;
    /** Actor user identifier, or empty when anonymous or unknown */
    u: string;
    /** The operation */
    o: FlowOperation;
}

/** @internal */
export const FlowChangeType: RecordType<FlowChange> = recordType({
    t: timestampType,
    u: stringType,
    o: FlowOperation.baseType,
});

/** @internal */
export const FlowChangeArrayType = arrayType(FlowChangeType);
