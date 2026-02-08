export type Instance<T> = T extends { id: string }
  ? string extends T["id"]
    ? T
    : T extends new (...args: any) => infer I
      ? I
      : never
  : never;
