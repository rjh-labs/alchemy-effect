import type { ExecutionContext } from "@cloudflare/workers-types";
import type { Capability } from "../../Capability.ts";
import type { Hosted, Unbound } from "../../layer.ts";
import type { ServiceDef } from "../../service.ts";
import * as Worker from "./worker.ts";

export type * from "../../exports.ts";
export type { ExecutionContext };

export const serve =
  <const Props extends Worker.WorkerProps>(props: Props) =>
  <Svc extends ServiceDef, Err, Cap extends Capability>(
    t: Unbound<Svc, Err, Cap>,
  ): Hosted<Worker.Worker, InstanceType<Svc>, Err, Cap> =>
    undefined!;

// export const serve = <const ID extends string, Req>(
//   id: ID,
//   {
//     fetch,
//   }: {
//     fetch: (
//       request: Request,
//       env: unknown,
//       ctx: ExecutionContext,
//     ) => Effect.Effect<Response, never, Req>;
//   },
// ) => Worker.Worker(id, { handle: fetch });
// // <const Props extends Worker.WorkerProps<Req>>(props: Props) =>
// //   Worker.Worker(id, { handle: fetch })(props);
