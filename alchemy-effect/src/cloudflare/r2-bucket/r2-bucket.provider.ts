import type { R2 } from "cloudflare/resources.mjs";
import * as Effect from "effect/Effect";
import { App } from "../../app.ts";
import {
  Cloudflare,
  CloudflareAccountId,
  notFoundToUndefined,
} from "../api.ts";
import {
  R2Bucket,
  type R2BucketAttr,
  type R2BucketProps,
} from "./r2-bucket.ts";

export const r2BucketProvider = () =>
  R2Bucket.provider.effect(
    Effect.gen(function* () {
      const app = yield* App;
      const api = yield* Cloudflare;
      const accountId = yield* CloudflareAccountId;

      const createName = (id: string, props: R2BucketProps) =>
        props.name ?? `${app.name}-${id}-${app.stage}`;

      const mapResult = Effect.fn(function* (bucket: R2.Bucket) {
        if (!bucket.name) {
          return yield* Effect.die("Bucket name is required");
        }
        return {
          name: bucket.name,
          storageClass: bucket.storage_class ?? "Standard",
          jurisdiction: bucket.jurisdiction ?? "default",
          location: bucket.location,
          accountId,
        } as R2BucketAttr<R2BucketProps>;
      });

      return {
        diff: ({ id, olds, news, output }) =>
          Effect.sync(() => {
            if (
              output.accountId !== accountId ||
              output.name !== createName(id, news) ||
              output.jurisdiction !== news.jurisdiction ||
              olds.locationHint !== news.locationHint
            ) {
              return { action: "replace" };
            }
            if (output.storageClass !== news.storageClass) {
              return { action: "update" };
            }
            return { action: "noop" };
          }),
        read: Effect.fn(function* ({ id, olds, output }) {
          if (output?.name) {
            return yield* api.r2.buckets
              .get(output.name, {
                account_id: output.accountId,
              })
              .pipe(Effect.flatMap(mapResult), notFoundToUndefined());
          }
          const name = createName(id, olds ?? {});
          const list = yield* api.r2.buckets.list({
            // todo: pagination
            account_id: accountId,
            name_contains: name,
          });
          const bucket = list.buckets?.find((bucket) => bucket.name === name);
          return bucket ? yield* mapResult(bucket) : undefined;
        }),
        create: Effect.fn(function* ({ id, news }) {
          const bucket = yield* api.r2.buckets.create({
            account_id: accountId,
            name: news.name ?? `${app.name}-${id}-${app.stage}`,
            storageClass: news.storageClass,
            jurisdiction: news.jurisdiction,
            locationHint: news.locationHint,
          });
          return yield* mapResult(bucket);
        }),
        update: Effect.fn(function* ({ news, output }) {
          const bucket = yield* api.r2.buckets.edit(output.name, {
            account_id: output.accountId,
            storage_class: news.storageClass ?? output.storageClass,
            jurisdiction: news.jurisdiction ?? output.jurisdiction,
          });
          return yield* mapResult(bucket);
        }),
        delete: Effect.fn(function* ({ output }) {
          yield* api.r2.buckets
            .delete(output.name, {
              account_id: output.accountId,
            })
            .pipe(notFoundToUndefined());
        }),
      };
    }),
  );
