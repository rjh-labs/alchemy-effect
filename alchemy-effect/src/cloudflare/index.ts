import * as Layer from "effect/Layer";
import { Cloudflare, CloudflareAccountId } from "./api.ts";
import * as Assets from "./assets/index.ts";
import * as KVNamespace from "./kv-namespace/index.ts";
import * as R2Bucket from "./r2-bucket/index.ts";
import * as Worker from "./worker/index.ts";

export * as Assets from "./assets/index.ts";
export * as KVNamespace from "./kv-namespace/index.ts";
export * as R2Bucket from "./r2-bucket/index.ts";
export * as Worker from "./worker/index.ts";

export const providers = Layer.mergeAll(
  Assets.assetsProvider(),
  KVNamespace.kvNamespaceProvider(),
  R2Bucket.r2BucketProvider(),
  Worker.workerProvider(),
);

export const bindings = Layer.mergeAll(
  Assets.readFromWorker(),
  KVNamespace.bindFromWorker(),
  R2Bucket.bindFromWorker(),
);

export const clients = Layer.merge(Assets.client(), KVNamespace.client());

export const defaultProviders = providers.pipe(
  Layer.provideMerge(bindings),
  Layer.provide(clients),
);

export const live = defaultProviders.pipe(
  Layer.provide(Cloudflare.Default({})),
  Layer.provide(CloudflareAccountId.fromEnv),
);
