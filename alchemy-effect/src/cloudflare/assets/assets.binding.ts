import * as FileSystem from "@effect/platform/FileSystem";
import * as Path from "@effect/platform/Path";
import { Binding, type Capability, type From } from "alchemy-effect";
import * as Effect from "effect/Effect";
import { Cloudflare } from "../api.ts";
import { Worker } from "../worker/index.ts";
import { Assets, type AssetsAttr, type AssetsProps } from "./assets.ts";

export interface Read<B = Assets<string, AssetsProps>>
  extends Capability<"Cloudflare.Assets.Read", B> {}

export const Read = Binding<
  <B extends Assets<string, AssetsProps>>(
    assets: B,
  ) => Binding<Worker, Read<From<B>>>
>(Worker, "Cloudflare.Assets.Read");

export const readFromWorker = () =>
  Read.provider.effect(
    Effect.gen(function* () {
      const cloudflare = yield* Cloudflare;
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;

      const upload = Effect.fn(function* (
        workerId: string,
        accountId: string,
        assets: AssetsAttr<AssetsProps>,
      ) {
        const session = yield* cloudflare.workers.scripts.assets.upload.create(
          workerId,
          {
            account_id: accountId,
            manifest: assets.manifest,
          },
        );
        if (!session.buckets?.length) {
          return { jwt: session.jwt };
        }
        const assetsByHash = new Map<string, string>();
        for (const [name, { hash }] of Object.entries(assets.manifest)) {
          assetsByHash.set(hash, name);
        }
        let jwt: string | undefined;
        yield* Effect.forEach(
          session.buckets,
          Effect.fn(function* (bucket) {
            const body: Record<string, string> = {};
            yield* Effect.forEach(
              bucket,
              Effect.fn(function* (hash) {
                const name = assetsByHash.get(hash);
                if (!name) {
                  return yield* Effect.fail(
                    new Error(`Asset ${hash} not found in manifest`),
                  );
                }
                const file = yield* fs.readFile(
                  path.join(assets.directory, name),
                );
                body[hash] = Buffer.from(file).toString("base64");
              }),
            );
            const result = yield* cloudflare.workers.assets.upload.create(
              {
                account_id: accountId,
                base64: true,
                body,
              },
              {
                headers: {
                  Authorization: `Bearer ${session.jwt}`,
                },
              },
            );
            if (result.jwt) {
              jwt = result.jwt;
            }
          }),
        );
        return { jwt };
      });

      return {
        attach: Effect.fn(function* ({ source, target }) {
          const result = yield* upload(
            target.attr.id,
            target.attr.accountId,
            source.attr,
          ).pipe(Effect.orDie); // todo: handle error?
          const modules: Worker.Module[] = [];
          if (source.attr._headers) {
            modules.push({
              name: "_headers",
              content_base64: Buffer.from(source.attr._headers).toString(
                "base64",
              ),
              content_type: "text/plain",
            });
          }
          if (source.attr._redirects) {
            modules.push({
              name: "_redirects",
              content_base64: Buffer.from(source.attr._redirects).toString(
                "base64",
              ),
              content_type: "text/plain",
            });
          }
          return {
            bindings: [
              {
                type: "assets",
                name: "ASSETS",
              },
            ],
            assets: {
              config: source.props.config,
              jwt: result.jwt,
            },
            modules,
          };
        }),
      };
    }),
  );
