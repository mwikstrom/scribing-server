import { FlowPresence, FlowSelection, FlowOperation } from "scribing";
import { getAge, ONE_SECOND } from "./time";

/** @internal */
export const getSyncedPresence = (
    before: readonly FlowPresence[],
    client: string,
    user: string,
    selection: FlowSelection | null,
    operation: FlowOperation | null,
): FlowPresence[] => {
    const other = before
        .filter(presence => !isMine(presence, client, user) && isFresh(presence))
        .map(presence => transformOther(presence, operation));
    const mine = makeMine(client, user, selection);
    return [...other, mine];
};

/** @internal */
export const excludeMyPresence = (
    array: readonly FlowPresence[],
    client: string,
    user: string,
): FlowPresence[] => array.filter(presence => !isMine(presence, client, user));

const isMine = (presence: FlowPresence, client: string, user: string) => (
    presence.client === client &&
    presence.user === user
);

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

const makeMine = (client: string, user: string, selection: FlowSelection | null): FlowPresence => ({
    client,
    user,
    seen: new Date(),
    selection,
});

const MAX_PRESENCE_AGE = 10 * ONE_SECOND;
