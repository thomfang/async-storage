const typeSizes = {
  "undefined": () => 0,
  "boolean": () => 4,
  "number": () => 8,
  "string": (item: string) => 2 * item.length,
  "object": (item: object) => !item ? 0 : Object.keys(item).reduce((total, key) =>
    sizeof(key) + sizeof(item[key]) + total, 0)
};

export const sizeof = (value: any) => typeSizes[typeof value](value);