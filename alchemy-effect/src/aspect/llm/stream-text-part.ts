import type { TextStreamPart } from "ai";
import * as S from "effect/Schema";

export type StreamTextPart = TextStreamPart<any>;

export const StreamTextPart = S.suspend((): S.Schema<StreamTextPart> => S.Any);
