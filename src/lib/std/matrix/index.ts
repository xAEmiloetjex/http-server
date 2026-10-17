import type { int } from "../ddrm/core/types/primitives";
import { CTYPES, type NO_MAP, type Ok, type Result } from "../std/types";
import { format } from "node:util";

export class Matrix<T> {
    public rows_count: int;
    public cols_count: int;

// @ts-ignore   // Just trust me bro.  
    private #format: string;
// @ts-ignore   // Just trust me bro.
    private #store: Map<string, T>;
// @ts-ignore   // Just trust me bro.
    private #sel_row: int;
// @ts-ignore   // Just trust me bro.
    private #sel_col: int;


    constructor(/* crows: int = -1, ccols: int = -1, formatting: string = "r%s-c%s" */) {
        const crows: int = -1
        const ccols: int = -1
        const formatting: string = "r%s-c%s"

        this.#format = formatting;
        this.rows_count = crows;
        this.cols_count = ccols;
        this.#store = new Map<string, T>();
    }

    public EGet(r:int, c:int): Result<T, NO_MAP> {
        return this.#store.get(format(this.#format, r, c)) || CTYPES.NO_MAP;
    }
    public ESet(r:int, c:int, val: T): Result<Ok, Error> {
        try {
            this.#store.set(format(this.#format, r, c), val);
            if (this.EGet(r,c) !== CTYPES.NO_MAP) return CTYPES.Ok;
            else return new Error('Couldn\'t apply value');
        } catch (e) {
            return new Error(e);
        }
    }

    public row(v: int): this {
        this.#sel_row = v;
        return this;
    }

    public col(v: int): this {
        this.#sel_col = v;
        return this;
    }

    public get(): Result<T, NO_MAP> {
        return this.#store.get(format(this.#format, this.#sel_row, this.#sel_col)) || CTYPES.NO_MAP;
    }
    public set(val: T): Result<Ok, Error> {
        try {
            this.#store.set(format(this.#format, this.#sel_row, this.#sel_col), val);
            if (this.EGet(this.#sel_row, this.#sel_col) !== CTYPES.NO_MAP) return CTYPES.Ok;
            else return new Error('Couldn\'t apply value');
        } catch (e) {
            return new Error(e);
        }
    }

    public toNestedArray(rows:int, cols:int): T[][] {
        let arr: any[][] = [];

        for (let i = 0; i <= rows - 1; i++) {
            arr.push([]);
            for (let j = 0; j <= cols - 1; j++) {
                arr[i].push(0)
            }
        }

        this.#store.forEach((v,k,_m) => {
            const row = String(String(k).split('-')[0]).replace('r', '');
            const col = String(String(k).split('-')[1]).replace('c', '');

            arr[Number(row)][Number(col)] = v;
        })

        return arr;
    }
    public toObject(): {[x:string]:T} {
        let obj: {[x:string]:T} = {}

        this.#store.forEach((v,k,_m) => obj[k]=v)

        return obj;
    }

    public fromNestedArray(arr:T[][]) {
        for (let i = 0; i <= arr.length - 1; i++) {
            for (let j = 0; j <= arr[i].length - 1; j++) {
                this.row(i).col(j).set(arr[i][j])
            }
        }
    }

    public fromObject(obj: {[x:string]:T}) {
        for (const key in obj) {
            const test = this.isFormat(key);
            if (test === false) throw new Error('invalid key detected');

            this.#store.set(key, obj[key]);
        }
    }

    private isFormat(input): boolean {
        let regex = /r[0-9]+-c[0-9]+/i;
        return regex.test(input);
    }
}