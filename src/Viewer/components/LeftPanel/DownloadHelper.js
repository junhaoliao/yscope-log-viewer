import {
    getAbsoluteUrl,
    getFilePathFromWindowLocation,
} from "../../services/utils";


const downloadBlob = (blob, databaseName) => {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = databaseName.split(".")[0] + ".log";
    link.click();
};

const BlobAppender = function () {
    let blob = new Blob([], {type: "text"});
    this.append = function (src) {
        blob = new Blob([blob, src], {type: "text"});
    };
    this.getBlob = function () {
        return blob;
    };
};

const downloadCompressedFile = () => {
    const link = document.createElement("a");

    // this opens the link in a new tab,
    //  which avoids interruption of uncompressed logs download
    link.target = "_blank";

    const filePath = getFilePathFromWindowLocation();
    link.href = getAbsoluteUrl(filePath);
    link.click();
};

export {BlobAppender, downloadBlob, downloadCompressedFile};
