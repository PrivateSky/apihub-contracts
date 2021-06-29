class Bdns {
    constructor() {}

    async init(callback) {
        try {
            const fs = require("fs");
            const path = require("path");

            const configFolderPath = process.env.PSK_CONFIG_LOCATION
                ? process.env.PSK_CONFIG_LOCATION
                : path.join(this.rootFolder, "config");

            this.bdnsFolderPath = path.join(configFolderPath, "bdns");

            try {
                await $$.promisify(fs.access)(this.bdnsFolderPath);
            } catch (error) {
                // domain folder doesn't exists, so we create it
                await $$.promisify(fs.mkdir)(this.bdnsFolderPath, { recursive: true });
            }

            // get the initial domain config from the bdns.hosts file
            this._populateDomainAndSubdomainFilesIfMissing(configFolderPath);

            callback();
        } catch (error) {
            console.log("error creating bdns folder", error);
            callback(error);
        }
    }

    describeMethods() {
        return {
            safe: ["getDomainInfo", "getSubdomains", "getSubdomainInfo", "getDomainValidators"],
            nonced: ["updateDomainInfo", "addSubdomain", "updateSubdomainInfo", "deleteSubdomain", "addDomainValidator"],
        };
    }

    async getDomainInfo(callback) {
        callback = $$.makeSaneCallback(callback);
        this._getDomainInfoAsync()
            .then((result) => callback(undefined, result))
            .catch((error) => callback(error));
    }

    async updateDomainInfo(domainJSON, callback) {
        callback = $$.makeSaneCallback(callback);
        if (!domainJSON || typeof domainJSON !== "object") {
            return callback("Missing or invalid domainJSON specified");
        }

        try {
            const domainFilePath = this._getDomainFilePath();
            await this._writeConfigToFile(domainJSON, domainFilePath);

            callback();
        } catch (error) {
            callback(error);
        }
    }

    async getSubdomains(callback) {
        callback = $$.makeSaneCallback(callback);
        const path = require("path");
        try {
            const subdomainSuffix = `.${this.domain}.json`;
            const domainFiles = await $$.promisify(require("fs").readdir)(this.bdnsFolderPath, { withFileTypes: true });

            const subdomains = domainFiles
                .filter((file) => file.isFile() && path.extname(file.name) == ".json")
                .map((file) => file.name)
                .filter((name) => {
                    if (!name.endsWith(subdomainSuffix)) {
                        return false;
                    }

                    const filePrefix = name.substring(0, name.lastIndexOf(subdomainSuffix));
                    const isDirectSubdomain = filePrefix.indexOf(".") === -1;
                    return isDirectSubdomain;
                })
                .map((name) => name.replace(subdomainSuffix, ""));
            callback(null, subdomains);
        } catch (error) {
            callback(error);
        }
    }

    async addSubdomain(subdomain, callback) {
        callback = $$.makeSaneCallback(callback);
        if (!subdomain || subdomain.indexOf(".") !== -1) {
            return callback("Invalid subdomain specified");
        }

        const fs = require("fs");
        const subdomainFilePath = this._getSubdomainFilePath(subdomain);

        try {
            await $$.promisify(fs.access)(subdomainFilePath);
            return callback(`subdomain '${subdomain}' already exists inside domain '${domain}'`);
        } catch (error) {
            // the subdomain doesn't exist
        }

        try {
            await this._writeConfigToFile({}, subdomainFilePath);

            callback();
        } catch (error) {
            callback(error);
        }
    }

    async getSubdomainInfo(subdomain, callback) {
        callback = $$.makeSaneCallback(callback);
        try {
            await this._ensureSubdomainExists(subdomain);

            const subdomainFilePath = this._getSubdomainFilePath(subdomain);
            const subdomainContent = await $$.promisify(require("fs").readFile)(subdomainFilePath);
            const subdomainJSON = JSON.parse(subdomainContent.toString());

            callback(null, subdomainJSON);
        } catch (error) {
            callback(error);
        }
    }

    async updateSubdomainInfo(subdomain, subdomainJSON, callback) {
        callback = $$.makeSaneCallback(callback);
        try {
            await this._ensureSubdomainExists(subdomain);

            const subdomainFilePath = this._getSubdomainFilePath(subdomain);
            await this._writeConfigToFile(subdomainJSON, subdomainFilePath);

            callback();
        } catch (error) {
            callback(error);
        }
    }

    async deleteSubdomain(subdomain, callback) {
        callback = $$.makeSaneCallback(callback);
        try {
            await this._ensureSubdomainExists(subdomain);

            const subdomainFilePath = this._getSubdomainFilePath(subdomain);
            await $$.promisify(require("fs").unlink)(subdomainFilePath, JSON.stringify(subdomainJSON));

            callback();
        } catch (error) {
            callback(error);
        }
    }

    async getDomainValidators(callback) {
        callback = $$.makeSaneCallback(callback);
        try {
            const domainInfo = await this._getDomainInfoAsync();
            const validators = domainInfo ? domainInfo.validators : null;
            callback(validators);
        } catch (error) {
            callback(error);
        }
    }

    async addDomainValidator(validator, callback) {
        callback = $$.makeSaneCallback(callback);
        if (!validator) {
            return callback("Validator must be specified");
        }
        const { DID, URL } = validator;
        if (!DID || typeof DID !== "string") {
            return callback("Missing or invalid DID specified");
        }
        if (!URL || typeof URL !== "string") {
            return callback("Missing or invalid URL specified");
        }

        try {
            const domainInfo = await this._getDomainInfoAsync();
            const validators = domainInfo ? domainInfo.validators : [];

            const isValidatorDIDPresent = validators.some((validator) => validator.DID === DID);
            if (isValidatorDIDPresent) {
                console.log(`Validator DID ${DID} already present so skipping it...`);
                return callback();
            }

            const isValidatorURLPresent = validators.some((validator) => validator.URL === URL);
            if (isValidatorURLPresent) {
                console.log(`Validator URL ${URL} already present but for other validatorDID so skipping it...`);
                return callback();
            }

            validators.push({ DID, URL });
            const updatedDomainInfo = { ...domainInfo, validators };
            this.updateDomainInfo(updatedDomainInfo, callback);
        } catch (error) {
            callback(error);
        }
    }

    async _getDomainInfoAsync() {
        const domainFilePath = this._getDomainFilePath();

        const domainContent = await $$.promisify(require("fs").readFile)(domainFilePath);
        const domainJSON = JSON.parse(domainContent.toString());
        return domainJSON;
    }

    async _ensureSubdomainExists(subdomain) {
        const subdomainFilePath = this._getSubdomainFilePath(subdomain);
        const subdomainFileExists = await this._checkIfFileExists(subdomainFilePath);
        if (!subdomainFileExists) {
            throw `subdomain '${subdomain}' doesn't exist inside domain '${this.domain}'`;
        }
    }

    async _populateDomainAndSubdomainFilesIfMissing(configFolderPath) {
        const fs = require("fs");
        const path = require("path");
        const bdnsHostsPath = path.join(configFolderPath, "bdns.hosts");
        const bdnsHostsContent = await $$.promisify(fs.readFile)(bdnsHostsPath);
        const bdnsHosts = JSON.parse(bdnsHostsContent.toString());

        const domainFileExists = await this._checkIfFileExists(this._getDomainFilePath());
        if (!domainFileExists) {
            const domainConfig = bdnsHosts[this.domain] || {};
            await $$.promisify(this.updateDomainInfo)(domainConfig);
        }

        const bdnsDomains = Object.keys(bdnsHosts);
        const subdomainsForCurrentDomain = bdnsDomains.filter((name) => name.endsWith(`.${this.domain}`));
        for (let index = 0; index < subdomainsForCurrentDomain.length; index++) {
            const subdomain = subdomainsForCurrentDomain[index];
            const subdomainConfig = bdnsHosts[subdomain] || {};

            const subdomainFilePath = this._getSubdomainFilePath(subdomain);
            await this._writeConfigToFile(subdomainConfig, subdomainFilePath);
        }
    }

    _getDomainFilePath() {
        const domainFilePath = require("path").join(this.bdnsFolderPath, `${this.domain}.json`);
        return domainFilePath;
    }

    _getSubdomainFilePath(subdomain) {
        const subdomainFile = `${subdomain}.${this.domain}.json`;
        const subdomainFilePath = require("path").join(this.bdnsFolderPath, subdomainFile);
        return subdomainFilePath;
    }

    async _checkIfFileExists(filePath) {
        try {
            const fs = require("fs");
            await $$.promisify(fs.access)(filePath);
            return true;
        } catch (error) {
            return false;
        }
    }

    async _writeConfigToFile(config, filePath) {
        await $$.promisify(require("fs").writeFile)(filePath, JSON.stringify(config));
    }
}
