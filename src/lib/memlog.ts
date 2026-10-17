import * as v8 from "node:v8"

import * as fs from "node:fs";
import * as path from "node:path";
import { Vec } from "./std/vector";
import { _map } from "./std/ddrm/Map";

/* RUNTIME IMPORTS */
import { allRoutesRegister } from "./HTTP_1.1/Methods";
/* --------------- */

export const DUMP_CONF: Vec<any> = new Vec().allowUnsafe().mut();
export const dumpStore = _map();

export const DUMPIDX = {
    enabled: 0,
    mode: 1,
    location: 2,
    padding: 3,
    heap_enabled: 4
} as const;

if (process.env.DUMP_MEMORY !== undefined)
{
    DUMP_CONF.setIdx(DUMPIDX.enabled, true);
    DUMP_CONF.setIdx(DUMPIDX.mode, process.env.DUMP_MEMORY);
    DUMP_CONF.setIdx(DUMPIDX.location, process.env.DUMP_LOCATION ?? "./dump.json");
    DUMP_CONF.setIdx(DUMPIDX.padding, process.env.DUMP_JSON_PADDING ?? "2");
    if (process.env.DUMP_HEAP === 'true')
    {
        DUMP_CONF.setIdx(DUMPIDX.heap_enabled, true);
    }
    else
    {
        DUMP_CONF.setIdx(DUMPIDX.heap_enabled, false);
    }

} 
else
{
    DUMP_CONF.setIdx(DUMPIDX.enabled, false);
}

export function dumpAll() {
    if (DUMP_CONF.getIdx(DUMPIDX.enabled) === false) return;
    dumpStore.set('allRoutesRegister', allRoutesRegister.getAll())
    const dump_store = dumpStore.all()
    let json = {
        DUMP_CONF: DUMP_CONF.map(),
        dump_store,
    }

    const json_str = 
        JSON.stringify(
            json,
            undefined,
            parseInt(DUMP_CONF.getIdx(DUMPIDX.padding))
        );

    fs.writeFileSync(
        path.resolve(DUMP_CONF.getIdx(DUMPIDX.location)),
        json_str,
        'utf8'
    );
    
    if (DUMP_CONF.getIdx(DUMPIDX.heap_enabled) === false) return json_str;
    const filename = v8.writeHeapSnapshot(); 
    console.log(`Heap dump stored at: ${filename}`);
    return json_str;
}