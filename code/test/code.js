class Test {
    constructor() {}

    describeMethods() {
        return {
            intern: ["intern"],
            public: ["public"],
            requireNonce: ["requireNonce"],
        };
    }

    intern(callback) {
        callback(null, "intern");
    }

    public(callback) {
        callback(null, "public");
    }

    requireNonce(callback) {
        callback(null, "requireNonce");
    }
}
