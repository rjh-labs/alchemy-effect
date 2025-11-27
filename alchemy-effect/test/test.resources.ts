import * as Effect from "effect/Effect";
import { Resource } from "@/resource";
import type { Input } from "@/input";
import * as Layer from "effect/Layer";

// Bucket
export type BucketProps = {
  name?: string;
};

export type BucketAttr<Props extends BucketProps> = {
  name: Props["name"] extends string ? Props["name"] : string;
};

export interface Bucket<
  ID extends string = string,
  Props extends BucketProps = BucketProps,
> extends Resource<"Test.Bucket", ID, Props, BucketAttr<Props>> {}

export const Bucket = Resource<{
  <const ID extends string, const Props extends Input<BucketProps>>(
    id: ID,
    props?: Props,
  ): Bucket<ID, Input.Resolve<Props>>;
}>("Test.Bucket");

const bucketProvider = Bucket.provider.succeed({
  diff: Effect.fn(function* ({ id, news, output }) {}),
  create: Effect.fn(function* ({ id, news }) {
    return {
      name: news.name ?? id,
    };
  }),
  update: Effect.fn(function* ({ id, news, output }) {
    return output;
  }),
  delete: Effect.fn(function* ({ output }) {
    return;
  }),
});

// Queue
export type QueueProps = {
  name?: string;
};

export type QueueAttr<Props extends QueueProps> = {
  name: Props["name"] extends string ? Props["name"] : string;
  queueUrl: string;
};

export interface Queue<
  ID extends string = string,
  Props extends QueueProps = QueueProps,
> extends Resource<"Test.Queue", ID, Props, QueueAttr<Props>> {}

export const Queue = Resource<{
  <const ID extends string, const Props extends Input<QueueProps>>(
    id: ID,
    props?: Props,
  ): Queue<ID, Input.Resolve<Props>>;
}>("Test.Queue");

export const queueProvider = Queue.provider.succeed({
  diff: Effect.fn(function* ({ id, news, output }) {}),
  create: Effect.fn(function* ({ id, news }) {
    const name = news.name ?? id;
    return {
      name,
      queueUrl: `https://test.queue.com/${name}`,
    };
  }),
  update: Effect.fn(function* ({ id, news, output }) {
    const name = news.name ?? id;
    return {
      name,
      queueUrl: `https://test.queue.com/${name}`,
    };
  }),
  delete: Effect.fn(function* ({ output }) {}),
});

export type FunctionProps = {
  name?: string;
  env?: Record<string, string>;
};

export type FunctionAttr<Props extends FunctionProps> = {
  name: Props["name"] extends string ? Props["name"] : string;
};

export interface Function<
  ID extends string = string,
  Props extends Input<FunctionProps> = Input<FunctionProps>,
> extends Resource<
  "Test.Function",
  ID,
  Props,
  FunctionAttr<Input.Resolve<Props>>
> {}

export const Function = Resource<{
  <const ID extends string, const Props extends Input<FunctionProps>>(
    id: ID,
    props?: Props,
  ): Function<ID, Props>;
}>("Test.Function");

export const functionProvider = Function.provider.succeed({
  diff: Effect.fn(function* ({ id, news, output }) {}),
  create: Effect.fn(function* ({ id, news }) {
    return {
      name: news.name ?? id,
      env: news.env ?? {},
      functionArn: `arn:aws:lambda:us-west-2:084828582823:function:${id}`,
    };
  }),
  update: Effect.fn(function* ({ id, news, output }) {
    return {
      name: news.name ?? id,
      env: news.env ?? {},
      functionArn: `arn:aws:lambda:us-west-2:084828582823:function:${id}`,
    };
  }),
  delete: Effect.fn(function* ({ output }) {}),
});

// TestResource

export type TestResourceProps = {
  string?: string;
  stringArray?: string[];
};

export type TestResourceAttr<Props extends TestResourceProps> = {
  string: Props["string"] extends string ? Props["string"] : string;
  stringArray: Props["stringArray"] extends string[]
    ? Props["stringArray"]
    : string[];
  stableString: string;
  stableArray: string[];
};

export interface TestResource<
  ID extends string = string,
  Props extends Input<TestResourceProps> = Input<TestResourceProps>,
> extends Resource<
  "Test.TestResource",
  ID,
  Props,
  TestResourceAttr<Input.Resolve<Props>>
> {}

export const TestResource = Resource<{
  <const ID extends string, const Props extends Input<TestResourceProps>>(
    id: ID,
    props?: Props,
  ): TestResource<ID, Props>;
}>("Test.TestResource");

export const testResourceProvider = TestResource.provider.succeed({
  diff: Effect.fn(function* ({ id, news, olds }) {
    return news.string !== olds.string
      ? {
          action: "update",
          stables: ["stableString", "stableArray"],
        }
      : undefined;
  }),
  create: Effect.fn(function* ({ id, news }) {
    return {
      string: news.string ?? id,
      stringArray: news.stringArray ?? [],
      stableString: id,
      stableArray: [id],
    };
  }),
  update: Effect.fn(function* ({ id, news, output }) {
    return {
      string: news.string ?? id,
      stringArray: news.stringArray ?? [],
      stableString: id,
      stableArray: [id],
    };
  }),
  delete: Effect.fn(function* ({ output }) {
    return;
  }),
});

// Layers
export const TestLayers = Layer.mergeAll(
  bucketProvider,
  queueProvider,
  functionProvider,
  testResourceProvider,
);
