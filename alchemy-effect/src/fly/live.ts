import * as Layer from "effect/Layer";
import { FlyApi } from "./api.ts";
import * as FlyOrg from "./context.ts";
import { appProvider } from "./app/app.provider.ts";
import { machineProvider } from "./machine/machine.provider.ts";
import { postgresProvider } from "./postgres/cluster.provider.ts";
import { secretProvider } from "./secret/secret.provider.ts";

import "./config.ts";

export const providers = () =>
  Layer.mergeAll(
    appProvider(),
    machineProvider(),
    postgresProvider(),
    secretProvider(),
  ).pipe(
    Layer.provideMerge(
      Layer.mergeAll(FlyOrg.fromStageConfig(), FlyApi.Default),
    ),
  );
