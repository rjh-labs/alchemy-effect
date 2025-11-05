import * as FileSystem from "@effect/platform/FileSystem";
import * as Path from "@effect/platform/Path";
import type { Workers } from "cloudflare/resources/workers/beta.mjs";
import * as Effect from "effect/Effect";
import { App } from "../../app.ts";
import {
  Cloudflare,
  CloudflareAccountId,
  notFoundToUndefined,
} from "../api.ts";
import { Worker, type WorkerAttr, type WorkerProps } from "./worker.ts";

export const workerProvider = () =>
  Worker.provider.effect(
    Effect.gen(function* () {
      const app = yield* App;
      const api = yield* Cloudflare;
      const accountId = yield* CloudflareAccountId;
      const path = yield* Path.Path;
      const dotAlchemy = path.join(process.cwd(), ".alchemy");
      const fs = yield* FileSystem.FileSystem;
      const prepareBundle = Effect.fn(function* (
        id: string,
        props: WorkerProps,
      ) {
        const { bundle } = yield* Effect.promise(
          () => import("./worker.bundle.ts"),
        );
        const file = path.relative(process.cwd(), props.main);
        const outfile = path.join(
          dotAlchemy,
          "out",
          `${app.name}-${app.stage}-${id}.js`,
        );
        yield* bundle({
          // entryPoints: [props.main],
          // we use a virtual entry point so that
          stdin: {
            contents: `import { default as handler } from "./${file}";\nexport default handler;`,
            resolveDir: process.cwd(),
            loader: "ts",
            sourcefile: "__index.ts",
          },
          bundle: true,
          format: "esm",
          platform: "node",
          target: "node22",
          sourcemap: false,
          treeShaking: true,
          write: true,
          outfile,
        });
        return yield* fs.readFile(outfile).pipe(Effect.catchAll(Effect.die));
      });

      const createWorkerName = (id: string, props: WorkerProps | undefined) =>
        props?.name ?? `${app.name}-${id}-${app.stage}`.toLowerCase();

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

      const { isDeepStrictEqual } = yield* Effect.promise(
        () => import("node:util"),
      );

      const createWorker = yield* Effect.cachedFunction(
        Effect.fn(function* (params: Workers.WorkerCreateParams) {
          console.log("createWorker", params);
          const worker = yield* api.workers.beta.workers.create(params);
          console.log("worker created", worker);
          return mapResult(worker, params.account_id);
        }),
        (a, b) => isDeepStrictEqual(a, b),
      );

      const createVersion = Effect.fn(function* (
        workerId: string,
        accountId: string,
        props: WorkerProps,
        bindings: Array<Worker["binding"]>,
      ) {
        console.log("cwd", process.cwd());
        const code = yield* prepareBundle(workerId, props);
        let assets: Worker.Assets | undefined;
        const resolvedBindings: Worker.Binding[] = [];
        const modules: Worker.Module[] = [
          {
            name: "worker.js",
            content_base64: Buffer.from(code).toString("base64"),
            content_type: "application/javascript+module",
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
        console.dir({
          bindings: resolvedBindings,
          modules,
          assets,
        });
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
        diff: ({ id, olds, news, output }) =>
          Effect.sync(() => {
            if (output.accountId !== accountId) {
              return { action: "replace" };
            }
            const name = createWorkerName(id, news);
            if (name !== output.name) {
              return { action: "replace" }; // this shouldn't be necessary
            }
            return { action: "update" };
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
        stub: Effect.fn(function* ({ id, news }) {
          console.log("worker stub", id, news);
          return yield* createWorker({
            account_id: accountId,
            name: createWorkerName(id, news),
            logpush: news.logpush,
            observability: news.observability,
            subdomain: news.subdomain,
            tags: news.tags,
            tail_consumers: [], // todo
          });
        }),
        create: Effect.fn(function* ({ id, news, bindings }) {
          console.log("worker create", id, news);
          const worker = yield* createWorker({
            account_id: accountId,
            name: createWorkerName(id, news),
            logpush: news.logpush,
            observability: news.observability,
            subdomain: news.subdomain,
            tags: news.tags,
            tail_consumers: [], // todo
          });
          yield* Effect.addFinalizer(
            Effect.fn(function* (exit) {
              if (exit._tag === "Failure") {
                yield* api.workers.beta.workers
                  .delete(worker.id, {
                    account_id: accountId,
                  })
                  .pipe(notFoundToUndefined(), Effect.orDie);
              }
            }),
          );
          const version = yield* createVersion(
            worker.id,
            accountId,
            news,
            bindings,
          );
          return worker;
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
