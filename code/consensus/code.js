class Consensus {
    constructor() {
        this.nouncesState = {};
    }

    describeMethods() {
        return {
            public: [
                "getNonce",
                "validateNonce",
                "proposeCommand",
                "getLatestState",
                "checkChangeStatus",
                "downloadCurrentState",
                "dumpHistory",
            ],
        };
    }

    getNonce(signerDID, callback) {
        if (!this.nouncesState[signerDID]) {
            this.nouncesState[signerDID] = { latest: 0, used: false };
        }

        // every time we are returning a nonce we increment the latest one and mark the used as false;
        // used will be marked as true when validating the nonce in order to not allow future validation for the same nonce
        this.nouncesState[signerDID].latest++;
        this.nouncesState[signerDID].used = false;

        const newNounce = this.nouncesState[signerDID].latest;
        callback(null, newNounce);
    }

    validateNonce(signerDID, nonce, callback) {
        if (!this.nouncesState[signerDID]) {
            return callback(null, nonce == 1);
        }

        const { latest, used } = this.nouncesState[signerDID];
        const isValid = latest == nonce && !used;

        // mark the latest nonce as used in order to not be used in the future
        if (isValid) {
            this.nouncesState[signerDID].used = true;
        }
        callback(null, isValid);
    }

    proposeCommand(command, callback) {
        // todo: add actual consensus logic
        setTimeout(() => {
            callback(null, true);
        }, 1000);
    }

    getLatestState() {}

    checkChangeStatus() {}

    downloadCurrentState() {}

    dumpHistory() {}
}
