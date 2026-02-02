import { render } from "@opentui/solid";
import * as Layer from "effect/Layer";
import {
  createContext,
  createSignal,
  type Accessor,
  type ParentProps,
} from "solid-js";
import {
  deriveGraph,
  type AspectGraph,
  type Organization,
} from "../aspect/index.ts";
import type { TuiPlugin } from "./plugin.ts";
import { ThemeProvider } from "./theme/theme.tsx";

export const defineTui = <Org extends Organization>(organization: Org) => {
  const graph = deriveGraph(organization);
  return {
    GraphContext: createContext<Org | null>(null),
  };
};

export interface GraphProviderProps<
  Org extends Organization,
> extends ParentProps {
  plugins: Layer.Layer<TuiPlugin<Org>>;
}

export const GraphProvider = <Org extends Organization>(
  props: GraphProviderProps<Org>,
) => {
  const [graph, setGraph] = createSignal<AspectGraph<Org> | null>(null);
  const GraphContext = createContext<{
    graph: Accessor<AspectGraph<Org> | null>;
    setGraph: (graph: AspectGraph<Org>) => void;
  }>();

  return (
    <GraphContext.Provider
      value={{
        graph,
        setGraph,
      }}
    >
      {props.children}
    </GraphContext.Provider>
  );
};

render(
  () => (
    <ThemeProvider mode="dark">
      {/* <GraphProvider> */}
      <text>Hello, World!</text>
      {/* </GraphProvider> */}
    </ThemeProvider>
  ),
  {
    targetFps: 60,
    exitOnCtrlC: true,
  },
);
