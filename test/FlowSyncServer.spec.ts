/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { FlowOperation, FlowSyncInputType } from "scribing";
import { FlowSyncServer, MemoryBlobStore } from "../src";
import { readBlobText } from "../src/internal/json-blob";

jest.useFakeTimers();

describe("FlowSyncServer", () => {
    it("can be constructed without parameters", () => {
        const server = new FlowSyncServer();
        expect(server).toBeInstanceOf(FlowSyncServer);
    });

    it("can sync and trim", async () => {
        const blobStore = new MemoryBlobStore();
        const server = new FlowSyncServer({blobStore});

        // Client A insert "foo" at position 0, based on version 1
        const output1 = await server.sync(FlowSyncInputType.fromJsonValue({
            version: 1,
            client: "A",
            selection: null,
            operation: { "insert": ["foo"], at: 0 },            
        }), "A");
        expect(output1?.merge).toBeNull();
        expect(output1?.version).toBe(2);

        // Client B insert "bar" at position 0, based on version 1
        const output2 = await server.sync(FlowSyncInputType.fromJsonValue({
            version: 1,
            client: "B",
            selection: null,
            operation: { "insert": ["bar"], at: 0 },            
        }), "B");
        expect(FlowOperation.baseType.toJsonValue(output2!.merge!)).toMatchObject({ "insert": ["foo"], at: 0 });
        expect(output2?.version).toBe(3);

        // Let 3 minutes pass
        const ts0 = new Date().toISOString();
        jest.advanceTimersByTime(3 * 60 * 1000);

        // Client A insert "!" at position 3, based on version 2
        const output3 = await server.sync(FlowSyncInputType.fromJsonValue({
            version: 2,
            client: "A",
            selection: null,
            operation: { "insert": ["!"], at: 3 },
        }), "A");
        expect(FlowOperation.baseType.toJsonValue(output3!.merge!)).toMatchObject({ "insert": ["bar"], at: 3 });
        expect(output3?.version).toBe(4);

        // Let another 3 minutes pass to make version 0 thru 2 eligable for trimming
        const ts1 = new Date().toISOString();
        jest.advanceTimersByTime(3 * 60 * 1000);
        const ts2 = new Date().toISOString();

        // Run trim
        expect(await server.trim()).toBe(true);

        // Client C insert "Hello " at position 0, based on version 1
        const output4 = await server.sync(FlowSyncInputType.fromJsonValue({
            version: 1,
            client: "C",
            selection: null,
            operation: { "insert": ["Hello "], at: 0 },
        }), "C");
        expect(output4).toBeNull(); // CONFLICT! -- version purged

        // Client C insert "Hello " at position 0, based on version 4
        const output5 = await server.sync(FlowSyncInputType.fromJsonValue({
            version: 4,
            client: "C",
            selection: null,
            operation: { "insert": ["Hello "], at: 0 },
        }), "C");
        expect(output5?.merge).toBeNull();
        expect(output5?.version).toBe(5);

        const head = await blobStore.read("head");
        expect(head).not.toBeNull();
        expect(JSON.parse(await readBlobText(head!.blob))).toMatchObject({
            version: 5,
            content: ["Hello foobar!"],
            recent: [
                { at: ts1, by: "A", op: { insert: ["!"], at: 6} },
                { at: ts2, by: "C", op: { insert: ["Hello "], at: 0} },
            ]
        });

        const changes = await blobStore.read("changes_0000000000000");
        expect(changes).not.toBeNull();
        expect(JSON.parse(await readBlobText(changes!.blob))).toMatchObject([
            { at: ts0, by: "", op: { reset: "content", content: [] } },
            { at: ts0, by: "A", op: { insert: ["foo"], at: 0} },
            { at: ts0, by: "B", op: { insert: ["bar"], at: 3} },
        ]);
    });
});