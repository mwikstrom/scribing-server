/**
 * Server for collaborative rich text editing
 * @packageDocumentation
 */

if (!global.crypto) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    global.crypto = require("crypto").webcrypto;
}

export * from "./JsonStore";
export * from "./ServerLogger";
export * from "./FlowSyncServer";
export * from "./MemoryJsonStore";
