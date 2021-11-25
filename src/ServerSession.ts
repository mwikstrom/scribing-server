import { recordType, RecordType, stringType } from "paratype";

/** @public */
export interface ServerUser {
    uid: string;
    name: string;
}

/** @public */
export interface ServerSession extends ServerUser {
    key: string;
}

/** @internal */
export const ServerSessionType: RecordType<ServerSession> = recordType({
    key: stringType,
    uid: stringType,
    name: stringType,
});
