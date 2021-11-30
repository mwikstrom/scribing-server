import { arrayType, nonNegativeIntegerType, recordType, RecordType } from "paratype";
import { FlowContent, FlowTheme, FlowPresence, FlowPresenceType } from "scribing";
import { FlowChange, FlowChangeType } from "./FlowChange";

/** @internal */
export interface FlowHeadData {
    version: number;
    content: FlowContent;
    theme: FlowTheme;
    recent: FlowChange[];
    presence: FlowPresence[];
}

/** @internal */
export const FlowHeadDataType: RecordType<FlowHeadData> = recordType({
    version: nonNegativeIntegerType,
    content: FlowContent.classType,
    theme: FlowTheme.baseType,
    recent: arrayType(FlowChangeType),
    presence: arrayType(FlowPresenceType),
});