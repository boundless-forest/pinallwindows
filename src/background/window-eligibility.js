import {
    COMPACT_WINDOW_MAX_HEIGHT,
    COMPACT_WINDOW_MAX_WIDTH,
    WINDOW_OBSERVATION_DELAYS_MS
} from "./constants.js";

export const WINDOW_STATUS_CANDIDATE = "candidate";
export const WINDOW_STATUS_ELIGIBLE = "eligible";
export const WINDOW_STATUS_EXCLUDED = "excluded";
export const WINDOW_STATUS_AMBIGUOUS = "ambiguous";
export const WINDOW_STATUS_CLOSED = "closed";

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isCompactWindow(win) {
    if (!Number.isFinite(win?.width) || !Number.isFinite(win?.height))
        return false;
    return win.width <= COMPACT_WINDOW_MAX_WIDTH &&
        win.height <= COMPACT_WINDOW_MAX_HEIGHT;
}

export function classifyWindowSnapshot(win) {
    if (!win)
        return WINDOW_STATUS_CLOSED;
    if (win.type !== "normal" || win.alwaysOnTop === true)
        return WINDOW_STATUS_EXCLUDED;
    // Chrome currently exposes picture-in-picture as a normal window. Treat any
    // compact window as ambiguous, even if an older build already copied tabs
    // into it. Prefer delayed sync over writing into a possible PiP.
    if (isCompactWindow(win))
        return WINDOW_STATUS_AMBIGUOUS;
    return WINDOW_STATUS_ELIGIBLE;
}

export class WindowEligibilityRegistry {
    constructor({
        getWindowWithTabs,
        observationDelaysMs = WINDOW_OBSERVATION_DELAYS_MS,
        waitFor = wait
    }) {
        this.getWindowWithTabs = getWindowWithTabs;
        this.observationDelaysMs = observationDelaysMs;
        this.waitFor = waitFor;
        this.records = new Map();
        this.observationsInFlight = new Map();
    }

    markCandidate(windowId) {
        if (typeof windowId !== "number")
            return;
        const current = this.records.get(windowId);
        if (current?.status === WINDOW_STATUS_ELIGIBLE)
            return;
        this.records.set(windowId, {
            windowId,
            status: WINDOW_STATUS_CANDIDATE,
            observations: []
        });
    }

    getStatus(windowId) {
        return this.records.get(windowId)?.status || WINDOW_STATUS_CANDIDATE;
    }

    forget(windowId) {
        this.records.delete(windowId);
        this.observationsInFlight.delete(windowId);
    }

    async observe(windowId) {
        const existing = this.observationsInFlight.get(windowId);
        if (existing)
            return existing;
        const observation = this.runObservation(windowId).finally(() => {
            this.observationsInFlight.delete(windowId);
        });
        this.observationsInFlight.set(windowId, observation);
        return observation;
    }

    async runObservation(windowId) {
        const prior = this.records.get(windowId);
        if (prior?.status === WINDOW_STATUS_ELIGIBLE)
            return this.revalidate(windowId);
        const observations = [];
        for (const delayMs of this.observationDelaysMs) {
            if (delayMs > 0)
                await this.waitFor(delayMs);
            const win = await this.getWindowWithTabs(windowId);
            const status = classifyWindowSnapshot(win);
            observations.push({ status, window: win });
            if (status === WINDOW_STATUS_CLOSED || status === WINDOW_STATUS_EXCLUDED)
                break;
        }
        const statuses = observations.map((item) => item.status);
        let status = WINDOW_STATUS_AMBIGUOUS;
        if (statuses.includes(WINDOW_STATUS_CLOSED))
            status = WINDOW_STATUS_CLOSED;
        else if (statuses.includes(WINDOW_STATUS_EXCLUDED))
            status = WINDOW_STATUS_EXCLUDED;
        else if (statuses.length === this.observationDelaysMs.length &&
            statuses.every((item) => item === WINDOW_STATUS_ELIGIBLE))
            status = WINDOW_STATUS_ELIGIBLE;
        const record = {
            windowId,
            status,
            observations,
            window: observations.at(-1)?.window || null
        };
        this.records.set(windowId, record);
        return record;
    }

    async revalidate(windowId) {
        const win = await this.getWindowWithTabs(windowId);
        const status = classifyWindowSnapshot(win);
        const record = {
            windowId,
            status,
            observations: [{ status, window: win }],
            window: win
        };
        this.records.set(windowId, record);
        return record;
    }
}
