import * as Context from "effect/Context";

export class AspectConfig extends Context.Tag("AspectConfig")<
  AspectConfig,
  {
    cwd: string;
  }
>() {}
