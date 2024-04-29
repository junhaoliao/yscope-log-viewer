/**
 * Provides access to a pool of workers which can be used to execute tasks.
 * Currently, only supports decode worker but will be extended for search.
 */
class WorkerPool {
    /**
     * Initialize the queue and an array to hold the workers.
     */
    constructor () {
        this.taskQueue = [];
        this._maxNumOfWorkers = 4;

        this._workerPool = new Array(this._maxNumOfWorkers);
        this._workerPool.fill(null);
    }

    /**
     * Returns a worker if there is a free slot in the pool.
     *
     * @return {null|Worker}
     */
    getWorker () {
        for (const index in this._workerPool) {
            if (null === this._workerPool[index]) {
                this._workerPool[index] = new Worker(
                    new URL("./decoder/decodeWorker.js", import.meta.url)
                );
                return this._workerPool[index];
            }
        }
        return null;
    }

    /**
     * Frees a provided worker from the pool.
     *
     * @param {Worker} _worker
     */
    freeWorker (_worker) {
        for (const index in this._workerPool) {
            if (this._workerPool[index] === _worker) {
                this._workerPool[index].terminate();
                this._workerPool[index] = null;
                break;
            }
        }
    }

    /**
     * Process queue by assigning tasks to workers.
     */
    processQueue () {
        if (this.taskQueue.length > 0) {
            const worker = this.getWorker();
            if (worker) {
                const task = this.taskQueue.shift();
                if (null === task.pageLogs) {
                    worker.postMessage(task, [task.inputStream]);
                } else {
                    // FIXME: dirty hack to get download working
                    worker.postMessage(task);
                }
                worker.onmessage = () => {
                    this.freeWorker(worker);
                    this.processQueue();
                };
                console.debug(`Started worker to load page ${task.pageNum}`);
            }
        }
    }

    /**
     * Added a task to the queue and process the queue.
     * @param {object} task
     */
    assignTask (task) {
        this.taskQueue.push(task);
        this.processQueue();
    }

    /**
     * Clear the worker pool.
     */
    clearPool () {
        this.taskQueue = [];
        for (const index in this._workerPool) {
            if (this._workerPool[index]) {
                this._workerPool[index].terminate();
                this._workerPool[index] = null;
            }
        }
    }
}

export default WorkerPool;
