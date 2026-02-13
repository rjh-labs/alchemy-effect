import * as Effect from "effect/Effect";
import * as Schedule from "effect/Schedule";
import { createPhysicalName } from "../../physical-name.ts";
import { FlyApi } from "../api.ts";
import { Machine, type MachineAttr, type MachineProps } from "./machine.ts";

type FlyMachineResponse = {
  id: string;
  instance_id: string;
  state: string;
  region: string;
  name: string;
  config: unknown;
};

export const machineProvider = () =>
  Machine.provider.effect(
    Effect.gen(function* () {
      const api = yield* FlyApi;

      const createMachineName = (id: string, name: string | undefined) =>
        Effect.gen(function* () {
          if (name) return name;
          return yield* createPhysicalName({
            id,
            maxLength: 63,
            lowercase: true,
          });
        });

      const mapResult = <Props extends MachineProps>(
        machine: FlyMachineResponse,
        app: string,
      ): MachineAttr<Props> =>
        ({
          machineId: machine.id,
          instanceId: machine.instance_id,
          state: machine.state,
          region: machine.region,
          name: machine.name,
          app,
        }) as MachineAttr<Props>;

      return {
        create: Effect.fnUntraced(function* ({ id, news }) {
          const name = yield* createMachineName(id, news.name);

          // Retry on 403/404 — App may be creating concurrently
          // (Fly returns 403 when app doesn't exist yet)
          const machine = yield* api
            .post<FlyMachineResponse>(`/apps/${news.app}/machines`, {
              name,
              region: news.region,
              config: news.config,
            })
            .pipe(
              Effect.retry({
                times: 10,
                schedule: Schedule.spaced("2 seconds"),
                while: (err) =>
                  err._tag === "Authentication" || err._tag === "NotFound",
              }),
            );

          return mapResult<MachineProps>(machine, news.app);
        }),

        update: Effect.fnUntraced(function* ({ news, output }) {
          // Update machine configuration
          const machine = yield* api.post<FlyMachineResponse>(
            `/apps/${news.app}/machines/${output.machineId}`,
            {
              config: news.config,
            },
          );

          return mapResult<MachineProps>(machine, news.app);
        }),

        delete: Effect.fnUntraced(function* ({ output }) {
          yield* api
            .delete(`/apps/${output.app}/machines/${output.machineId}`, {
              force: true,
            })
            .pipe(Effect.catchTag("NotFound", () => Effect.void));
        }),

        read: Effect.fnUntraced(function* ({ output }) {
          if (!output) return undefined;

          return yield* api
            .get<FlyMachineResponse>(
              `/apps/${output.app}/machines/${output.machineId}`,
            )
            .pipe(
              Effect.map((m) => mapResult<MachineProps>(m, output.app)),
              Effect.catchTag("NotFound", () => Effect.succeed(undefined)),
            );
        }),

        diff: Effect.fn(function* ({ id, olds, news, output }) {
          const name = yield* createMachineName(id, news.name);

          // Replace if app, region, or name changes
          if (
            output.app !== news.app ||
            (news.region && output.region !== news.region) ||
            output.name !== name
          ) {
            return { action: "replace" };
          }

          // Otherwise update if config changed
          if (
            JSON.stringify(news.config) !== JSON.stringify(olds.config)
          ) {
            return { action: "update" };
          }
        }),
      };
    }),
  );
