import { LabeledMap, ArrayedMap } from "./maps.js";

export function NestedLabeledMap<K extends string, V>() {
    const baseMap = LabeledMap<K, V | ReturnType<typeof NestedLabeledMap<K, V>>>();
    
    return {
        ...baseMap,
        
        setNested(key: K, value: V | ReturnType<typeof NestedLabeledMap<K, V>>) {
            baseMap.set(key, value);
        },
        
        getNested(key: K) {
            return baseMap.get(key);
        },
        
        export(): Record<K, any> {
            const result: Record<K, any> = {} as Record<K, any>;
            
            for (const [key, value] of baseMap.entries()) {
                if (value && typeof value === 'object' && 'export' in value) {
                    result[key] = value.export();
                } else {
                    result[key] = value;
                }
            }
            
            return result;
        },
        
        import(data: Record<K, any>) {
            for (const [key, value] of Object.entries(data)) {
                if (value && typeof value === 'object' && !Array.isArray(value)) {
                    const nestedMap = NestedLabeledMap<K, V>();
                    nestedMap.import(value);
                    baseMap.set(key as K, nestedMap);
                } else {
                    baseMap.set(key as K, value as V);
                }
            }
            
            return baseMap;
        }
    };
}

export function NestedArrayedMap<V>() {
    const baseMap = ArrayedMap<V | ReturnType<typeof NestedArrayedMap<V>>>();
    
    return {
        ...baseMap,
        
        setNested(index: number, value: V | ReturnType<typeof NestedArrayedMap<V>>) {
            baseMap.set(index, value);
        },
        
        getNested(index: number) {
            return baseMap.get(index);
        },
        
        export(): any[] {
            const result: any[] = [];
            
            for (const [index, value] of baseMap.entries()) {
                if (value && typeof value === 'object' && 'export' in value) {
                    result[index] = value.export();
                } else {
                    result[index] = value;
                }
            }
            
            return result;
        },
        
        import(data: any[]) {
            data.forEach((value, index) => {
                if (value && typeof value === 'object' && !Array.isArray(value)) {
                    const nestedMap = NestedArrayedMap<V>();
                    nestedMap.import(value);
                    baseMap.set(index, nestedMap);
                } else {
                    baseMap.set(index, value as V);
                }
            });
            
            return baseMap;
        }
    };
}
