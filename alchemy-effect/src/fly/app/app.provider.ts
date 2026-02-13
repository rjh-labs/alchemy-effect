import * as Effect from "effect/Effect";
import { createPhysicalName } from "../../physical-name.ts";
import { FlyApi } from "../api.ts";
import { FlyOrg } from "../context.ts";
import { App, type AppAttr, type AppProps } from "./app.ts";

type FlyAppResponse = {
  id: string;
  name: string;
  organization?: {
    slug: string;
  };
  hostname: string;
};

export const appProvider = () =>
  App.provider.effect(
    Effect.gen(function* () {
      const api = yield* FlyApi;
      const defaultOrg = yield* FlyOrg;

      const createAppName = (id: string, name: string | undefined) =>
        Effect.gen(function* () {
          if (name) return name;
          return yield* createPhysicalName({
            id,
            maxLength: 63,
            lowercase: true,
          });
        });

      const mapResult = <Props extends AppProps>(
        app: FlyAppResponse,
      ): AppAttr<Props> =>
        ({
          appName: app.name,
          org: app.organization?.slug ?? defaultOrg,
          hostname: app.hostname,
        }) as AppAttr<Props>;

      return {
        create: Effect.fnUntraced(function* ({ id, news }) {
          const name = yield* createAppName(id, news.name);
          const org = news.org ?? defaultOrg;

          // POST /apps returns minimal {id, created_at} — not the full app.
          // Follow up with GET to get organization, hostname, etc.
          yield* api.post<{ id: string }>("/apps", {
            app_name: name,
            org_slug: org,
            network: news.primaryRegion,
          });

          const app = yield* api.get<FlyAppResponse>(`/apps/${name}`);
          return mapResult<AppProps>(app);
        }),

        update: Effect.fnUntraced(function* ({ news, output }) {
          // Fly apps don't support meaningful updates - only replacement
          // Just verify the app still exists
          const app = yield* api.get<FlyAppResponse>(`/apps/${output.appName}`);
          return mapResult<AppProps>(app);
        }),

        delete: Effect.fnUntraced(function* ({ output }) {
          yield* api
            .delete(`/apps/${output.appName}`)
            .pipe(Effect.catchTag("NotFound", () => Effect.void));
        }),

        read: Effect.fnUntraced(function* ({ id, output, olds }) {
          const name = output?.appName ?? (yield* createAppName(id, olds?.name));
          return yield* api
            .get<FlyAppResponse>(`/apps/${name}`)
            .pipe(
              Effect.map(mapResult<AppProps>),
              Effect.catchTag("NotFound", () => Effect.succeed(undefined)),
            );
        }),

        diff: Effect.fn(function* ({ id, olds, news, output }) {
          const name = yield* createAppName(id, news.name);

          // Replacement if name or primaryRegion changes.
          // Org comparison skipped: FLY_ORG is a name ("personal") but
          // the API returns a slug ("ryan-helaix-com"). Org changes
          // require `fly apps move`, not replace.
          if (
            output.appName !== name ||
            (news.primaryRegion && news.primaryRegion !== olds.primaryRegion)
          ) {
            return { action: "replace" };
          }
        }),
      };
    }),
  );
