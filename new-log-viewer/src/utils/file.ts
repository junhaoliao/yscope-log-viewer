type OnFileOpenCallback = (file: File) => void;

/**
 * Open a file and invokes the provided callback on the file.
 *
 * @param onOpen
 */
const openFile = (onOpen: OnFileOpenCallback) => {
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = (ev: Event) => {
        const target = ev.target as HTMLInputElement;
        const [file] = target.files as FileList;
        if ("undefined" === typeof file) {
            console.error("No file is selected");

            return;
        }
        onOpen(file);
    };
    input.click();
};

export {openFile};
export type {OnFileOpenCallback};