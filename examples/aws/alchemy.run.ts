import * as Stack from "alchemy-effect/Stack";
import JobFunction from "./src/JobFunction.ts";

// group into stack
export default Stack.define({
  name: "job-service",
  resources: [JobFunction],
});
