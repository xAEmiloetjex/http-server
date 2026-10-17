//# .LIB_STD::TYPES

function newType(val: string):string {
    return 'CustType:' + val;
}

/**
 * Custom Types
 */
export const CTYPES = {
    NO_MAP: 'CustType:NoMap',
    Ok: 'CustType:Ok'
} as const

export type NO_MAP = 'CustType:NoMap'
export type Ok = 'CustType:Ok'

export type Result<T, E> = T|E;
