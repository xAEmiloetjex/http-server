import type { Result } from "../std/index.js";
import type { KVStore_Opts } from "./types";
import { Driver } from "./types.js";
// import { CookieDriver } from "./drivers/CookieDriver";
import { MemoryDriver } from "./drivers/MemoryDriver.js";

//# .LIB_KVSTORE

export class KVStore {
    public Driver: Driver;
    public tablePrefix: string;

    constructor(opts: KVStore_Opts = {
        Driver: new MemoryDriver(),
        tablePrefix: ""
    }) {
        if (opts && opts.Driver) this.Driver = opts.Driver;
        else this.Driver = new MemoryDriver();

        if (opts && opts.tablePrefix) this.tablePrefix = opts.tablePrefix;
        else this.tablePrefix = "";

        this.Driver.SetPrefix(this.tablePrefix);
        this.Driver.Load();
    }

    public set(k:string, v:any): Result<'OK', Error> {
        const val = this.Driver.Set(k,v)
        // this.Driver.Save();
        return val
    }

    public get(k:string): Result<any, Error> {
        return this.Driver.Get(k);
    }

    public delete(k:string): Result<'OK', Error> {
        const val = this.Driver.Delete(k);
        // this.Driver.Save();
        return val
    }
}