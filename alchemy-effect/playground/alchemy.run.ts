// @ts-nocheck
import JobService from "./job-service.ts";

// group into stack
export default defineStack({
  name: "job-service",
  resources: [JobService],
});
