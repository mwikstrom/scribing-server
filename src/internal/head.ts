import { JsonStore } from "../JsonStore";
import { FlowChange } from "./FlowChange";
import { FlowHeadData, FlowHeadDataType } from "./FlowHeadData";
import { ServerLogger } from "../ServerLogger";
import { ABORT_SYMBOL } from "./retry";
import { update } from "./update";
import { FlowContent, DefaultFlowTheme, FlowPresence, ResetContent } from "scribing";
import { CONFLICT_SYMBOL } from "./merge";
import type { InitialContentFactory } from "../FlowSyncServer";

/** @internal */
export const readHead = async (store: JsonStore): Promise<FlowHeadData | null> => {
    const readResult = await store.read(HEAD_KEY);
    if (readResult === null) {
        return null;
    } else {
        return FlowHeadDataType.fromJsonValue(readResult.value);
    }
};

/** @internal */
export const updateHead = (
    logger: ServerLogger,
    store: JsonStore,
    initialContent: InitialContentFactory | null,
    callback: (dataBefore: FlowHeadData) => Promise<FlowHeadData | typeof ABORT_SYMBOL>,
    user = "",
): Promise<FlowHeadData | typeof ABORT_SYMBOL | typeof CONFLICT_SYMBOL> => update(
    logger,
    store,
    HEAD_KEY,
    FlowHeadDataType,
    async () => initialContent === null ? CONFLICT_SYMBOL : getInitialHeadData(await initialContent(logger), user),
    callback,
);

const HEAD_KEY = "head";

const getInitialHeadData = (content: FlowContent, user: string): FlowHeadData => Object.freeze({
    version: 0,
    content,
    theme: DefaultFlowTheme.instance,
    recent: Object.freeze([getInitialChange(content, user)]) as FlowChange[],
    presence: Object.freeze(new Array<FlowPresence>(0)) as FlowPresence[],
});

const getInitialChange = (content: FlowContent, user: string): FlowChange => Object.freeze({
    v: 0,
    t: new Date(),
    u: user,
    o: new ResetContent({ content }),
});
