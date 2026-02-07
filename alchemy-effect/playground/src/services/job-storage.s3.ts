// @ts-nocheck

// AWS S3 implementation of JobStorage
export class Jobs extends S3.Bucket("Jobs") {}

export const s3JobStorage = Service.effect(
  JobStorage,
  Effect.gen(function* () {
    return {
      putJob: (job) =>
        // S3.PutObject<Jobs>
        S3.putObject(Jobs, {
          key: job.id,
          body: JSON.stringify(job),
        }).pipe(
          Effect.flatMap(() => Effect.void),
          Effect.orDie,
        ),
      getJob: (jobId) =>
        // S3.GetObject<Jobs>
        S3.getObject(Jobs, {
          key: jobId,
        }).pipe(
          Effect.map((item) => item.Body as any),
          Effect.orDie,
        ),
    };
  }),
);
