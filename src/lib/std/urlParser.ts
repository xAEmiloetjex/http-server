export const url: string = String(window.location.href);
export const urlOrigin: string = String(window.location.origin);
export const urlPath: string = url.replace(urlOrigin, '');

export function parsePath(): string {
    const url_ = urlPath;
    const path = url_.split("?")[0];
    if (path === undefined) return "/";
    else return path;
}

export function parseQueries(): {[key:string]: string} {
    const url_ = urlPath;
    const QueryLine = url_.split("?")[1];
    if (QueryLine === undefined) return {};

    const queries = QueryLine.split("&");
    let keyval_store: {[key:string]: string} = {};

    for (const query of queries) {
        const [key, val] = query.split("=");
        keyval_store[key] = val;
    }

    return keyval_store;
}