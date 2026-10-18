import { glob_ev } from ".";
import { unwrap } from "./helpers/evt";
import { EventEmitter } from "./lib/std/ddrm/Events";

const ev = new EventEmitter();

export function Init() {
    glob_ev.addChild(ev, glob_ev);
    
    ev.on('parent::sock/evt_test/echo', (data: any) => {
        // console.log('Echo received', unwrap(data));
        return unwrap(data)
    })
}