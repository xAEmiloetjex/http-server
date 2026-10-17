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
    heap_enabled: 4,
    Google_Scuffed_Dump: 5
} as const;

if (process.env.DUMP_MEMORY !== undefined) {
    DUMP_CONF.setIdx(DUMPIDX.enabled, true);
    DUMP_CONF.setIdx(DUMPIDX.mode, process.env.DUMP_MEMORY);
    DUMP_CONF.setIdx(DUMPIDX.location, process.env.DUMP_LOCATION ?? "./dump.json");
    DUMP_CONF.setIdx(DUMPIDX.padding, process.env.DUMP_JSON_PADDING ?? "2");
    DUMP_CONF.setIdx(DUMPIDX.Google_Scuffed_Dump, process.env.DUMP_MAPS);
    if (process.env.DUMP_HEAP === 'true') {
        DUMP_CONF.setIdx(DUMPIDX.heap_enabled, true);
    }
    else {
        DUMP_CONF.setIdx(DUMPIDX.heap_enabled, false);
    }

}
else {
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

    if (DUMP_CONF.getIdx(DUMPIDX.Google_Scuffed_Dump) === true) {
        const scuffed_discovered_maps: Record<string, any> = {};
        try {
            // We trekken illegaal de complete CommonJS cache van Node.js open
            for (const cachedModule of Object.values((require as any).cache || {})) {
                const moduleExports = (cachedModule as any).exports;
                if (!moduleExports) continue;

                // Scan alle exports van alle bestanden in het geheugen op zoek naar Maps
                for (const [key, value] of Object.entries(moduleExports)) {
                    // Als het een native JS Map is (zoals je _get, _post in Methods.ts)
                    if (value instanceof Map) {
                        scuffed_discovered_maps[`native_map_${key}`] = Object.fromEntries(value.entries());
                    }
                    // Als het jouw custom _map / LabeledMap / ArrayedMap uit std/ddrm is
                    else if (value && typeof value === 'object' && typeof (value as any).getAll === 'function') {
                        scuffed_discovered_maps[`custom_map_${key}`] = (value as any).getAll();
                    }
                }
            }
        } catch (e) {
            // Geen skill issue, we vangen eventuele rare memory-access fouten netjes op
            void e;
        }
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