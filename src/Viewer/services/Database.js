import Dexie from "dexie";


/**
 * Database class that wraps all indexedDB functions.
 *
 */
class Database extends Dexie {
    /**
     * Initializes the database connection.
     *
     * @param {string} fileName Name of database.
     */
    constructor (fileName) {
        super(fileName);
        this.version(1).stores({
            logData: "pageNum, data",
        });
        this.logData = this.table("logData");
    }

    /**
     * Reads page data from the database.
     *
     * @param {number} pageNum
     * @param pageNum
     * @return {Promise<unknown>}
     */
    getPage (pageNum) {
        return new Promise(async (resolve, reject) => {
            this.logData.get({pageNum: pageNum}).then((data) => {
                resolve(data);
            })
                .catch((reason) => {
                    console.log(reason);
                    reject(new Error(reason));
                });
        });
    }

    /**
     * Adds page data to the database.
     *
     * @param {number} pageNum
     * @param {string} data
     * @return {Promise<unknown>}
     */
    addPage (pageNum, data) {
        return new Promise(async (resolve, reject) => {
            this.logData.add(
                {
                    pageNum: pageNum,
                    data: data,
                }
            ).then(() => {
                resolve(true);
            })
                .catch((e) => {
                    reject(new Error(e));
                });
        });
    }

    /**
     * Returns the number of decoded pages to the database.
     *
     * @return {Promise<unknown>}
     */
    getNumberOfPages () {
        return new Promise(async (resolve, reject) => {
            this.logData.count().then((number) => {
                resolve(number);
            })
                .catch((e) => {
                    reject(new Error(e));
                });
        });
    }
}

export default Database;
