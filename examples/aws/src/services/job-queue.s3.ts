// @ts-nocheck

// IMPLEMENTATION (cloud specific)
export const s3JobWorker = EventSource.effect(
  JobQueue,
  Effect.gen(function* () {
    const jobStorage = yield* JobStorage;

    // this only runs at runtime, but it projects a S3.Consume<Jobs> capability requirement
    return S3.consume(Jobs, {
      // that means we can't configure infra here
      // GOOD: no co-mingling of business logic and infrastructure
      process: (stream) =>
        stream.pipe(
          Stream.map((item) => item.Body as any),
          Stream.tapSink(jobStorage.sink),
          Stream.run,
        ),
    });
  }),
);
