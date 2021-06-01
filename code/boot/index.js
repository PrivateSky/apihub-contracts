class Boot {
    constructor(domain, config) {
        this.domain = domain;
        this.config = config;

        this.dsu = null;
        this.mountedDSUs = {};
        this.contracts = {};
    }

    init(callback) {
        const openDSU = require("opendsu");
        const resolver = openDSU.loadApi("resolver");

        resolver.loadDSU(this.config.constitution, (error, dsu) => {
            if (error) {
                return callback(error);
            }

            this.dsu = dsu;

            this.dsu.listMountedDSUs("/", (error, mountedDSUs) => {
                if (error) {
                    return callback(error);
                }

                const mountedDSUsToLoad = mountedDSUs.filter((mountedDSU) => mountedDSU.path !== "code");

                this.mountedDSUs = {};

                const mountEachRemainingContractDSU = () => {
                    if (!mountedDSUsToLoad.length) {
                        return callback();
                    }

                    const mountedDSUToLoad = mountedDSUsToLoad.shift();
                    const contractName = mountedDSUToLoad.path;
                    console.log(`[Boot] Loading DSU for contract ${contractName}`);
                    resolver.loadDSU(mountedDSUToLoad.identifier, (error, contractDSU) => {
                        console.log(`[Boot] Loaded DSU for contract ${contractName}`);
                        if (error) {
                            return callback(error);
                        }

                        this.mountedDSUs[contractName] = contractDSU;
                        mountEachRemainingContractDSU();
                    });
                };

                mountEachRemainingContractDSU();
            });
        });
    }

    setContracts(contracts) {
        this.contracts = contracts;
    }

    setContractMixin(contractName, contract, callback) {
        contract.getDSU = this.getDSU.bind(this, contractName);
        contract.getMainDSU = this.getMainDSU.bind(this);
        contract.getContract = this.getContract.bind(this);
        contract.getContractNames = this.getContractNames.bind(this);
        contract.getKeySSIType = this.getKeySSIType.bind(this);
        contract.domain = this.domain;
        contract.config = this.config;

        callback(null, contract);
    }

    getDSU(contractName) {
        return this.mountedDSUs[contractName];
    }

    getMainDSU() {
        return this.dsu;
    }

    getContract(contractName) {
        return this.contracts[contractName];
    }

    getContractNames() {
        const contracts = Object.keys(this.contracts);
        contracts.sort();
        return contracts;
    }

    getKeySSIType(keySSIString) {
        if (!keySSIString || typeof keySSIString !== "string") {
            return null;
        }

        try {
            const keySSIApi = require("opendsu").loadApi("keyssi");
            const keySSI = keySSIApi.parse(keySSIString);
            return keySSI.getTypeName();
        } catch (error) {
            console.error(`Invalid keySSI string provided: ${keySSIString}`, error);
        }

        return null;
    }
}
