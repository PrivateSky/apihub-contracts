class Anchoring {
    constructor() {}

    describeMethods() {
        return {
            safe: ["getAllVersions", "getLatestVersion", "createAnchor", "createNFT", "appendToAnchor", "transferTokenOwnership"],
        };
    }

    createAnchor(anchorId, callback) {
        callback = $$.makeSaneCallback(callback);

        this._createOrUpdateAnchor(anchorId, true)
            .then((result) => callback(undefined, result))
            .catch((error) => callback(error));
    }

    createNFT() {
        callback = $$.makeSaneCallback(callback);

        this._createOrUpdateAnchor(anchorId, true)
            .then((result) => callback(undefined, result))
            .catch((error) => callback(error));
    }

    appendToAnchor(anchorId, hashLinkIds, digitalProof, zkp, callback) {
        callback = $$.makeSaneCallback(callback);

        this._createOrUpdateAnchor(anchorId, false, { hashLinkIds, digitalProof, zkp })
            .then((result) => callback(undefined, result))
            .catch((error) => callback(error));
    }

    transferTokenOwnership() {}

    getAllVersions(anchorId, callback) {
        callback = $$.makeSaneCallback(callback);

        this._getAllHashLinksForAnchorId(anchorId)
            .then((result) => callback(undefined, result))
            .catch((error) => callback(error));
    }

    getLatestVersion(anchorId, callback) {
        callback = $$.makeSaneCallback(callback);

        this._getAllHashLinksForAnchorId(anchorId)
            .then((result) => callback(undefined, result && result.length ? result[result.length - 1] : null))
            .catch((error) => callback(error));
    }

    async _createOrUpdateAnchor(anchorId, createWithoutVersion, data) {
        let anchorKeySSI;

        const openDSU = require("opendsu");
        const { parse, createTemplateKeySSI } = openDSU.loadApi("keyssi");
        try {
            anchorKeySSI = parse(anchorId);
        } catch (error) {
            throw this._getErrorWrapper(`Cannot parse anchorId ${anchorId}`, 500, error);
        }

        const rootKeySSITypeName = anchorKeySSI.getRootKeySSITypeName();
        const rootKeySSI = createTemplateKeySSI(rootKeySSITypeName, anchorKeySSI.getDLDomain());

        if (!createWithoutVersion && (!data || !data.hashLinkIds)) {
            throw this._getErrorWrapper(`Missing append data provided for anchor ${anchorId}`, 400);
        }

        if (createWithoutVersion || !rootKeySSI.canSign()) {
            await this._writeToAnchorStorage(createWithoutVersion, anchorId, createWithoutVersion ? null : data.hashLinkIds);
            return;
        }

        const { hashLinkIds } = data;
        let validAnchor;
        try {
            validAnchor = this._verifySignature(anchorKeySSI, hashLinkIds.new, hashLinkIds.last);
        } catch (error) {
            throw this._getErrorWrapper(`Cannot verify signature for anchorId ${anchorId}`, 403, error);
        }

        if (!validAnchor) {
            throw this._getErrorWrapper(`Failed to verify signature for anchorId ${anchorId}`, 403);
        }

        if (anchorKeySSI.getTypeName() === openDSU.constants.KEY_SSIS.ZERO_ACCESS_TOKEN_SSI) {
            try {
                this._validateZatSSI(anchorKeySSI, hashLinkIds.new);
            } catch (error) {
                throw this._getErrorWrapper(`Failed to validate ZATSSI ${hashLinkIds.new.getIdentifier()}`, 403, error);
            }

            await this._writeToAnchorStorage(createWithoutVersion, anchorId, hashLinkIds);
            return;
        }

        await this._writeToAnchorStorage(createWithoutVersion, anchorId, hashLinkIds);
    }

    async _writeToAnchorStorage(createWithoutVersion, anchorId, hashLinkIds) {
        if (!anchorId || typeof anchorId !== "string") {
            throw new Error("No anchorId specified");
        }

        let forbiddenCharacters = new RegExp(/[~`!#$%\^&*+=\-\[\]\\';,/{}|\\":<>\?]/g);
        if (forbiddenCharacters.test(anchorId)) {
            console.log(`Found forbidden characters in anchorId ${anchorId}`);
            throw new Error(`anchorId ${anchorId} contains forbidden characters`);
        }

        const existingVersions = await this._getAllHashLinksForAnchorId(anchorId);
        if (createWithoutVersion) {
            if (existingVersions && existingVersions.length) {
                // the anchor file already exists and has versions, so we cannot create another file for the same anchor
                return this._getErrorWrapper(
                    `Unable to create anchor for existing anchorId ${anchorId}`,
                    "anchor-already-exists"
                );
            }

            await this.keyValueStorage.set(anchorId, []);
            return;
        }

        await this._appendHashLink(anchorId, hashLinkIds.new, { lastHashLink: hashLinkIds.last });
    }

    async _appendHashLink(anchorId, hash, options) {
        try {
            let existingHashLinks = (await this._getAllHashLinksForAnchorId(anchorId)) || [];
            const lastHashLink = existingHashLinks[existingHashLinks.length - 1];
            const setNewHashLink = async () => {
                const updatedHashLinks = [...existingHashLinks, hash];
                await this.keyValueStorage.set(anchorId, updatedHashLinks);
            };

            if (existingHashLinks.length && lastHashLink !== options.lastHashLink) {
                const opendsu = require("opendsu");
                const keySSISpace = opendsu.loadAPI("keyssi");
                if (lastHashLink) {
                    const lastSSI = keySSISpace.parse(lastHashLink);
                    if (lastSSI.getTypeName() === opendsu.constants.KEY_SSIS.TRANSFER_SSI) {
                        await setNewHashLink();
                        return;
                    }
                }

                console.log(
                    "__appendHashLink error.Unable to add alias: versions out of sync.",
                    lastHashLink,
                    options.lastHashLink
                );
                console.log("existing hashes :", hashes);
                console.log("received hashes :", options);

                throw this._getErrorWrapper(`Unable to add alias for anchorId ${anchorId}: versions out of sync`, "sync-error");
            }

            await setNewHashLink();
        } catch (error) {
            throw this._getErrorWrapper(`Failed to append hash <${hash}> for anchor <${anchorId}>`, error);
        }
    }

    _verifySignature(anchorKeySSI, newSSIIdentifier, lastSSIIdentifier) {
        const openDSU = require("opendsu");
        const newSSI = openDSU.loadAPI("keyssi").parse(newSSIIdentifier);
        const timestamp = newSSI.getTimestamp();
        const signature = newSSI.getSignature();
        let dataToVerify = timestamp;
        if (lastSSIIdentifier) {
            dataToVerify = lastSSIIdentifier + dataToVerify;
        }

        if (newSSI.getTypeName() === openDSU.constants.KEY_SSIS.SIGNED_HASH_LINK_SSI) {
            dataToVerify += anchorKeySSI.getIdentifier();
            return anchorKeySSI.verify(dataToVerify, signature);
        }
        if (newSSI.getTypeName() === openDSU.constants.KEY_SSIS.TRANSFER_SSI) {
            dataToVerify += newSSI.getSpecificString();
            return anchorKeySSI.verify(dataToVerify, signature);
        }

        throw Error(`Invalid newSSI type provided`);
    }

    async _validateZatSSI(zatSSI, newSSIIdentifier) {
        const openDSU = require("opendsu");
        const newSSI = openDSU.loadAPI("keyssi").parse(newSSIIdentifier);

        let existingHashLinks;
        try {
            existingHashLinks = await this._getAllHashLinksForAnchorId(zatSSI.getIdentifier());
        } catch (error) {
            throw this._getErrorWrapper(`Failed to get versions for <${zatSSI.getIdentifier()}>`, err);
        }

        if (!existingHashLinks || existingHashLinks.length === 0) {
            return true;
        }

        let lastTransferSSI;
        for (let i = existingHashLinks.length - 1; i >= 0; i--) {
            const ssi = openDSU.loadAPI("keyssi").parse(existingHashLinks[i]);
            if (ssi.getTypeName() === openDSU.constants.KEY_SSIS.TRANSFER_SSI) {
                lastTransferSSI = ssi;
                break;
            }
        }

        if (lastTransferSSI.getPublicKeyHash() !== newSSI.getPublicKeyHash()) {
            throw this._getErrorWrapper(`Failed to validate ZATSSI ${zatSSI.getIdentifier()}`);
        }

        return true;
    }

    async _getAllHashLinksForAnchorId(anchorId) {
        const hashLinks = await this.keyValueStorage.get(anchorId);
        if (!hashLinks) {
            // anchorId doesn't exist
            return [];
        }

        return hashLinks;
    }

    _getErrorWrapper(message, code, innerError) {
        if (code == null) {
            innerError = code;
        }

        const error = new Error(message);
        error.code = code;
        error.error = innerError;
        return error;
    }
}
