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
            console.log('bdnsFolderPath', this.bdnsFolderPath)

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
            safe: ["getDomainInfo", "getSubdomains", "getSubdomainInfo"],
            nonced: ["updateDomainInfo", "addSubdomain", "updateSubdomainInfo", "deleteSubdomain"],
        };
    }

    async getDomainInfo(callback) {
        try {
            const domainFilePath = this._getDomainFilePath();

            const domainContent = await $$.promisify(require("fs").readFile)(domainFilePath);
            const domainJSON = JSON.parse(domainContent);

            callback(null, domainJSON);
        } catch (error) {
            callback(error);
        }
    }

    async updateDomainInfo(domainJSON, callback) {
        try {
            const domainFilePath = this._getDomainFilePath();
            await this._writeConfigToFile(domainJSON, domainFilePath);

            callback();
        } catch (error) {
            callback(error);
        }
    }

    async getSubdomains(callback) {
        try {
            const domainFiles = await $$.promisify(require("fs").readdir)(this.bdnsFolderPath, { withFileTypes: true });
            const subdomains = domainFiles.filter((file) => file.isDirectory()).map((file) => file.name);
            callback(null, subdomains);
        } catch (error) {
            callback(error);
        }
    }

    async addSubdomain(subdomain, callback) {
        const fs = require("fs");
        const subdomainFilePath = this._getSubdomainFilePath(subdomain);

        try {
            await $$.promisify(fs.access)(subdomainFilePath);
            return callback(`subdomain '${subdomain}' already exists inside domain '${domain}'`);
        } catch (error) {
            // the subdomain doesn't exist
        }

        try {
            const subbdnsFolderPath = require("path").dirname(subdomainFilePath);

            await $$.promisify(fs.mkdir)(subbdnsFolderPath, { recursive: true });
            await this._writeConfigToFile({}, subdomainFilePath);

            callback();
        } catch (error) {
            callback(error);
        }
    }

    async getSubdomainInfo(subdomain, callback) {
        try {
            await this._ensureSubdomainExists(subdomain);

            const subdomainFilePath = this._getSubdomainFilePath(subdomain);
            const subdomainContent = await $$.promisify(require("fs").readFile)(subdomainFilePath);
            const subdomainJSON = JSON.parse(subdomainContent);

            callback(null, subdomainJSON);
        } catch (error) {
            callback(error);
        }
    }

    async updateSubdomainInfo(subdomain, subdomainJSON, callback) {
        try {
            await this._ensureSubdomainExists(subdomain);

            const subdomainFilePath = this._getSubdomainFilePath(subdomain);
            await this._writeConfigToFile(subdomainJSON, subdomainFilePath);

            callback();
        } catch (error) {
            callback(error);
        }
    }

    async deleteSubdomain(subdomain) {
        try {
            await this._ensureSubdomainExists(subdomain);

            const subdomainFilePath = this._getSubdomainFilePath(subdomain);
            await $$.promisify(require("fs").unlink)(subdomainFilePath, JSON.stringify(subdomainJSON));

            callback();
        } catch (error) {
            callback(error);
        }
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
        const bdnsHosts = JSON.parse(bdnsHostsContent);

        const domainFileExists = await this._checkIfFileExists(this._getDomainFilePath);
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
        const subdomainFile = `${subdomain}.${this.domain}`;
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
