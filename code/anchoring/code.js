class Anchoring {
    constructor() {}

    allowExecution(isLocalCall, methodName, args) {
        if (["createAnchor", "appendAnchor"].includes(methodName)) {
            return isLocalCall && this.getKeySSIType(args[0]) === "consensus";
        }
        return true;
    }

    canExecuteImmediately(isLocalCall, methodName, args) {
        return methodName === "versions" || this.getKeySSIType(args[0]) === "consensus";
    }

    createAnchor(anchorId, hashLinkIds, digitalProof, zkp, callback) {}

    createNFT() {}

    appendAnchor(anchorId, hashLinkIds, digitalProof, zkp, callback) {}

    transferTokenOwnership() {}

    versions(callback) {
        this.getDSU().listFiles("/", callback);
    }

    getLatestVersion() {}
}
