/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { FlowContentHashFunc, FlowOperation, FlowSyncInputType } from "scribing";
import { FlowSyncServer, MemoryJsonStore } from "../src";
import { createHash } from "crypto";

jest.useFakeTimers();

const hashFunc: FlowContentHashFunc = async data => createHash("sha384").update(data).digest();

describe("FlowSyncServer", () => {
    it("can be constructed without parameters", () => {
        const server = new FlowSyncServer();
        expect(server).toBeInstanceOf(FlowSyncServer);
    });

    it("can sync and trim", async () => {
        const blobStore = new MemoryJsonStore();
        const server = new FlowSyncServer({store: blobStore, hashFunc });

        // Client A insert "foo" at position 0, based on version 0
        const v1 = await server.sync(FlowSyncInputType.fromJsonValue({
            version: 0,
            client: "A",
            selection: null,
            operation: { "insert": ["foo"], at: 0 },            
        }), "A");
        expect(v1?.merge).toBeNull();
        expect(v1?.version).toBe(1);

        // Client B insert "bar" at position 0, based on version 0
        const v2 = await server.sync(FlowSyncInputType.fromJsonValue({
            version: 0,
            client: "B",
            selection: null,
            operation: { "insert": ["bar"], at: 0 },            
        }), "B");
        expect(FlowOperation.baseType.toJsonValue(v2!.merge!)).toMatchObject({ "insert": ["foo"], at: 0 });
        expect(v2?.version).toBe(2);

        // Let 3 minutes pass
        const ts0 = new Date().toISOString();
        jest.advanceTimersByTime(3 * 60 * 1000);

        // Client A insert "!" at position 3, based on version 1
        const v3 = await server.sync(FlowSyncInputType.fromJsonValue({
            version: 1,
            client: "A",
            selection: null,
            operation: { "insert": ["!"], at: 3 },
        }), "A");
        expect(FlowOperation.baseType.toJsonValue(v3!.merge!)).toMatchObject({ "insert": ["bar"], at: 3 });
        expect(v3?.version).toBe(3);

        // Let another 3 minutes pass to make version 0 thru 2 eligable for trimming
        const ts1 = new Date().toISOString();
        jest.advanceTimersByTime(3 * 60 * 1000);
        const ts2 = new Date().toISOString();

        // Run trim
        expect(await server.trim()).toBe(true);

        // Client C insert "Hello " at position 0, based on version 0 (purged now)
        const conflict = await server.sync(FlowSyncInputType.fromJsonValue({
            version: 0,
            client: "C",
            selection: null,
            operation: { "insert": ["Hello "], at: 0 },
        }), "C");
        expect(conflict).toBeNull(); // CONFLICT! -- version purged

        // Client C insert "Hello " at position 0, based on version 3
        const v4 = await server.sync(FlowSyncInputType.fromJsonValue({
            version: 3,
            client: "C",
            selection: null,
            operation: { "insert": ["Hello "], at: 0 },
        }), "C");
        expect(v4?.merge).toBeNull();
        expect(v4?.version).toBe(4);

        const head = await blobStore.read("head");
        expect(head).not.toBeNull();
        expect(head!.value).toMatchObject({
            version: 4,
            content: ["Hello foobar!", { break: "para"}],
            recent: [
                { v: 3, t: ts1, u: "A", o: { insert: ["!"], at: 6} },
                { v: 4, t: ts2, u: "C", o: { insert: ["Hello "], at: 0} },
            ]
        });

        const changes = await blobStore.read("changes_0000000000000");
        expect(changes).not.toBeNull();
        expect(changes!.value).toMatchObject([
            { v: 0, t: ts0, u: "A", o: { reset: "content", content: [{ break: "para"}] } },
            { v: 1, t: ts0, u: "A", o: { insert: ["foo"], at: 0} },
            { v: 2, t: ts0, u: "B", o: { insert: ["bar"], at: 3} },
        ]);
    });
});