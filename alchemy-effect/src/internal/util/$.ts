import * as Output from "../../../Output.ts";
import { Policy } from "../../../Policy.ts";
import { isResource } from "../../Resource.ts";

export type $ = typeof Policy & typeof Output.interpolate & typeof Output.of;
export const $ = Object.assign(
  (...args: any[]) =>
    Array.isArray(args[0])
      ? Output.interpolate(
          args[0] as unknown as TemplateStringsArray,
          ...args.slice(1),
        )
      : isResource(args[0])
        ? Output.of(args[0])
        : Policy(...args),
  Policy,
) as $;
