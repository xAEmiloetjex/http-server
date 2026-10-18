import * as net from "node:net";
import * as zlib from 'zlib';

import { status2CodeNStr, EHTTPStatus } from "../shared/httpStatus";
export { EHTTPStatus, status2CodeNStr }

import { registerRoute, getRoute, Routes } from "./Methods";
import { IReq, IRes, IRouter } from "../Router_v3";
import { Logger } from "../shared/logger";

const MAX_REQUEST_SIZE = 1024 * 1024; // 1MB limit
const VALID_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS', 'PATCH'];
const appLogger = new Logger('HTTP_1.1/v4');

const confHeaders = ['custom-logger', 'serverside-force-content-length'];

function matchRoute(requestPath: string, routePath: string): { matches: boolean, params?: { [key: string]: string } } {
    const normalizedRequest = requestPath.replace(/\/$/, '');
    const normalizedRoute = routePath.replace(/\/$/, '');

    const requestParts = normalizedRequest.split('/');
    const routeParts = normalizedRoute.split('/');

    if (requestParts.length !== routeParts.length) return { matches: false };

    const params: { [key: string]: string } = {};
    for (let i = 0; i < routeParts.length; i++) {
        if (routeParts[i].startsWith(':')) {
            params[routeParts[i].slice(1)] = requestParts[i];
        } else if (routeParts[i] !== requestParts[i]) {
            return { matches: false };
        }
    }
    return { matches: true, params };
}

interface CORSOptions {
    origin?: string;
    methods?: string;
    credentials?: boolean;
    maxAge?: number;
    allowHeaders?: string;
}

export class RateLimiter {
    private requests: Map<string, number[]> = new Map();
    private readonly limit: number;
    private readonly window: number;

    constructor(limit: number = 100, windowMs: number = 60000) {
        this.limit = limit;
        this.window = windowMs;
    }

    isAllowed(ip: string): boolean {
        const now = Date.now();
        const timestamps = this.requests.get(ip) || [];
        const validTimestamps = timestamps.filter(time => now - time < this.window);

        if (validTimestamps.length >= this.limit) return false;

        validTimestamps.push(now);
        this.requests.set(ip, validTimestamps);
        return true;
    }
}

interface Middleware {
    handler: ((req: any, res: any, next: () => Promise<void>) => any) | IRouter;
    path?: string;
}

type TMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'PATCH' | 'ALL';

function parseCookies(cookieHeader: string): { [key: string]: string } {
    if (!cookieHeader) return Object.create(null);
    const cookies = Object.create(null);
    let start = 0;
    let end = 0;

    while ((end = cookieHeader.indexOf(';', start)) > -1) {
        const slice = cookieHeader.slice(start, end);
        const sep = slice.indexOf('=');
        if (sep > -1) {
            cookies[slice.slice(0, sep).trim()] = slice.slice(sep + 1).trim();
        }
        start = end + 1;
    }

    const slice = cookieHeader.slice(start);
    const sep = slice.indexOf('=');
    if (sep > -1) {
        cookies[slice.slice(0, sep).trim()] = slice.slice(sep + 1).trim();
    }
    return cookies;
}

// HANDMATIGE PROMISIFIED SOCKET WRITE VOOR CORRECTION RACING
function socketWriteAsync(socket: net.Socket, chunk: Buffer | string): Promise<void> {
    return new Promise((resolve) => {
        if (socket.write(chunk)) resolve();
        else socket.once('drain', resolve);
    });
}

export async function createWebServer(requestHandlers: IRequestHandler[], middlewares: Middleware[] = [], dontPreserveConfigHeaders = false) {
    const DPCH = dontPreserveConfigHeaders;
    const server = net.createServer();
    server.on("connection", handleConnection);

    if (!Array.isArray(requestHandlers)) {
        throw new Error("[Failed to register requestHandlers] Parameter is not an array");
    }

    for (const ReqHandler_ of requestHandlers) {
        const { route, status, handler, method } = ReqHandler_;
        const RespObj = status == undefined ? { status: false, handler, method } : { status, handler, method };
        registerRoute(method as any, route, RespObj);
    }

    if (!Routes.has("*") && !Routes.has("fallback")) {
        registerRoute('ALL', '*', {
            status: EHTTPStatus.NOT_FOUND,
            handler: async function (req, res) {
                res.setHeader("Content-Type", "text/plain");
                res.setHeader("serverside-force-content-length", "true");
                res.setStatus(404);
                await res.end(`CANNOT GET '${req.url}', RETURNED 404`);
            },
            method: "ALL"
        });
    }

    const fallback = Routes.has("*") ? await getRoute('ALL', '*') : await getRoute('ALL', 'fallback');

    async function handleConnection(socket: net.Socket): Promise<void> {
        socket.on('error', (err) => {
            console.error('[Socket Error]:', err);
            socket.destroy();
        });

        // DE STATE MACHINE PER SOCKET - ESSENTIEEL VOOR LIVE KEEP-ALIVE
        let reqBuffer = Buffer.alloc(0);
        let expectedBodyLength: number | undefined = undefined;
        let isChunkedRequest = false;
        let marker = -1;

        // RESET FUNCTIE: Wist de buffers, behoudt de TCP verbinding voor de volgende request
        const resetSocketState = () => {
            if (marker !== -1) {
                const totalRequestLength = marker + 4 + (expectedBodyLength ?? 0);
                reqBuffer = reqBuffer.subarray(totalRequestLength); // Bewaar eventuele gepipelinete data!
            } else {
                reqBuffer = Buffer.alloc(0);
            }
            expectedBodyLength = undefined;
            isChunkedRequest = false;
            marker = -1;
        };

        socket.on("data", async (buf: Buffer) => {
            if (reqBuffer.length + buf.length > MAX_REQUEST_SIZE) {
                await socketWriteAsync(socket, 'HTTP/1.1 413 Payload Too Large\r\n\r\n');
                socket.end();
                return;
            }

            reqBuffer = Buffer.concat([reqBuffer, buf]);

            if (marker === -1) {
                marker = reqBuffer.indexOf("\r\n\r\n");
                if (marker === -1) return; // Header nog niet compleet, wacht op meer data
            }

            // Parse Content-Length eenmalig zodra de headers binnen zijn
            if (expectedBodyLength === undefined && !isChunkedRequest) {
                const headerBlock = reqBuffer.slice(0, marker).toString();
                const contentLengthMatch = headerBlock.match(/content-length:\s*(\d+)/i);
                if (contentLengthMatch) {
                    expectedBodyLength = parseInt(contentLengthMatch[1], 10);
                }
                if (headerBlock.toLowerCase().includes("transfer-encoding: chunked")) {
                    isChunkedRequest = true;
                }
            }

            const body = reqBuffer.subarray(marker + 4);
            if (isChunkedRequest) {
                // Simpele HTTP/1.1 chunked validation loop
                if (!body.toString().endsWith("\r\n0\r\n\r\n")) return;
            } else if (body.length < (expectedBodyLength ?? 0)) {
                return; // Body nog niet compleet, wacht op meer data
            }

            // --- BRUTE PROTOCOL PARSING START ---
            const headerLines = reqBuffer.slice(0, marker).toString().split("\r\n");
            const reqLine = headerLines.shift().split(" ");

            if (reqLine.length !== 3 || !reqLine[2].startsWith('HTTP/')) {
                await socketWriteAsync(socket, 'HTTP/1.1 400 Bad Request\r\n\r\n');
                resetSocketState();
                return;
            }

            if (!VALID_METHODS.includes(reqLine[0])) {
                await socketWriteAsync(socket, 'HTTP/1.1 405 Method Not Allowed\r\n\r\n');
                resetSocketState();
                return;
            }

            // LINEAIRE O(1) MUTATIE LOOP VOOR HEADERS - BYPASSING THE SLOW REDUCE SPREAD HACK
            const headers = Object.create(null);
            for (let i = 0; i < headerLines.length; i++) {
                const line = headerLines[i];
                const sep = line.indexOf(":");
                if (sep === -1) continue;
                headers[line.slice(0, sep).trim().toLowerCase()] = line.slice(sep + 1).trim();
            }

            // Query String optimalisatie
            const rawUrl = reqLine[1];
            const queryIdx = rawUrl.indexOf('?');
            const cleanUrl = queryIdx === -1 ? rawUrl : rawUrl.slice(0, queryIdx);
            const queries = Object.create(null);
            if (queryIdx !== -1) {
                const queryStr = rawUrl.slice(queryIdx + 1);
                const pairs = queryStr.split('&');
                for (let i = 0; i < pairs.length; i++) {
                    const sep = pairs[i].indexOf('=');
                    if (sep !== -1) queries[pairs[i].slice(0, sep)] = pairs[i].slice(sep + 1);
                }
            }

            const request: IReq = {
                method: reqLine[0] as TMethod,
                url: cleanUrl,
                queries,
                params: {},
                httpVersion: reqLine[2].split("/")[1],
                headers,
                body: body.subarray(0, expectedBodyLength ?? body.length).toString(),
                socket,
                cookies: () => parseCookies(headers['cookie'] || ''),
            };

            const stat_ok = status2CodeNStr(200);
            let status = stat_ok.code;
            let statusText = stat_ok.status;
            let headersSent = false;
            let isChunked = false;

            const responseHeaders: Record<string, string | number> = { server: "DDRM_NETLIB_HTTP.js" };
            const hiddenHeaders: Record<string, string | number> = {};

            function setHeader(key: string, value: string | number) {
                if (DPCH && confHeaders.includes(key)) hiddenHeaders[key.toLowerCase()] = value;
                else responseHeaders[key.toLowerCase()] = value;
            }

            function sendHeaders() {
                if (!headersSent) {
                    headersSent = true;
                    response.headersSent = true;
                    setHeader("date", new Date().toUTCString());
                    socket.write(`HTTP/1.1 ${status} ${statusText}\r\n`);
                    for (const key of Object.keys(responseHeaders)) {
                        socket.write(`${key}: ${responseHeaders[key]}\r\n`);
                    }
                    socket.write(`\r\n`); // Sluit de header-sectie netjes af
                }
            }

            const response: IRes = {
                headersSent: false,

                async write(chunk) {
                    const bufChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk || '');
                    if (!headersSent) {
                        if (responseHeaders["serverside-force-content-length"] == "true" || hiddenHeaders['serverside-force-content-length'] == 'true') {
                            setHeader("content-length", bufChunk ? bufChunk.length : 0);
                        } else if (!responseHeaders["content-length"]) {
                            isChunked = true;
                            setHeader("transfer-encoding", "chunked");
                        }
                        sendHeaders();
                    }
                    if (isChunked) {
                        const size = bufChunk.length.toString(16);
                        await socketWriteAsync(socket, `${ size }\r\n`);
                        await socketWriteAsync(socket, bufChunk);
                        await socketWriteAsync(socket, "\r\n");
                    } else {
                        await socketWriteAsync(socket, bufChunk);
                    }
                },
                async end(chunk) {
                    const bufChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk || '');
                    if (!headersSent) {
                        if (!responseHeaders["content-length"]) {
                            setHeader("content-length", bufChunk ? bufChunk.length : 0);
                        }
                        sendHeaders();
                    }
                    if (isChunked) {
                        if (bufChunk.length > 0) {
                            const size = bufChunk.length.toString(16);
                            await socketWriteAsync(socket, `${ size }\r\n`);
                            await socketWriteAsync(socket, bufChunk);
                            await socketWriteAsync(socket, "\r\n");
                        }
                        await socketWriteAsync(socket, `0\r\n\r\n`);
                    } else {
                        if (bufChunk.length > 0) await socketWriteAsync(socket, bufChunk);
                    }
                    // BELANGRIJKSTE MODIFICATIE: Sockets niet sluiten! Resets de buffers voor Keep-Alive
                    resetSocketState();
                },
                setHeader,
                setStatus(newStatus: EHTTPStatus | number | string) {
                    const stat_ = status2CodeNStr(newStatus);
                    status = stat_.code;
                    statusText = stat_.status;
                },
                async json(data) {
                    if (headersSent) throw new Error("Headers are already sent, cannot send JSON");
                    const json = Buffer.from(JSON.stringify(data));
                    setHeader("content-type", "application/json; charset=utf-8");
                    setHeader("content-length", json.length);
                    sendHeaders();
                    await socketWriteAsync(socket, json);
                    resetSocketState(); // Reset de status direct na de JSON end
                },
                setCORS(options: CORSOptions = {}) {
                    const { origin = '*', methods = 'GET,HEAD,PUT,PATCH,POST,DELETE', credentials = false, maxAge = 86400, allowHeaders = 'Content-Type,Authorization' } = options;
                    setHeader('Access-Control-Allow-Origin', origin);
                    setHeader('Access-Control-Allow-Methods', methods);
                    if (credentials) setHeader('Access-Control-Allow-Credentials', 'true');
                    setHeader('Access-Control-Max-Age', maxAge);
                    setHeader('Access-Control-Allow-Headers', allowHeaders);
                },
                setSecurityHeaders() {
                    setHeader('X-Content-Type-Options', 'nosniff');
                    setHeader('X-Frame-Options', 'DENY');
                    setHeader('X-XSS-Protection', '1; mode=block');
                    setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
                    setHeader('Content-Security-Policy', "default-src 'self'");
                },
                async compress(data: Buffer | string) {
                    const acceptEncoding = request.headers['accept-encoding'] || '';
                    const bufData = Buffer.isBuffer(data) ? data : Buffer.from(data);
                    if (acceptEncoding.includes('gzip')) {
                        setHeader('Content-Encoding', 'gzip');
                        return zlib.gzipSync(bufData);
                    } else if (acceptEncoding.includes('deflate')) {
                        setHeader('Content-Encoding', 'deflate');
                        return zlib.deflateSync(bufData);
                    }
                    return bufData;
                }
            };
            const stack: any[] = [];
            middlewares.forEach(mw => {
                if (typeof mw.handler === 'function') {
                    stack.push({ path: '/', handler: mw.handler });
                }
            });
            middlewares.forEach(mw => {
                if ('routes' in mw.handler) {
                    stack.push({ path: mw.path || '/', handler: mw.handler });
                }
            });
            let currentMiddlewareIndex = 0;
            const next = async (err?: Error) => {
                if (currentMiddlewareIndex < stack.length) {
                    const middleware = stack[currentMiddlewareIndex];
                    currentMiddlewareIndex++;
                    try {
                        await processMiddleware(middleware, request, response, next);
                    } catch (err: any) {
                        if (err.code !== 'ERR_STREAM_WRITE_AFTER_END') throw err;
                        return;
                    }
                } else {
                    try {
                        let matchedRoute = false;
                        for (const [route] of Routes.entries()) {
                            if (response.headersSent) break;
                            const match = matchRoute(request.url, route);
                            if (match.matches) {
                                const r_ = await getRoute(request.method, route);
                                if (r_ != null) {
                                    request.params = match.params;
                                    await r_.handler(request, response);
                                    matchedRoute = true;
                                    break;
                                }
                            }
                        }
                        if (!matchedRoute && !response.headersSent) {
                            await fallback.handler(request, response);
                        }
                    } catch (err: any) {
                        if (err.code !== 'ERR_STREAM_WRITE_AFTER_END') throw err;
                    }
                }
            };
            await next();
        });
    }
    return {
        listen: (port: number, cb: (port: number, _: net.Server) => void) =>
            cb(port, server.listen(port)),
    };
}
// REST VAN DE PROCESMIDDLEWARE LOGICA BLIJFT GELIJK MAAR PROMISIFIED GEOPTIMALISEERD
async function processMiddleware(middleware: { handler: any, path?: string }, request: IReq, response: IRes, next: () => Promise<any>) {
    if ('routes' in middleware.handler) {
        const routerBase = middleware.path || '/';
        if (request.url.startsWith(routerBase)) {
            try {
                if (middleware.handler.middlewares) {
                    for (const mw of middleware.handler.middlewares) {
                        if (response.headersSent) break;
                        if (typeof mw.handler === 'function') {
                            await new Promise((resolve) => {
                                mw.handler(request, response, () => { resolve(''); });
                            });
                        } else if ('routes' in mw.handler) {
                            await processMiddleware(mw, request, response, () => Promise.resolve());
                        }
                    }
                }
                if (response.headersSent) return;
                const relativeUrl = request.url.slice(routerBase.length) || '/';
                const fullRequestPath = routerBase + relativeUrl;
                const nestedRoutes = middleware.handler.routes.filter((r: any) => 'use' in r.handler);
                for (const route of nestedRoutes) {
                    const routePath = `${ routerBase }${ route.route }`;
                    if (request.url.startsWith(routePath)) {
                        const nestedRouter = { handler: new route.handler(middleware.handler), path: routePath };
                        await processMiddleware(nestedRouter, request, response, next);
                        return;
                    }
                }
                const regularRoutes = middleware.handler.routes.filter((r: any) => !('use' in r.handler));
                for (const route of regularRoutes) {
                    if (response.headersSent) break;
                    const match = matchRoute(fullRequestPath, route.route);
                    if (match.matches && (route.method === request.method || route.method === 'ALL')) {
                        request.params = match.params;
                        try {
                            await route.handler(request, response);
                            break;
                        } catch (err: any) {
                            if (err.code !== 'ERR_STREAM_WRITE_AFTER_END') throw err;
                            return;
                        }
                    }
                }
                if (!response.headersSent) await next();
            } catch (err) {
                if (!response.headersSent) await next();
            }
        } else {
            if (!response.headersSent) await next();
        }
    } else if (typeof middleware.handler === 'function') {
        try {
            if (!response.headersSent) await middleware.handler(request, response, next);
        } catch (err: any) {
            if (err.code !== 'ERR_STREAM_WRITE_AFTER_END') throw err;
        }
    } else if (!response.headersSent) {
        await next();
    }
}