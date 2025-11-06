import { Binding, type Capability, type To } from "alchemy-effect";
import { Worker } from "../worker/index.ts";
import { R2Bucket, type R2BucketProps } from "./r2-bucket.ts";

export interface Bind<B = R2Bucket<string, R2BucketProps>>
  extends Capability<"Cloudflare.R2Bucket.Bind", B> {}

export const Bind = Binding<
  <B extends R2Bucket<string, R2BucketProps>>(
    bucket: B,
  ) => Binding<Worker, Bind<To<B>>>
>(Worker, "Cloudflare.R2Bucket.Bind");

export const bindFromWorker = () =>
  Bind.provider.succeed({
    attach: ({ source }) => ({
      bindings: [
        {
          type: "r2_bucket",
          name: source.id,
          bucket_name: source.attr.name,
          jurisdiction:
            source.attr.jurisdiction === "default"
              ? undefined
              : source.attr.jurisdiction,
        },
      ],
    }),
  });
