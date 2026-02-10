import { Client, ContentType, Server } from "alchemy-effect";
import * as Http from "alchemy-effect/Http";
import * as Layer from "effect/Layer";

import { getJob, GetJob } from "./api/GetJob.ts";
import { putJob, PutJob } from "./api/PutJob.ts";

export class JobApi extends Server.Endpoint("JobApi", {
  // coming from here
  routes: [GetJob, PutJob],
  protocols: [Http.Rest, Http.JsonRpc],
  accepts: [ContentType.Json, ContentType.Xml, ContentType.MessagePack],
}) {}

export const jobApi = Server.make(JobApi).pipe(
  Layer.provide([Http.RestServer, Http.JsonRpcServer]),
  Layer.provide([getJob, putJob]),
  // codec requirements come from GetJob and PutJob
  Layer.provide([
    ContentType.JsonCodec,
    ContentType.XmlCodec,
    ContentType.MessagePackCodec,
  ]),
);

export const jobClient = Client.make(JobApi).pipe(
  Layer.provide([Http.RestClient, Http.JsonRpcClient]),
  Layer.provide([ContentType.JsonCodec, ContentType.XmlCodec]),
);
