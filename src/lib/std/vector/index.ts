import type { int } from "../ddrm";
import { findMap } from "../ddrm/core/utils/common.js";

export const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function genLabelByIdx(idx: number): string {
    if (idx < 0) return '';
    let n = idx + 1;
    let result = '';
    while (n > 0) {
        n--;
        result = ALPHABET[n % 52] + result;
        n = Math.floor(n / 52);
    }
    return result;
}

export type VecString =
    | `__vec${string}`
    | `__uvec${string}`
    | `__svec${string}`
    | `__suvec${string}`
    | `__ivec${string}`
    | `__evec${string}`
    | `__sevec${string}`
    | `__uevec${string}`
    | `__suevec${string}`;

export enum VecTypes {
    // TODO: add types for the readable flag!

    /**
     * Standard Vector
     */
    VEC = '__vec',

    /**
     * Vector with unsafe operations
     */
    UVEC = '__uvec',

    /**
     * Readonly Vector
     */
    SVEC = '__svec',

    /**
     * Readonly Vector with unsafe operations
     */
    SUVEC = '__suvec',

    /**
     * Empty (noRead) Vector
     */
    EVEC = '__evec',

    /**
     * Static Empty (noRead) Vector
     */
    SEVEC = '__sevec',

    /**
     * Unsafe Empty (noRead) Vector
     */
    UEVEC = '__uevec',

    /**
     * Unsafe Static Empty (noRead) Vector
     */
    SUEVEC = '__suevec',

    /**
     * Inherit Parent Vector
     */
    IVEC = '__ivec',
}

export enum Spaces {
    SINGLE,
    RGB,
    RGBA,
    VEC,
    QUATERNION,
    VEC1,
    VEC2,
    VEC3,
    VEC4,
    ALPHABET,
    CUSTOM
}

export class Vec<T> {

// @ts-expect-error
    private #space: Spaces = Spaces.ALPHABET;
// @ts-expect-error
    private #customSpaceMap: {[key:number]:string}|null = null; 
// @ts-expect-error
    private #values: Map<int, T> = new Map<int, T>();
// @ts-expect-error
    private #length: () => int = () => this.#values.size;

// @ts-expect-error
    private #static  : boolean = false;
// @ts-expect-error
    private #readable: boolean = true;
// @ts-expect-error
    private #unsafe  : boolean = false;

    public get values(): Map<int, T> {
        const values = new Map();
        if (this.#readable !== true) return values;

        this.#values.forEach((v,k,_m) => {
            values.set(k,v);
        })

        return values;
    }
    public get length(): int {
        if (this.#readable !== true) return 0;
        return this.#length();
    }

    public get space(): Spaces {
        return this.#space;
    }

    /**
     * Alias for `isReadonly`
     */
    public get isStatic(): boolean {
        return this.#static;
    }
    public get isReadonly(): boolean {
        return this.#static;
    }
    public get isReadable(): boolean {
        return this.#readable;
    }
    public get unsafeAllowed(): boolean {
        return this.#unsafe;
    }

    constructor(
        ...values: T[]
    ) {
        for (let i = 0; i < values.length; i++) {
            this.#values.set(i, values[i]);
        }
    }

    public setCustomMap(map: {[key: number]: string}|null) {
        this.#customSpaceMap = map;
        return this;
    }

    public setSpace(space: Spaces) {
        this.#space = space;
        return this;
    }

    public allowUnsafe(state?: boolean) {
        if (state === undefined) this.#unsafe = true;
        else this.#unsafe = state;
        return this;
    }

    /**
     * Alias for `allowUnsafe()`
     */
    public unsafe(state?: boolean) {
        return this.allowUnsafe(state);
    }

    /**
     * Alias for `immutable()`
     */
    public static(state?: boolean) {
        return this.immutable(state);
    }
    /**
     * Alias for `immutable()`
     */
    public readonly(state?: boolean) {
        return this.immutable(state);
    }
    /**
     * Alias for `immutable()`
     */
    public imut(state?: boolean) {
        return this.immutable(state);
    }
    /**
     * Alias for `mutable()`
     */
    public mut(state?: boolean) {
        return this.mutable(state);
    }


    public immutable(state?: boolean) {
        if (state === undefined) this.#static = true;
        else this.#static = state;
        return this;
    }
    public mutable(state?: boolean) {
        if (state === undefined) this.#static = false;
        else this.#static = !state;
        return this;
    }

    public readable(state?: boolean) {
        if (this.#unsafe !== true) return this;

        if (state === undefined) this.#readable = true;
        else this.#readable = state;
        return this;
    }
    // operations

    public add(value: T) {
        if (this.#static === true) return;
        this.#values.set(this.length, value);
    }

    // public remove(value: T) { }

    // public set(k: string, v: T) { }

    public get(k?: string) {
        if (this.#readable !== true) return null;
        if (k === undefined) return this.getIdx(0);

        const m = this.map();
        const o = m[k];
        return o === undefined
            ? null
            : o;
    }

    public getIdx(idx?: int): T | null {
        if (this.#readable !== true) return null;
        if (idx === undefined) idx = 0;

        const o = this.#values.get(idx);;
        return o === undefined
            ? null
            : o;
    }

    // unsafe operations
    public set(label: string|T, value?: T) {
        if (this.#static === true) return;
        if (this.#unsafe !== true) return;

// @ts-ignore
        if (value === undefined) return this.setIdx(0, label);

        const idxMap = this.idxMap();
// @ts-ignore
        const find = findMap(idxMap, 'label', label);

        this.#values.set(find, value);
        return this;
    }

    public setIdx(idx: int|T, value: T): void {
        if (this.#static === true) return;
        if (this.#unsafe !== true) return;
        if (value === undefined) return this.setIdx(0, idx);
        this.#values.set(idx, value);
    }


    public remove(label?: string) {
        if (this.#static === true) return;
        if (this.#unsafe !== true) return;

// @ts-ignore
        if (label === undefined) return this.removeIdx(0);

        const idxMap = this.idxMap();
        const find = findMap(idxMap, 'label', label);
        this.#values.delete(find);
        return this;
    }

    public removeIdx(idx?: int) {
        if (this.#static === true) return;
        if (this.#unsafe !== true) return;
        if (idx === undefined) idx = 0;
        this.#values.delete(idx);
    }

    // utils
    public idxMap(space: Spaces = this.#space): void|{ idx: number, label: string, value: T}[] {
        if (this.#readable !== true) return [];

        let arr: { idx: number, label: string, value: T}[] = [];
        const v: T[] = this.toArray();
        // return console.log(v, this.#customSpaceMap);

        if (space === Spaces.VEC) {
            switch (this.length) {
                case 1:
                    space = Spaces.VEC1;
                    break;
                case 2:
                    space = Spaces.VEC2;
                    break;                    
                case 3:
                    space = Spaces.VEC3;
                    break;
                case 4:
                    space = Spaces.VEC4;
                    break;                                        
            }
        }

        else if (space === Spaces.SINGLE) space = Spaces.VEC1;
        else if (space === Spaces.QUATERNION) space = Spaces.VEC4;

        if (space === Spaces.RGB) {
            arr.push({ idx: 0, label: "r", value: v[0]});
            arr.push({ idx: 1, label: "g", value: v[1] });
            arr.push({idx: 2, label: 'b', value: v[2]});
        }
        else if (space === Spaces.RGBA) {
            arr.push({idx: 0, label: "r", value: v[0]});
            arr.push({idx: 1, label: "g", value: v[1]});
            arr.push({idx: 2, label: 'b', value: v[2]});
            arr.push({idx: 3, label: 'a', value: v[3]});
        }

        else if (space === Spaces.VEC1) {
            arr.push({ idx: 0, label: "x", value: v[0] });
        }

        else if(space === Spaces.VEC2) {
            arr.push({ idx: 0, label: "x", value: v[0] });
            arr.push({ idx: 1, label: "y", value: v[1] });
        }
        else if(space === Spaces.VEC3) {
            arr.push({ idx: 0, label: "x", value: v[0] });
            arr.push({ idx: 1, label: "y", value: v[1] });
            arr.push({ idx: 2, label: "z", value: v[2] });
        }
        else if(space === Spaces.VEC4) {
            arr.push({ idx: 0, label: "x", value: v[0] });
            arr.push({ idx: 1, label: "y", value: v[1] });
            arr.push({ idx: 2, label: "z", value: v[2] });
            arr.push({ idx: 3, label: "w", value: v[3] });
        }
        else if (space === Spaces.CUSTOM) {
            if (this.#customSpaceMap === null) return this.idxMap(Spaces.ALPHABET);
            v.forEach((_v,i,_a) => {
                arr.push({ idx: i, label: this.#customSpaceMap[i], value: v[i] });
            })
        }

        else if(space === Spaces.ALPHABET) {
            for (let i = 0; i < v.length; i++) {
                // 0) [ALPHABET[1]] = v[1]:
                arr.push({ idx: i, label: genLabelByIdx(i), value: v[i] });
            }
            return arr;
        }

        return arr;
    }

    public toArray(): T[] {
        if (this.#readable !== true) return [];

        let arr: T[] = []
        this.values.forEach((v: T, k: int, m) => {
            arr.push(v)
        });
        return arr;
    };

    public map(space?: Spaces): {[key: string]: T} {
        if (this.#readable !== true) return {};

        if (space === undefined) space = this.#space;

        const v: T[] = this.toArray();
        if (space === Spaces.VEC) {
            switch (this.length) {
                case 1:
                    space = Spaces.VEC1;
                    break;
                case 2:
                    space = Spaces.VEC2;
                    break;                    
                case 3:
                    space = Spaces.VEC3;
                    break;
                case 4:
                    space = Spaces.VEC4;
                    break;                                        
            }
        }
        else if (space === Spaces.SINGLE) space = Spaces.VEC1;
        else if (space === Spaces.QUATERNION) space = Spaces.VEC4;

        if (space === Spaces.RGB) return { r: v[0], g: v[1], b: v[2] };
        else if (space === Spaces.RGBA) return { r: v[0], g: v[1], b: v[2], a: v[3] };
        else if (space === Spaces.VEC1) return { x: v[0] };
        else if (space === Spaces.VEC2) return { x: v[0], y: v[1] };
        else if (space === Spaces.VEC3) return { x: v[0], y: v[1], z: v[2] };
        else if (space === Spaces.VEC4) return { x: v[0], y: v[1], z: v[2], w: v[3] };
        else if (space === Spaces.ALPHABET) {
            let obj: {[key: string]: T} = {};
            for (let i = 0; i < v.length; i++) {
                obj[genLabelByIdx(i)] = v[i];
            }
            return obj;
        }

        return {};
    }

    public clone() {
        let wasUnreadable: boolean = false;
        
        if (this.#readable === false) {
            this.readable(true);
            wasUnreadable = true;
        }

        const vec = new Vec<T>(...(this.toArray()))
            .static(this.#static)
            .allowUnsafe(this.#unsafe)
            .readable(this.#readable);

        if (wasUnreadable === true) this.readable(false);

        return vec;
    }

    public toString(inheritParentProps: boolean = false): VecString {

        if (inheritParentProps === true)
            return `__ivec${JSON.stringify(this.toArray())}`;
        if (this.#static === true && this.#unsafe === true)
            return `__suvec${JSON.stringify(this.toArray())}`;
        else if (this.#static === true)
            return `__svec${JSON.stringify(this.toArray())}`;
        else if (this.#unsafe === true)
            return `__uvec${JSON.stringify(this.toArray())}`;

// @ts-expect-error
        else if((this.#readable !== true) && this.#static === true && this.#unsafe === true)
            return '__suevec[]';

// @ts-expect-error
        else if((this.#readable !== true) && this.#static === true)
            return '__sevec[]';

// @ts-expect-error
        else if((this.#readable !== true) && this.#unsafe === true)
            return '__uevec[]';
        else if(this.#readable !== true)
            return '__evec[]';
        else
            return `__vec${JSON.stringify(this.toArray())}`;
    }

    public fromArray(values: T[]): this {
        if (this.#static === true) return this;
        if (this.#unsafe !== true) return this;
        for (let i = 0; i < values.length; i++) {
            this.setIdx(i, values[i]);
        }
        return this;
    }

    public fromString(str: string): this {
        if (!(
            str.startsWith('__vec') ||
            str.startsWith('__svec') ||
            str.startsWith('__uvec') ||
            str.startsWith('__suvec') ||
            str.startsWith('__ivec') ||
            str.startsWith('__evec') ||
            str.startsWith('__sevec') ||
            str.startsWith('__uevec') ||
            str.startsWith('__suevec')
        )) return this;
        /** */
        let oUnsafe:   boolean = false;
        let oStatic:   boolean = false;
        let oReadable: boolean = true;

        if (this.#unsafe === true)    oUnsafe   = true;
        if (this.#static === true)    oStatic   = true;
        if (this.#readable === false) oReadable = false;

        /** */
        let type: VecTypes = VecTypes.VEC;
        let arrStr: string = '';
        let arr: T[] = [];

        /** */
        this.readonly(false);
        this.allowUnsafe(true);
        if (str.startsWith('__vec')) type = VecTypes.VEC;
        else if (str.startsWith('__svec')) type = VecTypes.SVEC;
        else if (str.startsWith('__uvec')) type = VecTypes.UVEC;
        else if (str.startsWith('__suvec')) type = VecTypes.SUVEC;
        else if (str.startsWith('__ivec')) type = VecTypes.IVEC;
        else if (str.startsWith('__evec')) type = VecTypes.EVEC;
        else if (str.startsWith('__sevec')) type = VecTypes.SEVEC;
        else if (str.startsWith('__uevec')) type = VecTypes.UEVEC;
        else if (str.startsWith('__suevec')) type = VecTypes.SUEVEC;
        arrStr = str.replace(type, '');
        arr = JSON.parse(arrStr);

        this.fromArray(arr);

        switch (type) {
            case VecTypes.VEC:
                this.readonly(false);
                this.allowUnsafe(false);
                break;
            case VecTypes.UVEC:
                this.allowUnsafe(true);
                this.static(false);
                break;
            case VecTypes.SVEC:
                this.allowUnsafe(false);
                this.static(true);
                break;
            case VecTypes.SUVEC:
                this.allowUnsafe(true);
                this.static(true);
                break;
            case VecTypes.IVEC:
                this.readable(oReadable);
                this.readonly(oStatic);
                this.allowUnsafe(oUnsafe);
                break;
            case VecTypes.EVEC:
                this.readable(false);
                this.readonly(false);
                this.allowUnsafe(false);
                break;
            case VecTypes.UEVEC:
                this.readable(false);
                this.allowUnsafe(true);
                this.static(false);
                break;
            case VecTypes.SEVEC:
                this.readable(false);
                this.allowUnsafe(false);
                this.static(true);
                break;
            case VecTypes.SUEVEC:
                this.readable(false);
                this.allowUnsafe(true);
                this.static(true);
                break;
        }

        return this;
    }
}
