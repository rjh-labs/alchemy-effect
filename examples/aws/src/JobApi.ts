import * as Alchemy from "alchemy-effect";
import * as Http from "alchemy-effect/Http";
import * as Router from "alchemy-effect/Router";
import * as Rpc from "alchemy-effect/Rpc";
import * as Service from "alchemy-effect/Service";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { getJob, GetJob } from "./routes/GetJob.ts";
import { putJob, PutJob } from "./routes/PutJob.ts";

export class JobApi extends Alchemy.Endpoint("JobApi", {
  routes: [GetJob, PutJob],
  protocols: [Http.Protocol, Rpc.Protocol],
}) {}

export const jobApi = Service.effect(
  JobApi,
  Router.makeHttpRouter(getJob, putJob).pipe(
    Effect.provide(Layer.mergeAll(Http.ServerProtocol, Rpc.ServerProtocol)),
  ),
);
