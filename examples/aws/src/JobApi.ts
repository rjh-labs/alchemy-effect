import * as Alchemy from "alchemy-effect";
import * as Client from "alchemy-effect/Client";
import * as ContentType from "alchemy-effect/ContentType";
import * as Http from "alchemy-effect/Http";
import * as Server from "alchemy-effect/Server";
import * as Layer from "effect/Layer";

import { getJob, GetJob } from "./routes/GetJob.ts";
import { putJob, PutJob } from "./routes/PutJob.ts";

export class JobApi extends Alchemy.Endpoint("JobApi", {
  routes: [GetJob, PutJob],
  protocols: [Http.Rest, Http.JsonRpc],
  accepts: [ContentType.Json, ContentType.Xml, ContentType.MessagePack],
}) {}

export const jobApi = Server.make(JobApi).pipe(
  Layer.provide([Http.RestServer, Http.JsonRpcServer]),
  Layer.provide([ContentType.JsonCodec, ContentType.XmlCodec]),
  Layer.provide([getJob, putJob]),
);

export const jobClient = Client.make(JobApi).pipe(
  Layer.provide([Http.RestClient, Http.JsonRpcClient]),
  Layer.provide([ContentType.JsonCodec, ContentType.XmlCodec]),
);
