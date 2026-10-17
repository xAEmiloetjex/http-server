import type { Result } from "../../std";
import { Driver } from "../types.js";

export class MemoryDriver implements Driver {
    private _tablePrefix: string = "";

    public M: Map<any,any>;
    public StoreSet = new Set<string>();
    public Store: {[k: string]: any} = {};

    public get tablePrefix() {
        return this._tablePrefix;
    }

    constructor() {
        this.M = new Map();
    }

    public SetPrefix(prefix: string) {
        try {
            this._tablePrefix = prefix;
            return 'OK'
        } catch (e) {
            return new Error('Failed setting prefix', {cause: e});
        }
    }

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // //     

    /**
     * @deprecated
     * 
     * This does absolutely nothing in this driver
     */
    public Save(): Result<'OK', Error> {
        try {
            return 'OK'
        } catch (e) {
            return new Error('Failed saving', {cause: e});
        }
    }

    /**
     * @deprecated
     * 
     * This does absolutely nothing in this driver
     */
    public Load(): Result<'OK', Error> {
        try {
            return 'OK'
        } catch (e) {
            return new Error('Failed loading', {cause: e});
        }
    }

    public _Save(): Result<'OK', Error> {
        try {
            // this.C.Set("store", JSON.stringify(this.Store), 36500);

            for (const k in this.Store) {
                this.M.set(k, this.Store[k]);
            }

            return 'OK'
        } catch (e) {
            return new Error('Failed saving', {cause: e});
        }
    }

    public _Load(): Result<'OK', Error> {
        try {
            // this.Store = JSON.parse(this.C.Get("store"));

            this.M.forEach((v,k,_) => {
                this.Store[k] = v;
            })

            return 'OK'
        } catch (e) {
            return new Error('Failed loading', {cause: e});
        }
    }

    public _Set<T>(k: string, v: T): Result<'OK', Error> {
        try {
            this.Store[k] = v;

            const Save_Res = this._Save();
            if (Save_Res !== 'OK') throw Save_Res;

            if (this.Store[k] === v) return 'OK';
            else throw 'could complete the check to see if the value actually ended up in the store.';
        } catch (e) {
            return new Error('Failed setting', {cause: e});
        }
    }

    public _Get<T>(k: string): Result<T, Error> {
        try {
            return this.Store[k];
        } catch (e) {
            return new Error('Failed getting', {cause: e});
        }
    }

    public _Delete(k: string): Result<'OK', Error> {
        try {
            delete this.Store[k];
            
            const Save_Res = this._Save();
            if (Save_Res !== 'OK') throw Save_Res;

            return 'OK';
        } catch (e) {
            return new Error('Failed deleting', {cause: e});
        }
    }

// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // 

    public Set<T>(k: string, v: T): Result<'OK', Error> {
        try {
            this.M.set(k,v);

            if (this.M.get(k) === v) return 'OK';
            else throw 'could complete the check to see if the value actually ended up in the store.';
        } catch (e) {
            return new Error('Failed setting', {cause: e});
        }
    }

    public Get<T>(k: string): Result<T, Error> {
        try {
            return this.M.get(k);
        } catch (e) {
            return new Error('Failed getting', {cause: e});
        }
    }

    public Delete(k: string): Result<'OK', Error> {
        try {
            this.M.delete(k);

            return 'OK';
        } catch (e) {
            return new Error('Failed deleting', {cause: e});
        }
    }
}