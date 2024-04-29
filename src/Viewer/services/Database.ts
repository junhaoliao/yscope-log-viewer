import Dexie from "dexie";


interface ILogData {
    pageNum: number,
    data: string
}

/**
 * Database class that wraps all indexedDB functions.
 *
 */
class Database extends Dexie {
    logData!: Dexie.Table<ILogData, number>;

    /**
     * Initializes the database connection.
     *
     * @param databaseName
     */
    constructor (databaseName: string) {
        super(databaseName);
        this.version(1).stores({
            logData: "&pageNum",
        });
    }

    /**
     * Reads page data from the database.
     *
     * @param pageNum
     */
    getPage (pageNum: number): Promise<string> {
        return new Promise((resolve, reject) => {
            this.logData.get({pageNum})
                .then((page) => {
                    if ("undefined" === typeof page) {
                        reject(new Error(`Page ${pageNum} not found in IndexedDB table`));

                        return;
                    }
                    resolve((page).data);
                })
                .catch((reason: unknown) => {
                    console.log(reason);
                    reject(new Error(reason as string));
                });
        });
    }

    /**
     * Adds page data to the database.
     *
     * @param pageNum
     * @param data
     */
    addPage (pageNum: number, data: string): Promise<number> {
        return this.logData.add({
            pageNum: pageNum,
            data: data,
        });
    }

    /**
     * Returns the number of decoded pages to the database.
     */
    getNumberOfPages (): Promise<number> {
        return this.logData.count();
    }
}

export default Database;
