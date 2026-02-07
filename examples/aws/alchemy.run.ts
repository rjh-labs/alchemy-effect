import * as Stack from "alchemy-effect/Stack";
import JobApi from "./src/JobApi.ts";

// group into stack
export default Stack.define({
  name: "job-service",
  resources: [JobApi],
});
