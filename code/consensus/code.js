class Anchoring {
    constructor() {}

    allowExecution(isLocalCall, methodName, args) {
        return true;
    }

    canExecuteImmediately(isLocalCall, methodName, args) {
        return true;
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
