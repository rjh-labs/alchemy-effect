import { Trait } from "./trait.ts";

export type Header<WireName extends string | undefined = undefined> = Trait<
  "Header",
  WireName
>;

export const Header = <WireName extends string | undefined = undefined>(
  wireName?: WireName,
) => Trait<Header<WireName>>("Header", wireName!);
