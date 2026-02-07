import { Binding } from "../../Binding.ts";
import type { Capability } from "../../Capability.ts";
import type { To } from "../../Policy.ts";
import { Worker } from "../Worker/worker.ts";
import type { Bucket } from "./bucket.ts";

export interface Bind<B = Bucket> extends Capability<
  "Cloudflare.R2.Bucket.Bind",
  B
> {}

export const Bind = Binding<
  <B extends Bucket>(bucket: B) => Binding<Worker, Bind<To<B>>>
>(Worker, "Cloudflare.R2.Bucket.Bind");

export const bindFromWorker = () =>
  Bind.provider.succeed({
    attach: ({ source }) => ({
      bindings: [
        {
          type: "r2_bucket",
          name: source.id,
          bucket_name: source.attr.bucketName,
          jurisdiction:
            source.attr.jurisdiction === "default"
              ? undefined
              : source.attr.jurisdiction,
        },
      ],
    }),
  });
