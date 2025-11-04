import { Binding, type Capability, type To } from "alchemy-effect";
import { Worker } from "../worker/index.ts";
import { KVNamespace, type KVNamespaceProps } from "./kv-namespace.ts";

export interface Bind<B = KVNamespace<string, KVNamespaceProps>>
  extends Capability<"Cloudflare.KVNamespace.Bind", B> {}

export const Bind = Binding<
  <B extends KVNamespace<string, KVNamespaceProps>>(
    bucket: B,
  ) => Binding<Worker, Bind<To<B>>>
>(Worker, "Cloudflare.KVNamespace.Bind");

export const bindFromWorker = () =>
  Bind.provider.succeed({
    attach: ({ source }) => ({
      bindings: [
        {
          type: "kv_namespace",
          name: source.attr.title, // todo: standardize binding name
          namespace_id: source.attr.namespaceId,
        },
      ],
    }),
  });
