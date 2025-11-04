import type { Workers } from "cloudflare/resources/workers/beta.mjs";
import * as Effect from "effect/Effect";
import { App } from "../../app.ts";
import {
  Cloudflare,
  CloudflareAccountId,
  notFoundToUndefined,
} from "../api.ts";
import { bundle } from "./worker.bundle.ts";
import { Worker, type WorkerAttr, type WorkerProps } from "./worker.ts";

export const workerProvider = () =>
  Worker.provider.effect(
    Effect.gen(function* () {
      const app = yield* App;
      const api = yield* Cloudflare;
      const accountId = yield* CloudflareAccountId;

      const createWorkerName = (id: string, props: WorkerProps | undefined) =>
        props?.name ?? `${app.name}-${id}-${app.stage}`;

      const mapResult = (
        worker: Workers.Worker,
        accountId: string,
      ): WorkerAttr<WorkerProps> => ({
        id: worker.id,
        name: worker.name,
        logpush: worker.logpush,
        observability: worker.observability,
        subdomain: worker.subdomain,
        tags: worker.tags,
        accountId,
      });

      const createVersion = Effect.fn(function* (
        workerId: string,
        accountId: string,
        props: WorkerProps,
        bindings: Array<Worker["binding"]>,
      ) {
        const { code, hash } = yield* bundle({
          entryPoints: [props.main],
          bundle: true,
          format: "esm",
        });
        let assets: Worker.Assets | undefined;
        const resolvedBindings: Worker.Binding[] = [];
        const modules: Worker.Module[] = [
          {
            name: "worker.js",
            content_base64: Buffer.from(code).toString("base64"),
            content_type: "application/javascript",
          },
        ];
        for (const binding of bindings) {
          if (binding.bindings) {
            resolvedBindings.push(...binding.bindings);
          }
          if (binding.assets) {
            assets = binding.assets;
          }
          if (binding.modules) {
            modules.push(...binding.modules);
          }
        }
        return yield* api.workers.beta.workers.versions.create(workerId, {
          account_id: accountId,
          deploy: true,
          compatibility_date: props.compatibility?.date,
          compatibility_flags: props.compatibility?.flags,
          limits: props.limits,
          placement: props.placement,
          bindings: resolvedBindings,
          main_module: "worker.js",
          modules,
          migrations: undefined,
          annotations: undefined,
          assets,
        });
      });

      return {
        diff: ({ output }) =>
          Effect.sync(() => {
            if (output.accountId !== accountId) {
              return { action: "replace" };
            }
            // todo: diff
            return { action: "noop" };
          }),
        read: Effect.fn(function* ({ id, olds, output }) {
          const workerId = output?.id ?? createWorkerName(id, olds);
          const workerAccountId = output?.accountId ?? accountId;
          return yield* api.workers.beta.workers
            .get(workerId, {
              account_id: workerAccountId,
            })
            .pipe(
              Effect.map((worker) => mapResult(worker, workerAccountId)),
              notFoundToUndefined(),
            );
        }),
        create: Effect.fn(function* ({ id, news, bindings }) {
          const worker = yield* api.workers.beta.workers.create({
            account_id: accountId,
            name: createWorkerName(id, news),
            logpush: news.logpush,
            observability: news.observability,
            subdomain: news.subdomain,
            tags: news.tags,
            tail_consumers: [], // todo
          });
          const version = yield* createVersion(
            worker.id,
            accountId,
            news,
            bindings,
          );
          return mapResult(worker, accountId);
        }),
        update: Effect.fn(function* ({ id, news, output, bindings }) {
          const worker = yield* api.workers.beta.workers.update(output.id, {
            account_id: output.accountId,
            name: createWorkerName(id, news),
            logpush: news.logpush,
            observability: news.observability,
            subdomain: news.subdomain,
            tags: news.tags,
            tail_consumers: [], // todo
          });
          const version = yield* createVersion(
            worker.id,
            output.accountId,
            news,
            bindings,
          );
          return mapResult(worker, output.accountId);
        }),
        delete: Effect.fn(function* ({ output }) {
          yield* api.workers.beta.workers
            .delete(output.id, {
              account_id: output.accountId,
            })
            .pipe(notFoundToUndefined());
        }),
      };
    }),
  );
