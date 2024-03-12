import Database from "../../services/Database";
import DOWNLOAD_WORKER_ACTION from "./DOWNLOAD_WORKER_ACTION";

let db = null;
let totalCount;

const getCount = () => {
    return new Promise((resolve) => {
        db.getNumberOfPages().then((count) => {
            resolve(count);
        }).catch(() => {
            resolve(false);
        });
    });
};

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

onmessage = function (e) {
    const msg = e.data;

    switch (msg.code) {
        case DOWNLOAD_WORKER_ACTION.initialize:
            db = new Database(e.data.sessionId);
            totalCount = e.data.count;
            isDecodingDone();
            break;
        case DOWNLOAD_WORKER_ACTION.pageData:
            db.getPage(e.data.page).then((data) => {
                if (undefined === data) {
                    postMessage({
                        code: DOWNLOAD_WORKER_ACTION.error,
                        error: new Error("Page data was not loaded."),
                    });
                } else {
                    postMessage({
                        code: DOWNLOAD_WORKER_ACTION.pageData,
                        data: data.data,
                        page: e.data.page,
                    });
                }
            }).catch((e) => {
                postMessage({
                    code: DOWNLOAD_WORKER_ACTION.error,
                    error: new Error(e.reason),
                });
            });
            break;
        case DOWNLOAD_WORKER_ACTION.clearDatabase:
            db.delete().then(() => {
                postMessage({
                    code: DOWNLOAD_WORKER_ACTION.clearDatabase,
                    success: true,
                });
            }).catch(() => {
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
