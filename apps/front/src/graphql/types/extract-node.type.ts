// extract the node from connection edge

interface Edge extends Record<string, any> {
  node: Record<string, any>;
}

interface Connection extends Record<string, any> {
  edges: Edge[];
}

export type ExtractNode<T extends Connection> = T["edges"][number]["node"];
