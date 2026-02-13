import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Config from "effect/Config";
import { App } from "../app.ts";

export class FlyOrg extends Context.Tag("fly/org")<FlyOrg, string>() {}

export const fromEnv = () =>
  Layer.effect(
    FlyOrg,
    Effect.gen(function* () {
      const org = yield* Config.string("FLY_ORG");
      if (!org) {
        return yield* Effect.die("FLY_ORG is not set");
      }
      return org;
    }),
  );

export const fromStageConfig = () =>
  Layer.effect(
    FlyOrg,
    Effect.gen(function* () {
      const app = yield* App;
      const orgFromConfig = app.config.fly?.org;
      if (orgFromConfig) return orgFromConfig;

      const orgFromEnv = yield* Config.string("FLY_ORG").pipe(Config.option);
      if (orgFromEnv._tag === "Some") return orgFromEnv.value;

      return yield* Effect.die(
        "FLY_ORG is not set in stage config or environment",
      );
    }),
  );
