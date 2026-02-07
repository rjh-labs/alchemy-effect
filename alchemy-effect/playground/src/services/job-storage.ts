// @ts-nocheck

// TAG
export class JobStorage extends Service.Tag("JobStorage")<
  JobStorage,
  {
    putJob: (job: Job) => Effect.Effect<void>;
    getJob: (jobId: string) => Effect.Effect<Job | undefined>;
  }
>() {}

// Cloudflare DO implementation of JobStorage
export class JobDO extends Cloudflare.DurableObject("JobDO") {}

export const doJobStorage = DurableObject.effect(
  JobStorage,
  Effect.gen(function* () {
    const sqlite = yield* DurableObject.SQLite;
    const externalState = yield* ExternalState;
    // Constructor
    const ref = yield* Ref.make<any>();
    return {
      putJob: (job) => Effect.void,
    };
  }),
);
