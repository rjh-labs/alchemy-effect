type Join<
  T extends readonly string[],
  Delimiter extends string,
> = T extends readonly [infer First extends string]
  ? First
  : T extends readonly [
        infer First extends string,
        ...infer Rest extends readonly string[],
      ]
    ? `${First}${Delimiter}${Join<Rest, Delimiter>}`
    : T extends string[]
      ? string
      : "";

export const join = <
  const Strings extends readonly string[],
  const Delimiter extends string,
>(
  strings: Strings,
  delimiter: Delimiter,
): Join<Strings, Delimiter> =>
  strings.join(delimiter) as Join<Strings, Delimiter>;
