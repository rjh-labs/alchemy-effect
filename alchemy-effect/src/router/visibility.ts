import { type Trait, make } from "./trait.ts";

export type Public = Trait<"Public">;
export const Public = make<Public>("Public");

export type Private = Trait<"Private">;
export const Private = make<Private>("Private");
