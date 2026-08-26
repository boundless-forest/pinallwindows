export class AsyncTaskQueue {
    constructor(onError = console.error) {
        this.tail = Promise.resolve();
        this.onError = onError;
    }

    enqueue(label, task) {
        const run = this.tail.then(task);
        this.tail = run.catch((error) => {
            this.onError("TabSpan: queued task failed", { label, error });
        });
        return run;
    }

    whenIdle() {
        return this.tail;
    }
}
