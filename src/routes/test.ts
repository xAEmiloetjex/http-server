import { RateLimiter } from "../lib/HTTP_1.1/V4";
import Router, { IReq, IRes, IRouter, RouterClass } from "../lib/Router_v3";
import fmt from "../lib/fmt";
import { Logger } from "../lib/shared/logger";
import { EHTTPStatus, status2CodeNStr } from "../lib/HTTP_Server";
import API_Test from "./subroutes/api/test";
import Recursion from "./subroutes/api/recursion";
import { Spaces, Vec } from "../lib/std/vector";
import { DUMP_CONF } from "../lib/memlog";

const logger = new Logger('APIRouter');

const APIRateLimiter = new RateLimiter(1,1000)
// const APIRateLimiter = new RateLimiter(1, 60000)


export default class Test {
    public router: IRouter;

    constructor(R: IRouter) {
        this.router = R;

        this.router.use(async (req: IReq, res: IRes, next: () => Promise<void>) => {
            await this.corsMiddleware(req, res, next);
        });

        this.router.use(async (req: IReq, res: IRes, next: () => Promise<void>) => {
            await this.RateLimiter(req, res, next);
        });

        // this.router.use(async (req: IReq, res: IRes, next: () => Promise<void>) => {
        //     console.log('/api');
        //     await next();
        // });

        // Error handling
        this.router.setErrorHandler(this.handleError);

        // Initialize routes
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.use('/test', API_Test)
        // this.router.use('/recursion', Recursion)
        this.router.get('/vectest', this.VecTest);
    }
    private async RateLimiter(req: IReq, res: IRes, next: Function): Promise<void> {
        const doFunnyNumber: boolean = true

        if (req.url.startsWith("/tests")) {
            await res.setHeader('x-api', 'true')


            let responseCode = EHTTPStatus.TOO_MANY_REQUESTS
            if (doFunnyNumber === true) responseCode = EHTTPStatus.KEEP_YOUR_CALM


            const clientIP = req.socket.remoteAddress;
            if (!APIRateLimiter.isAllowed(clientIP)) {
                await res.setHeader('Content-Type', 'application/json');
                await res.setStatus(responseCode)
                await res.end(JSON.stringify({
                    code: status2CodeNStr(responseCode),
                    error: 'You\'re timed-out because you are sending too many requests :!'
                }))
            }

            await next()
        }
        else next()
    }
    private async corsMiddleware(req: IReq, res: IRes, next: Function): Promise<void> {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
            await res.setStatus(EHTTPStatus.OK)
            await res.end({});
            return;
        }

        await next();
    }

    private async handleError(req: IReq, res: IRes, err?: Error,): Promise<void> {
        logger.error(`API Error: ${err.message}`);

        const { code, status, EHTTPStatus_val } = status2CodeNStr(EHTTPStatus.INTERNAL_SERVER_ERROR);
        await res.setHeader('content-type', 'application/json')
        await res.setStatus(code)
        await res.end(JSON.stringify({
            error: {
                code,
                status: status,
                message: err ? err.message : 'Internal Server Error'
            }
        }))
    }

    private async VecTest(req: IReq, res: IRes): Promise<void>
    {
        // console.log(this.VecTestMap)

        const TestMap = {
            0: 'enabled',
            1: 'mode',
            2: 'location',
            3: 'padding',
            4: 'heap_enabled'
        };
        const v = DUMP_CONF.clone()
            .allowUnsafe()
            .mut()
            .setSpace(Spaces.CUSTOM)
            .setCustomMap(TestMap);

        await res.setHeader('Content-Type', 'application/json');
        await res.setHeader('serverside-force-content-length', 'true')
        await res.end(String(JSON.stringify(
            v.idxMap()
        ))); 
    }


}
