const DEFAULT_DIAGNOSTIC_LIMIT = 100;

export class SyncDiagnostics {
    constructor({ now = Date.now, limit = DEFAULT_DIAGNOSTIC_LIMIT } = {}) {
        this.now = now;
        this.limit = limit;
        this.entries = [];
    }

    record(type, details = {}) {
        this.entries.push({
            timestamp: this.now(),
            type,
            ...details
        });
        if (this.entries.length > this.limit) {
            this.entries.splice(0, this.entries.length - this.limit);
        }
    }

    getEntries() {
        return this.entries.map((entry) => ({ ...entry }));
    }
}
