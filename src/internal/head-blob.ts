import { BlobStore } from "../BlobStore";
import { FlowChange } from "./FlowChange";
import { FlowHeadData, FlowHeadDataType } from "./FlowHeadData";
import { ServerLogger } from "../ServerLogger";
import { getJsonData } from "./json-blob";
import { ABORT_SYMBOL } from "./retry";
import { updateBlob } from "./update-blob";
import { FlowContent, DefaultFlowTheme, FlowPresence, ResetContent } from "scribing";

/** @internal */
export const readHeadBlob = async (blobStore: BlobStore, initialContent: FlowContent): Promise<FlowHeadData> => {
    const readResult = await blobStore.read(HEAD_BLOB_KEY);
    if (readResult === null) {
        return getInitialHeadData(initialContent);
    } else {
        return await getJsonData(readResult, FlowHeadDataType);
    }
};

/** @internal */
export const updateHeadBlob = async (
    logger: ServerLogger,
    blobStore: BlobStore,
    initialContent: FlowContent,
    callback: (dataBefore: FlowHeadData) => Promise<FlowHeadData | typeof ABORT_SYMBOL>,
): Promise<FlowHeadData | typeof ABORT_SYMBOL> => updateBlob(
    logger,
    blobStore,
    HEAD_BLOB_KEY,
    FlowHeadDataType,
    getInitialHeadData(initialContent),
    callback,
);

const HEAD_BLOB_KEY = "head";

const getInitialHeadData = (content: FlowContent): FlowHeadData => Object.freeze({
    version: 0,
    content,
    theme: DefaultFlowTheme.instance,
    recent: Object.freeze([getInitialChange(content)]) as FlowChange[],
    presence: Object.freeze(new Array<FlowPresence>(0)) as FlowPresence[],
});

const getInitialChange = (content: FlowContent): FlowChange => Object.freeze({
    ts: new Date(),
    op: new ResetContent({ content }),
    by: "",
});
