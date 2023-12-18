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
            logData: "page",
        });
        this.logData = this.table("logData");
    }

    /**
     * Reads page data from the database.
     *
     * @param {number} page
     * @return {Promise<unknown>}
     */
    getPage (page) {
        return new Promise(async (resolve, reject) => {
            this.logData.get({page: page}).then((data) => {
                resolve(data);
            }).catch((reason) => {
                console.log(reason);
                reject(new Error(reason));
            });
        });
    }

    /**
     * Adds page data to the database.
     *
     * @param {number} page
     * @param {string} data
     * @return {Promise<unknown>}
     */
    addPage (page, data) {
        return new Promise(async (resolve, reject) => {
            this.logData.add(
                {
                    page: page,
                    data: data,
                }
            ).then(() => {
                resolve(true);
            }).catch((e) => {
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
            }).catch((e) => {
                reject(new Error(e));
            });
        });
    }
}

export default Database;
