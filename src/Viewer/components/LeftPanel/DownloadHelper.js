import {getFilePathFromWindowLocation} from "../../services/utils";

const downloadBlob = (blob, databaseName) => {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = databaseName.split(".")[0] + ".log";
    document.body.appendChild(link);
    link.dispatchEvent(
        new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
            view: window,
        })
    );
    document.body.removeChild(link);
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
    try {
        // this URL constructor should only succeed if "filePath"
        //  has a "protocol" scheme like "http:"
        new URL(filePath);
        link.href = filePath;
    } catch (e) {
        console.log(`Unable to construct URL object from "${filePath}": ${e}. 
        Assuming the file is from current origin. `);
        link.href = window.location.origin + "/" + filePath;
    }

    console.log(link);
    link.click();
};

export {BlobAppender, downloadBlob, downloadCompressedFile};
