class Anchoring {
    constructor() {}

    describeMethods() {
        return {
            public: [
                "getAllVersions",
                "getLatestVersion",
                "createAnchor",
                "createNFT",
                "appendToAnchor",
                "transferTokenOwnership",
            ],
        };
    }

    createAnchor(anchorId, callback) {
        const strategy = this._getStrategy(anchorId);
        strategy.createAnchor(callback);
    }

    createNFT() {}

    appendToAnchor(anchorId, hashLinkIds, digitalProof, zkp, callback) {
        const data = {
            hashLinkIds,
            digitalProof,
            zkp,
        };
        const strategy = this._getStrategy(anchorId, data);
        strategy.appendToAnchor(callback);
    }

    transferTokenOwnership() {}

    getAllVersions(anchorId, callback) {
        const strategy = this._getStrategy(anchorId);
        strategy.getAllVersions(callback);
    }

    getLatestVersion(anchorId, callback) {
        const strategy = this._getStrategy(anchorId);
        strategy.getLatestVersion(callback);
    }

    _getStrategy(anchorId, data) {
        const apihub = require("apihub");
        const ContractStrategy = apihub.anchoringStrategies.FS;

        const getAnchoringDomainConfig = () => {
            const openDSU = require("opendsu");
            const keySSISpace = openDSU.loadApi("keyssi");
            const keySSI = keySSISpace.parse(anchorId);
            const domain = keySSI.getDLDomain();

            const apihubConfig = apihub.getServerConfig();
            const { endpointsConfig: { anchoring: { domainStrategies = {} } = {} } = {} } = apihubConfig;
            return domainStrategies[domain];
        };

        const server = { rootFolder: this.rootFolder };
        const domainConfig = getAnchoringDomainConfig();
        const contractStrategy = new ContractStrategy(server, domainConfig, anchorId, data);
        return contractStrategy;
    }
}
