import * as Stack from "alchemy-effect/Stack";
import JobService from "./src/job-api.ts";

// group into stack
export default Stack.define({
  name: "job-service",
  resources: [JobService],
});
