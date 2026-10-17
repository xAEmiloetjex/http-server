import type { Result } from "../std";

export abstract class Driver {
    public abstract Store: {[k: string]: any};
    public abstract tablePrefix: string

    public abstract SetPrefix(prefix: string): Result<'OK', Error>;

    public abstract Save(): Result<'OK', Error>;
    public abstract Load(): Result<'OK', Error>;

    public abstract Set<T>(k:string, v:T): Result<'OK', Error>;
    public abstract Get<T>(k:string): Result<T, Error>;
    public abstract Delete(k:string): Result<'OK', Error>;
}

export interface KVStore_Opts {
    Driver?: Driver;
    tablePrefix?: string;
}