import * as Config from "effect/Config";

export const FLY_API_TOKEN = Config.string("FLY_API_TOKEN").pipe(
  Config.option,
);

declare module "../stage.ts" {
  interface StageConfig {
    fly?: {
      /**
       * Fly.io organization name.
       */
      org: string;
      /**
       * Default region for new apps/machines.
       * @default "iad" (Ashburn, Virginia)
       */
      primaryRegion?: string;
    };
  }
}
