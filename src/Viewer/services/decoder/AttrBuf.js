import AbstractBuf from "./AbstractBuf";

class AttrBuf {
    static ATTR_NONE = 0;
    static ATTR_INT = 1;
    static ATTR_STR = 2;
    static TEXT_DECODER = new TextDecoder();

    constructor () {
        this._value = null;
        this._type = AttrBuf.ATTR_NONE;
    }

    set_int_val(val) {
        this._value = val;
        this._type = AttrBuf.ATTR_INT;
    }

    is_int_val() {
        return (AttrBuf.ATTR_INT === this._type);
    }

    get_int_val() {
        if (false === this.is_int_val()) {
            return null;
        }
        return this._value;
    }

    set_str_val(val) {
        this._value = val;
        this._type = AttrBuf.ATTR_STR;
    }

    set_str_val_from_stream(stream, length) {
        this._value = stream.readFully(length);
        this._type = AttrBuf.ATTR_STR;
    }

    is_str_val() {
        return (AttrBuf.ATTR_STR === this._type);
    }

    get_str_val() {
        if (false === this.is_str_val()) {
            return null;
        }
        return AttrBuf.TEXT_DECODER.decode(this._value);
    }

    is_null_val() {
        return (AttrBuf.ATTR_NONE === this._type);
    }

    set_null() {
        this._type = AttrBuf.ATTR_NONE;
        this._value = null;
    }
}

export default AttrBuf;
