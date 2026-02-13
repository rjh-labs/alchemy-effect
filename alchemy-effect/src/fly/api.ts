import * as HttpClient from "@effect/platform/HttpClient";
import * as HttpClientError from "@effect/platform/HttpClientError";
import * as HttpClientRequest from "@effect/platform/HttpClientRequest";
import * as HttpClientResponse from "@effect/platform/HttpClientResponse";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import { FLY_API_TOKEN } from "./config.ts";

export class FlyApiError extends Data.Error<{
  _tag:
    | "Connection"
    | "BadRequest"
    | "Authentication"
    | "NotFound"
    | "Conflict"
    | "InternalServerError"
    | "Unknown";
  message: string;
  status: number;
  body?: unknown;
}> {
  static tagFromStatus(status: number): FlyApiError["_tag"] {
    switch (status) {
      case 400:
        return "BadRequest";
      case 401:
      case 403:
        return "Authentication";
      case 404:
        return "NotFound";
      case 409:
        return "Conflict";
      case 500:
      case 502:
      case 503:
      case 504:
        return "InternalServerError";
      default:
        return "Unknown";
    }
  }

  static fromHttpError(error: HttpClientError.HttpClientError): FlyApiError {
    if (error._tag === "ResponseError") {
      return new FlyApiError({
        _tag: FlyApiError.tagFromStatus(error.response.status),
        message: error.message,
        status: error.response.status,
      });
    }
    return new FlyApiError({
      _tag: "Connection",
      message: error.message,
      status: 0,
    });
  }
}

export class FlyApi extends Effect.Service<FlyApi>()("fly/api", {
  effect: Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;
    const token = yield* FLY_API_TOKEN;

    const baseUrl = "https://api.machines.dev/v1";
    const authToken = Option.getOrThrow(token);

    const request = <A>(
      method: "GET" | "POST" | "PUT" | "DELETE",
      path: string,
      options?: {
        body?: unknown;
        params?: Record<string, string | number | boolean>;
      },
    ): Effect.Effect<A, FlyApiError> => {
      const url = `${baseUrl}${path}`;
      let req = HttpClientRequest.make(method)(url);

      // Set bearer token
      req = HttpClientRequest.bearerToken(req, authToken);

      // Set URL params
      if (options?.params) {
        req = HttpClientRequest.setUrlParams(req, options.params);
      }

      // Set JSON body for non-GET requests
      if (options?.body && (method === "POST" || method === "PUT")) {
        req = HttpClientRequest.bodyUnsafeJson(req, options.body);
      }

      return client.execute(req).pipe(
        Effect.flatMap((response) =>
          response.text.pipe(
            Effect.flatMap((text) => {
              if (response.status >= 400) {
                let body: unknown;
                try {
                  body = JSON.parse(text);
                } catch {
                  body = text;
                }
                const tag = FlyApiError.tagFromStatus(response.status);
                return Effect.fail(
                  new FlyApiError({
                    _tag: tag,
                    message: `Fly API ${method} ${path}: ${response.status} ${typeof body === "object" && body !== null && "error" in body ? (body as any).error : text.slice(0, 200)}`,
                    status: response.status,
                    body,
                  }),
                );
              }
              return Effect.succeed(
                text.trim() === ""
                  ? (undefined as A)
                  : (JSON.parse(text) as A),
              );
            }),
          ),
        ),
        Effect.catchAll((error) =>
          error instanceof FlyApiError
            ? Effect.fail(error)
            : Effect.fail(FlyApiError.fromHttpError(error)),
        ),
      );
    };

    return {
      get: <A>(path: string, params?: Record<string, string | number | boolean>) =>
        request<A>("GET", path, { params }),
      post: <A>(path: string, body?: unknown) =>
        request<A>("POST", path, { body }),
      put: <A>(path: string, body?: unknown) =>
        request<A>("PUT", path, { body }),
      delete: <A>(path: string, params?: Record<string, string | number | boolean>) =>
        request<A>("DELETE", path, { params }),
    };
  }),
}) {}
