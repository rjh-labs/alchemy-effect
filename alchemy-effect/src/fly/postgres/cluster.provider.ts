import * as CommandExecutor from "@effect/platform/CommandExecutor";
import * as Command from "@effect/platform/Command";
import * as Effect from "effect/Effect";
import { createPhysicalName } from "../../physical-name.ts";
import { FlyApi } from "../api.ts";
import { FlyOrg } from "../context.ts";
import {
  Postgres,
  type PostgresAttr,
  type PostgresProps,
} from "./cluster.ts";

type FlyAppResponse = {
  name: string;
  hostname: string;
};

export const postgresProvider = () =>
  Postgres.provider.effect(
    Effect.gen(function* () {
      const executor = yield* CommandExecutor.CommandExecutor;
      const api = yield* FlyApi;
      const org = yield* FlyOrg;

      const createAppName = (id: string, name: string | undefined) =>
        Effect.gen(function* () {
          if (name) return name;
          return (yield* createPhysicalName({
            id,
            maxLength: 63,
            lowercase: true,
          })) + "-db";
        });

      const mapResult = <Props extends PostgresProps>(
        appName: string,
        hostname: string,
      ): PostgresAttr<Props> =>
        ({
          appName,
          hostname,
          connectionString: `postgres://postgres:password@${hostname}:5432/postgres`,
        }) as PostgresAttr<Props>;

      return {
        create: Effect.fnUntraced(function* ({ id, news }) {
          const appName = yield* createAppName(id, news.appName);

          // Use flyctl to create Postgres cluster
          const cmd = Command.make("flyctl", "postgres", "create").pipe(
            Command.feed(`${appName}\n${news.region ?? "iad"}\n${org}\n${news.vmSize ?? "shared-cpu-1x"}\n${news.volumeSize ?? 10}\n${news.initialClusterSize ?? 1}\n`),
          );

          yield* executor.start(cmd).pipe(
            Effect.flatMap((process) => process.exitCode),
          );

          // Get app details
          const app = yield* api.get<FlyAppResponse>(`/apps/${appName}`);

          return mapResult<PostgresProps>(appName, app.hostname);
        }),

        update: Effect.fnUntraced(function* ({ output }) {
          // Postgres clusters don't support meaningful updates
          // Just verify it still exists
          const app = yield* api.get<FlyAppResponse>(`/apps/${output.appName}`);
          return mapResult<PostgresProps>(output.appName, app.hostname);
        }),

        delete: Effect.fnUntraced(function* ({ output }) {
          // Use flyctl to destroy the app
          const cmd = Command.make(
            "flyctl",
            "apps",
            "destroy",
            output.appName,
            "--yes",
          );

          yield* executor
            .start(cmd)
            .pipe(
              Effect.flatMap((process) => process.exitCode),
              Effect.catchAll(() => Effect.void),
            );
        }),

        read: Effect.fnUntraced(function* ({ id, output, olds }) {
          const appName =
            output?.appName ?? (yield* createAppName(id, olds?.appName));

          return yield* api
            .get<FlyAppResponse>(`/apps/${appName}`)
            .pipe(
              Effect.map((app) =>
                mapResult<PostgresProps>(appName, app.hostname),
              ),
              Effect.catchTag("NotFound", () => Effect.succeed(undefined)),
            );
        }),

        diff: Effect.fn(function* ({ id, olds, news, output }) {
          const appName = yield* createAppName(id, news.appName);

          // Any change requires replacement
          if (
            output.appName !== appName ||
            news.region !== olds.region ||
            news.vmSize !== olds.vmSize ||
            news.volumeSize !== olds.volumeSize
          ) {
            return { action: "replace" };
          }
        }),
      };
    }),
  );
