import * as Effect from "effect/Effect";
import { Instance, type InstanceProps } from "./instance.ts";

/**
 * Create an EC2 instance that serves HTTP requests.
 *
 * The server will run continuously on the specified port and handle incoming
 * HTTP requests using the provided fetch handler.
 *
 * @example
 * ```typescript
 * import * as EC2 from "alchemy-effect/aws/ec2";
 * import * as S3 from "alchemy-effect/aws/s3";
 * import * as Effect from "effect/Effect";
 * import { $ } from "alchemy-effect";
 *
 * class DataBucket extends S3.Bucket("data", {}) {}
 *
 * class MyServer extends EC2.Instance.serve("my-server", {
 *   port: 3000,
 *   fetch: Effect.fn(function* (req) {
 *     yield* S3.putObject(DataBucket, { key: "log.txt", body: "request received" });
 *     return new Response("Hello from EC2!");
 *   }),
 * })({
 *   main: import.meta.filename,
 *   subnetId: publicSubnet.attr.subnetId,
 *   securityGroupIds: [webSg.attr.groupId],
 *   bindings: $(S3.PutObject(DataBucket)),
 * }) {}
 *
 * export default MyServer.handler.pipe(EC2.toHandler);
 * ```
 */
export const serve =
  <const ID extends string, Req>(
    id: ID,
    {
      port = 3000,
      fetch,
    }: {
      /**
       * The port to listen on.
       * @default 3000
       */
      port?: number;
      /**
       * The Effect-based fetch handler for incoming HTTP requests.
       * Receives a Request object and should return a Response.
       */
      fetch: (req: Request) => Effect.Effect<Response, never, Req>;
    },
  ) =>
  <const Props extends InstanceProps.Simplified<Req>>(props: Props) =>
    Instance(id, {
      handle: () =>
        Effect.gen(function* () {
          // Create a simple HTTP server using Node.js built-in http module
          const http = yield* Effect.promise(() => import("node:http"));

          const server = http.createServer(async (req, res) => {
            try {
              // Convert Node.js request to Web Request
              const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
              const headers = new Headers();
              for (const [key, value] of Object.entries(req.headers)) {
                if (value) {
                  headers.set(key, Array.isArray(value) ? value.join(", ") : value);
                }
              }

              const body =
                req.method !== "GET" && req.method !== "HEAD"
                  ? await new Promise<Uint8Array>((resolve) => {
                      const chunks: Buffer[] = [];
                      req.on("data", (chunk) => chunks.push(chunk));
                      req.on("end", () => {
                        const buffer = Buffer.concat(chunks);
                        resolve(new Uint8Array(buffer));
                      });
                    })
                  : undefined;

              const request = new Request(url.toString(), {
                method: req.method,
                headers,
                body: body as BodyInit | undefined,
              });

              // Run the Effect-based handler
              const response = await Effect.runPromise(
                fetch(request) as Effect.Effect<Response, never, never>,
              );

              // Write response
              res.statusCode = response.status;
              response.headers.forEach((value, key) => {
                res.setHeader(key, value);
              });
              const responseBody = await response.text();
              res.end(responseBody);
            } catch (error) {
              console.error("Request handler error:", error);
              res.statusCode = 500;
              res.end("Internal Server Error");
            }
          });

          // Start listening
          yield* Effect.async<void>((resume) => {
            server.listen(port, () => {
              console.log(`Server listening on port ${port}`);
              resume(Effect.void);
            });
          });

          // Keep running forever
          yield* Effect.never;
        }),
    })(props);
