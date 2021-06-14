class Test {
    constructor() {}

    describeMethods() {
        return {
            safe: ["safe", "safeWithConsensus"],
            nonced: ["nonced", "noncedWithConsensus"],
        };
    }

    safe(callback) {
        callback(null, "safe");
    }

    safeWithConsensus(callback) {
        this.keyValueStorage.set("safe-key", "safe-value");
        callback(null, "safeWithConsensus");
    }

    nonced(callback) {
        callback(null, "nonced");
    }

    noncedWithConsensus(callback) {
        this.keyValueStorage.set("nonced-key", "nonced-value");
        callback(null, "noncedWithConsensus");
    }
}
