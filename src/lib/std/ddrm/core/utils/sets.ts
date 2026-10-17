export function fSet<T>() {
    let collection: T[] = [];
    function getCollection() {
        return [...collection]
    }

    function set(key: T) {
        if (has(key)) return;
        collection.push(key)
    }

    function del(key: T) {
        return collection = collection.filter((v) => v !== key)
    }

    function _getIndex(idx: number) {
        const value = collection.find((v,i) => i === idx)
        const index = collection.findIndex((v,i) => i === idx)
        return {value, index}
    }

    function getIndex(idx: number) {
        return collection.find((v,i) => i === idx)
    }

    function _get(key: T) {
        const value = collection.find((v) => v === key)
        const index = collection.findIndex((v) => v === key)
        return {value, index}
    }

    function get(key: T) {
        return collection.find((v) => v === key)
    }

    function has(key: T) {
        return collection.includes(key)
    }

    const base = {
        collection: getCollection,
        set,
        get,
        has,
        del,
        getIndex,
        _get,
        _getIndex
    }
    const aliases = {
        all: getCollection,
        delete: del,
        getidx: getIndex,
        _getidx: _getIndex
    }

    return {
        ...base,
        ...aliases
    }
}

export function Set<T>() {
    let collection: T[] = [];
    function getCollection() {
        return [...collection]
    }

    function set(key: T) {
        if (has(key)) return;
        collection.push(key)
    }

    function del(key: T) {
        return collection = collection.filter((v) => v !== key)
    }

    function _getIndex(idx: number) {
        const value = collection.find((v,i) => i === idx)
        const index = collection.findIndex((v,i) => i === idx)
        return {value, index}
    }

    function getIndex(idx: number) {
        return collection.find((v,i) => i === idx)
    }

    function _get(key: T) {
        const value = collection.find((v) => v === key)
        const index = collection.findIndex((v) => v === key)
        return {value, index}
    }

    function get(key: T) {
        return collection.find((v) => v === key)
    }

    function has(key: T) {
        return collection.includes(key)
    }

    const base = {
        collection: getCollection,
        set,
        get,
        has,
        del,
        getIndex,
        _get,
        _getIndex
    }
    const aliases = {
        all: getCollection,
        delete: del,
        getidx: getIndex,
        _getidx: _getIndex
    }

    return {
        ...base,
        ...aliases
    }
}

export const uSet = fSet