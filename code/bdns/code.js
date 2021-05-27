class Bdns {
    constructor() {}

    init(callback) {
        try {
            const fs = require("fs");
            const path = require("path");

            const domainRelativePath = this.domain.replace(/\./g, "/");
            this.domainFolderPath = path.join(this.rootFolder, "contracts/bdns", domainRelativePath);

            if (!fs.existsSync(this.domainFolderPath)) {
                fs.mkdirSync(this.domainFolderPath, { recursive: true });
            }
            callback();
        } catch (error) {
            console.log("error creating bdns folder", error);
            callback(error);
        }
    }

    describeMethods() {
        return {
            public: ["getSubdomains", "getSubdomainInfo"],
            requireNonce: ["addSubdomain", "updateSubdomainInfo", "deleteSubdomain"],
        };
    }

    async getSubdomains(callback) {
        try {
            const domainFiles = await $$.promisify(require("fs").readdir)(this.domainFolderPath, { withFileTypes: true });
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
            const subdomainFolderPath = require("path").dirname(subdomainFilePath);

            await $$.promisify(fs.mkdir)(subdomainFolderPath, { recursive: true });
            await $$.promisify(fs.writeFile)(subdomainFilePath, JSON.stringify({}));

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
            await $$.promisify(require("fs").writeFile)(subdomainFilePath, JSON.stringify(subdomainJSON));

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

    _getSubdomainFilePath(subdomain) {
        const path = require("path");
        const subdomainFilePath = path.join(this.domainFolderPath, subdomain, "config");
        return subdomainFilePath;
    }

    async _ensureSubdomainExists(subdomain) {
        const subdomainFolderPath = this._getSubdomainFilePath(subdomain);

        try {
            const fs = require("fs");
            await $$.promisify(fs.access)(subdomainFolderPath);
        } catch (error) {
            throw `subdomain '${subdomain}' doesn't exist inside domain '${this.domain}'`;
        }
    }
}
