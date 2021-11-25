import { FlowPresence, FlowSelection, FlowOperation } from "scribing";
import { ServerSession } from "../ServerSession";
import { getAge, ONE_SECOND } from "./time";

/** @internal */
export const getSyncedPresence = (
    before: readonly FlowPresence[],
    session: ServerSession,
    selection: FlowSelection | null,
    operation: FlowOperation | null,
): FlowPresence[] => {
    const other = before
        .filter(presence => !isMine(presence, session) && isFresh(presence))
        .map(presence => transformOther(presence, operation));
    const mine = makeMine(session, selection);
    return [...other, mine];
};

const isMine = (presence: FlowPresence, session: ServerSession) => presence.key === session.key;

const isFresh = (presence: FlowPresence): boolean => getAge(presence.seen) <= MAX_PRESENCE_AGE;

const transformOther = (presence: FlowPresence, operation: FlowOperation | null) => {
    if (operation !== null) {
        const { selection, ...rest } = presence;
        if (selection !== null) {
            presence = { ...rest, selection: operation.applyToSelection(selection, false) };
        }
    }
    return presence;
};

const makeMine = (session: ServerSession, selection: FlowSelection | null): FlowPresence => ({
    key: session.key,
    uid: session.uid,
    seen: new Date(),
    name: session.name,
    selection,
});

const MAX_PRESENCE_AGE = 10 * ONE_SECOND;
