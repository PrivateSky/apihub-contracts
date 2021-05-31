class Info {
    constructor() {}

    describeMethods() {
        return {
            safe: ["getContracts"],
        };
    }

    getContracts(callback) {
        const contractNames = this.getContractNames().filter((contractName) => !["info", "test"].includes(contractName));
        const contracts = contractNames.map((contractName) => {
            const contract = this.getContract(contractName);
            const contractPrototype = Object.getPrototypeOf(contract);

            const contractMethodNames = Object.getOwnPropertyNames(contractPrototype).filter(
                (methodName) =>
                    methodName &&
                    methodName[0] !== "_" &&
                    methodName !== "constructor" &&
                    typeof contractPrototype[methodName] === "function"
            );

            return {
                name: contractName,
                methods: contractMethodNames,
            };
        });

        callback(null, contracts);
    }
}
