import { Logger } from "../logger";
import { RestrictiveAny } from "../types";
import * as ENV from "../ENV";

const colorHandler_ = {
  blue:     (inp:RestrictiveAny) => `${inp}`,
  yellow:   (inp:RestrictiveAny) => `${inp}`,
  red:      (inp:RestrictiveAny) => `${inp}`,
  green:    (inp:RestrictiveAny) => `${inp}`,
  magenta:  (inp:RestrictiveAny) => `${inp}`
};

const logger = ENV.DEBUG_OPTS.FILE_MODE === true
    ? new Logger(ENV.DEBUG_OPTS.DEBUGGER_NAME, console, colorHandler_)
    : new Logger(ENV.DEBUG_OPTS.DEBUGGER_NAME);
export function debug(...args: any[]) {
    if (ENV.DEBUG === true) {
        logger.debug(...args);
    }
    return;
}