import { FlowSyncServer } from "../src";
import { MemoryBlobStore } from "./MemoryBlobStore";

describe("FlowSyncServer", () => {
    it("can be constructed", () => {
        const blobs = new MemoryBlobStore();
        const server = new FlowSyncServer(blobs);
        expect(server).toBeInstanceOf(FlowSyncServer);
    });
});