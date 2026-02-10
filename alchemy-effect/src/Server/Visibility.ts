import { defineTrait, type Trait } from "../Trait.ts";

export type Public = Trait<"Public">;
export const Public = defineTrait<Public>("Public", {});

export type Private = Trait<"Private">;
export const Private = defineTrait<Private>("Private", {});
