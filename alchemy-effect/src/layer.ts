import type { Types } from "effect";
import type { Layer } from "effect/Layer";
import type { Pipeable } from "effect/Pipeable";
import type { Capability } from "./capability.ts";
import type { IRuntime } from "./runtime.ts";
import type { ServiceDef } from "./service.ts";

export const provide =
  <Out, Err, Cap extends Capability>(layer: Layer<Out, Err, Cap>) =>
  <Svc extends ServiceDef>(service: Svc): Unbound<Svc, Err, Cap> =>
    undefined!;

export interface Unbound<in ROut, out E = never, in out Capabilities = never>
  extends Unbound.Variance<ROut, E, Capabilities>, Pipeable {}

export const UnboundTypeId: unique symbol = Symbol.for("alchemy/UnboundLayer");

export declare namespace Unbound {
  export interface Variance<
    in ROut,
    out E = never,
    out Req = never,
    in out Capabilities = never,
  > {
    readonly [UnboundTypeId]: {
      readonly _ROut: Types.Contravariant<ROut>;
      readonly _E: Types.Covariant<E>;
      readonly _Req: Types.Covariant<Req>;
      readonly _Capabilities: Types.Invariant<Capabilities>;
    };
  }
}

export const HostedTypeId: unique symbol = Symbol.for("alchemy/HostedLayer");

export interface Hosted<
  F extends IRuntime,
  in ROut,
  out E = never,
  in out Capabilities = never,
> {}

export declare namespace Hosted {
  export interface Variance<
    F extends IRuntime,
    in ROut,
    out E = never,
    in out Capabilities = never,
  > {
    readonly [HostedTypeId]: {
      readonly _F: Types.Invariant<F>;
      readonly _ROut: Types.Contravariant<ROut>;
      readonly _E: Types.Covariant<E>;
      readonly _Capabilities: Types.Invariant<Capabilities>;
    };
  }
}
