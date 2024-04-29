import Database from "../../services/Database";
import DOWNLOAD_WORKER_ACTION from "./DOWNLOAD_WORKER_ACTION";


let db = null;
let totalCount;

/**
 *
 */
const getCount = () => {
    return new Promise((resolve) => {
        db.getNumberOfPages().then((count) => {
            resolve(count);
        })
            .catch(() => {
                resolve(false);
            });
    });
};

/**
 *
 */
const isDecodingDone = () => {
    getCount().then((count) => {
        if (count < totalCount) {
            postMessage({
                code: DOWNLOAD_WORKER_ACTION.progress,
                progress: (count / totalCount) * 90,
                done: false,
            });
            setTimeout(isDecodingDone, 100);
        } else {
            postMessage({
                code: DOWNLOAD_WORKER_ACTION.progress,
                progress: 90,
                done: true,
            });
        }
    });
};

/**
 *
 * @param ev
 */
onmessage = function (ev) {
    const msg = ev.data;

    switch (msg.code) {
        case DOWNLOAD_WORKER_ACTION.initialize:
            db = new Database(ev.data.sessionId);
            totalCount = ev.data.count;
            isDecodingDone();
            break;
        case DOWNLOAD_WORKER_ACTION.pageData:
            db.getPage(ev.data.pageNum)
                .then((data) => {
                    postMessage({
                        code: DOWNLOAD_WORKER_ACTION.pageData,
                        data: data,
                        pageNum: ev.data.pageNum,
                    });
                })
                .catch((error) => {
                    postMessage({
                        code: DOWNLOAD_WORKER_ACTION.error,
                        error: new Error(error.reason),
                    });
                });
            break;
        case DOWNLOAD_WORKER_ACTION.clearDatabase:
            db.delete()
                .then(() => {
                    postMessage({
                        code: DOWNLOAD_WORKER_ACTION.clearDatabase,
                        success: true,
                    });
                })
                .catch(() => {
                    postMessage({
                        code: DOWNLOAD_WORKER_ACTION.clearDatabase,
                        success: false,
                    });
                });
            break;
        default:
            break;
    }
};
