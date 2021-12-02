import { JsonStore } from "../JsonStore";
import { FlowChange } from "./FlowChange";
import { FlowHeadData, FlowHeadDataType } from "./FlowHeadData";
import { ServerLogger } from "../ServerLogger";
import { ABORT_SYMBOL } from "./retry";
import { update } from "./update";
import { FlowContent, DefaultFlowTheme, FlowPresence, ResetContent } from "scribing";

/** @internal */
export const readHead = async (store: JsonStore, initialContent: FlowContent): Promise<FlowHeadData> => {
    const readResult = await store.read(HEAD_KEY);
    if (readResult === null) {
        return getInitialHeadData(initialContent);
    } else {
        return FlowHeadDataType.fromJsonValue(readResult.value);
    }
};

/** @internal */
export const updateHead = async (
    logger: ServerLogger,
    store: JsonStore,
    initialContent: FlowContent,
    callback: (dataBefore: FlowHeadData) => Promise<FlowHeadData | typeof ABORT_SYMBOL>,
): Promise<FlowHeadData | typeof ABORT_SYMBOL> => update(
    logger,
    store,
    HEAD_KEY,
    FlowHeadDataType,
    getInitialHeadData(initialContent),
    callback,
);

const HEAD_KEY = "head";

const getInitialHeadData = (content: FlowContent): FlowHeadData => Object.freeze({
    version: 0,
    content,
    theme: DefaultFlowTheme.instance,
    recent: Object.freeze([getInitialChange(content)]) as FlowChange[],
    presence: Object.freeze(new Array<FlowPresence>(0)) as FlowPresence[],
});

const getInitialChange = (content: FlowContent): FlowChange => Object.freeze({
    v: 0,
    t: new Date(),
    u: "",
    o: new ResetContent({ content }),
});
