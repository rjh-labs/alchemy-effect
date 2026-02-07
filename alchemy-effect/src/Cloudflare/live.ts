import * as Layer from "effect/Layer";
import * as ESBuild from "../util/esbuild.ts";
import * as Account from "./account.ts";
import { CloudflareApi } from "./api.ts";
import * as KV from "./KV/index.ts";
import { namespaceProvider } from "./KV/namespace.provider.ts";
import { bucketProvider } from "./R2/bucket.provider.ts";
import * as R2 from "./R2/index.ts";
import { assetsProvider } from "./Worker/assets.provider.ts";
import { workerProvider } from "./Worker/worker.provider.ts";

import "./config.ts";

export const bindings = () =>
  Layer.mergeAll(KV.bindFromWorker(), R2.bindFromWorker());

export const defaultProviders = () =>
  Layer.mergeAll(
    Layer.provideMerge(
      workerProvider(),
      Layer.mergeAll(ESBuild.layer(), assetsProvider()),
    ),
    namespaceProvider(),
    bucketProvider(),
  ).pipe(Layer.provideMerge(bindings()));

export const providers = () =>
  defaultProviders().pipe(
    Layer.provideMerge(
      Layer.mergeAll(Account.fromStageConfig(), CloudflareApi.Default()),
    ),
  );
