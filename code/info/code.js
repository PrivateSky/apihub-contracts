class Info {
    constructor() {}

    describeMethods() {
        return {
            safe: ["getContracts"],
        };
    }

    getContracts(callback) {
        const contractsMetadata = this.getContractsMetadata();
        callback(null, contractsMetadata);
    }
}
