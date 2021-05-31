class Test {
    constructor() {}

    describeMethods() {
        return {
            intern: ["intern"],
            safe: ["safe"],
            nonced: ["nonced"],
        };
    }

    intern(callback) {
        callback(null, "intern");
    }

    safe(callback) {
        callback(null, "safe");
    }

    nonced(callback) {
        callback(null, "nonced");
    }
}
