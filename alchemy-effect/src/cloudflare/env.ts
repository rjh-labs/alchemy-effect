import * as Context from "effect/Context";

export class CloudflareEnv extends Context.Tag("CloudflareEnv")<
  CloudflareEnv,
  Record<string, unknown>
>() {}
