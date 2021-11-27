import { BlobStore } from "../BlobStore";
import { FlowChange } from "../FlowChange";
import { FlowHeadData, FlowHeadDataType } from "./FlowHeadData";
import { ServerLogger } from "../ServerLogger";
import { getJsonData } from "./json-blob";
import { ABORT_SYMBOL } from "./retry";
import { updateBlob } from "./update-blob";
import { FlowContent, DefaultFlowTheme, FlowPresence } from "scribing";

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

const INITIAL_DATA_CACHE = new WeakMap<FlowContent, FlowHeadData>();
const getInitialHeadData = (content: FlowContent): FlowHeadData => {
    let cached = INITIAL_DATA_CACHE.get(content);
    if (!cached) {
        INITIAL_DATA_CACHE.set(content, cached = Object.freeze({
            version: 0,
            content,
            theme: DefaultFlowTheme.instance,
            recent: Object.freeze(new Array<FlowChange>(0)) as FlowChange[],
            presence: Object.freeze(new Array<FlowPresence>(0)) as FlowPresence[],
        }));
    }
    return cached;
};
