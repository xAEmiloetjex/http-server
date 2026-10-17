export type GeneralRange<Arr extends number[] = []> =
    Arr['length'] extends 999
        ? Arr[number]
        : GeneralRange<[...Arr, Arr['length']]>;
export type GeneralRangeFrom<Start extends number, Arr extends number[] = []> =
    Arr['length'] extends 999
        ? Arr[number] extends infer R
            ? R extends number
                ? R extends Start
                    ? Arr[number]
                    : never
                : never
            : never
        : GeneralRangeFrom<Start, [...Arr, Arr['length']]>;
export type GeneralRangeTo<End extends number, Arr extends number[] = []> =
    Arr['length'] extends 999
        ? Arr[number] extends infer R
            ? R extends number
                ? R extends End
                    ? Arr[number]
                    : never
                : never
            : never
        : GeneralRangeTo<End, [...Arr, Arr['length']]>;
export type Range<Start extends number, End extends number, Arr extends number[] = []> =
    Arr['length'] extends 999
        ? Arr[number] extends infer R
            ? R extends number
                ? R extends Start
                    ? R extends End
                        ? Arr[number]
                        : never
                    : never
                : never
            : never
        : Range<Start, End, [...Arr, Arr['length']]>;

export type Integer<T extends number> =
    `${T}` extends `${string}.${string}`
        ? never
        : T;
export type Float<T extends number> =
    `${T}` extends `${string}.${string}`
        ? T
        : never;
export type Positive<T extends number> =
    `${T}` extends `-${string}`
        ? never
        : T;
export type Negative<T extends number> =
    `${T}` extends `-${string}`
        ? T
        : never;

export type PositiveInteger<T extends number> = Positive<Integer<T>>;
export type NegativeInteger<T extends number> = Negative<Integer<T>>;
export type PositiveFloat<T extends number> = Positive<Float<T>>;
export type NegativeFloat<T extends number> = Negative<Float<T>>;

// short aliases
export type gr = GeneralRange;
export type grFrom<S extends number, Arr extends number[]>              = GeneralRangeFrom<S, Arr>;
export type grTo<E extends number, Arr extends number[]>                = GeneralRangeTo<E, Arr>;
export type r<S extends number, E extends number, Arr extends number[]> = Range<S, E, Arr>;

// @ts-expect-error
export type int = Integer;
// @ts-expect-error
export type float = Float;
// @ts-expect-error
export type pos = Positive;
// @ts-expect-error
export type neg = Negative;
// @ts-expect-error
export type pint = PositiveInteger;
// @ts-expect-error
export type nint = NegativeInteger;
// @ts-expect-error
export type pfloat = PositiveFloat;
// @ts-expect-error
export type nfloat = NegativeFloat;