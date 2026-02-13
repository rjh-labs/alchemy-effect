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
  static fromHttpError(error: HttpClientError.HttpClientError): FlyApiError {
    if (error._tag === "ResponseError") {
      const status = error.response.status;
      let tag: FlyApiError["_tag"];
      switch (status) {
        case 400:
          tag = "BadRequest";
          break;
        case 401:
        case 403:
          tag = "Authentication";
          break;
        case 404:
          tag = "NotFound";
          break;
        case 409:
          tag = "Conflict";
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          tag = "InternalServerError";
          break;
        default:
          tag = "Unknown";
      }
      return new FlyApiError({
        _tag: tag,
        message: error.message,
        status,
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
            Effect.map((text) =>
              text.trim() === "" ? (undefined as A) : (JSON.parse(text) as A),
            ),
          ),
        ),
        Effect.mapError(FlyApiError.fromHttpError),
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
