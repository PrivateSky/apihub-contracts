class Test {
    constructor() {}

    describeMethods() {
        return {
            safe: ["safe", "safeWithConsensus"],
            nonced: ["nonced"],
        };
    }

    safe(callback) {
        callback(null, "safe");
    }

    safeWithConsensus(callback) {
        this.keyValueStorage.set("key", "value");
        callback(null, "safeWithConsensus");

        this.getContract("anchoring").createAnchor();
    }

    nonced(callback) {
        callback(null, "nonced");
    }
}
