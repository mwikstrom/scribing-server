import { JsonStore } from "../JsonStore";
import { FlowChange } from "./FlowChange";
import { FlowHeadData, FlowHeadDataType } from "./FlowHeadData";
import { ServerLogger } from "../ServerLogger";
import { ABORT_SYMBOL } from "./retry";
import { update } from "./update";
import { 
    FlowContent, 
    FlowPresence, 
    ResetContent, 
    FlowSyncSnapshot, 
    FlowContentHashFunc, 
    FlowTheme
} from "scribing";
import { CONFLICT_SYMBOL } from "./merge";

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
export const initHead = async (
    store: JsonStore,
    content: FlowContent,
    theme: FlowTheme,
    user: string,
): Promise<FlowHeadData | null> => {
    const head = getInitialHeadData(content, theme, user);
    const data = FlowHeadDataType.toJsonValue(head);
    const result = await store.write(HEAD_KEY, data, { ifNoneMatch: "*" });
    if (result === null) {
        return null;
    } else {
        return head;
    }
};

/** @internal */
export const updateHead = (
    logger: ServerLogger,
    store: JsonStore,
    callback: (dataBefore: FlowHeadData) => Promise<FlowHeadData | typeof ABORT_SYMBOL>,
): Promise<FlowHeadData | typeof ABORT_SYMBOL | typeof CONFLICT_SYMBOL> => update(
    logger,
    store,
    HEAD_KEY,
    FlowHeadDataType,
    callback,
);

/** @internal */
export const getSnapshot = async (data: FlowHeadData, hashFunc?: FlowContentHashFunc): Promise<FlowSyncSnapshot> => {
    const { version, frozen, content, theme, presence } = data;
    const digest = await content.digest(hashFunc);
    return { version, frozen, content, digest, theme, presence }; 
};

const HEAD_KEY = "head";

const getInitialHeadData = (content: FlowContent, theme: FlowTheme, user: string): FlowHeadData => Object.freeze({
    version: 0,
    frozen: false,
    content,
    theme,
    recent: Object.freeze([getInitialChange(content, user)]) as FlowChange[],
    presence: Object.freeze(new Array<FlowPresence>(0)) as FlowPresence[],
});

const getInitialChange = (content: FlowContent, user: string): FlowChange => Object.freeze({
    v: 0,
    t: new Date(),
    u: user,
    o: new ResetContent({ content }),
});
