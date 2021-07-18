class Consensus {
    async init(callback) {
        callback = $$.makeSaneCallback(callback);
        try {
            this.validatedBlocksFilePath = await this._getValidatedBlocksFilePath();

            const bricksledger = require("bricksledger");
            this.brickStorage = bricksledger.createFSBrickStorage(
                this.domain,
                `domains/${this.domain}/brick-storage`,
                this.storageFolder
            );
            callback();
        } catch (error) {
            console.log("error initialising consensus", error);
            callback(error);
        }
    }

    describeMethods() {
        return {
            safe: ["getLatestBlockInfo", "getBlock", "getPBlock", "getPBlockProposedByValidator"],
        };
    }

    async getLatestBlockInfo(callback) {
        callback = $$.makeSaneCallback(callback);
        try {
            let latestBlockNumber = 0;
            let latestBlockHash = null;

            if (await this._checkIfPathExists(this.validatedBlocksFilePath)) {
                const fs = require("fs");
                const os = require("os");
                const readStream = fs.createReadStream(this.validatedBlocksFilePath);
                readStream
                    .on("data", function (chunk) {
                        // split chunk by newline in order to get the block hashes
                        const hashes = chunk
                            .toString()
                            .split(os.EOL)
                            .map((hash) => (hash ? hash.trim() : null))
                            .filter((hash) => !!hash);

                        if (hashes.length) {
                            latestBlockNumber += hashes.length;
                            latestBlockHash = hashes[hashes.length - 1];
                        }
                    })
                    .on("close", function (error) {
                        if (error) {
                            return callback(error);
                        }

                        callback(null, {
                            number: latestBlockNumber,
                            hash: latestBlockHash,
                        });
                    });
            } else {
                callback(null, { number: latestBlockNumber, hash: latestBlockHash });
            }
        } catch (error) {
            callback(error);
        }
    }

    getBlock(blockHashLinkSSI, callback) {
        let hash;
        try {
            hash = this._getHashFromHashLinkSSI(blockHashLinkSSI);
        } catch (error) {
            return callback(error);
        }
        this.brickStorage.getBrick(hash, callback);
    }

    getPBlock(pBlockHashLinkSSI, callback) {
        let hash;
        try {
            hash = this._getHashFromHashLinkSSI(pBlockHashLinkSSI);
        } catch (error) {
            return callback(error);
        }
        this.brickStorage.getBrick(hash, callback);
    }

    getPBlockProposedByValidator(blockNumber, validatorDID, callback) {
        this.getPBlockProposedForConsensus(blockNumber, validatorDID, callback);
    }

    _getHashFromHashLinkSSI(hashLinkSSI) {
        const keySSI = require("opendsu").loadApi("keyssi");
        hashLinkSSI = keySSI.parse(hashLinkSSI);
        return hashLinkSSI.getHash();
    }

    async _getValidatedBlocksFilePath() {
        const path = require("path");
        const validatedBlocksFolderPath = path.join(this.storageFolder, "domains", this.domain);
        try {
            await this._ensureFolderPathExists(validatedBlocksFolderPath);
        } catch (error) {
            console.log(error);
        }

        const validatedBlocksFilePath = path.join(validatedBlocksFolderPath, "blocks");
        return validatedBlocksFilePath;
    }

    async _ensureFolderPathExists(path) {
        const fs = require("fs");
        if (!(await this._checkIfPathExists(path))) {
            await $$.promisify(fs.mkdir)(path, { recursive: true });
        }
    }

    async _checkIfPathExists(path) {
        try {
            const fs = require("fs");
            await $$.promisify(fs.access)(path);
            return true;
        } catch (error) {
            return false;
        }
    }
}
