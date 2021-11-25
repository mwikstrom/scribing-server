import { recordType, RecordType, stringType } from "paratype";

/** @public */
export interface ServerSession {
    key: string;
    uid: string;
    name: string;
}

/** @internal */
export const ServerSessionType: RecordType<ServerSession> = recordType({
    key: stringType,
    uid: stringType,
    name: stringType,
});
