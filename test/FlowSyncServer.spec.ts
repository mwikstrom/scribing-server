import { FlowSyncServer } from "../src";

describe("FlowSyncServer", () => {
    it("can be constructed without parameters", () => {
        const server = new FlowSyncServer();
        expect(server).toBeInstanceOf(FlowSyncServer);
    });
});