import * as S from "effect/Schema";
import { defineAspect } from "./aspect.ts";

export const File = defineAspect("file", {
  language: S.String,
});

export const TypeScript = File({
  language: "typescript",
});

export const Folder = defineAspect("folder");
