import {
  ApolloClient,
  HttpLink,
  InMemoryCache,
  InMemoryCacheConfig,
  NormalizedCacheObject,
  from,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import { createPersistedQueryLink } from "@apollo/client/link/persisted-queries";
import { createHash } from "crypto";
export interface CreateApolloOptions {
  uri: string;
  cacheConfig?: InMemoryCacheConfig;
  authLinkContext?: () => Record<string, any>;
}

export const APOLLO_STATE_PROP_NAME = "__APOLLO_STATE__";

function sha256(data: any) {
  const hash = createHash("sha256");
  hash.update(data);

  const result = hash.digest("hex");

  return result;
}

const createCache = (config?: InMemoryCacheConfig) => {
  return new InMemoryCache(config);
};

const persistQueryLink = createPersistedQueryLink({ sha256 });

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.map(({ message, locations, path }) => {
      console.log(
        `[GraphQL client error]: Message: ${message}, Location: ${locations}, Path: ${path}`,
      );
    });
  }

  if (networkError) {
    console.log(`[client Network error]: ${networkError}`);
  }
});

export class ApolloClientInstance {
  static client: ApolloClient<NormalizedCacheObject>;
  static getClient(options: CreateApolloOptions) {
    // only reused apollo on client side / browser
    if (this.client && typeof window !== "undefined") {
      return this.client;
    }

    const httpLink = new HttpLink({
      uri: options.uri,
      credentials: "same-origin",
    });

    const authLink = setContext((operation, { headers }) => {
      const operationName = operation.operationName;
      let uri = options.uri;
      const mergedHeaders = options?.authLinkContext?.() ?? {};

      if (operationName) {
        uri = `${uri}?operation=${operationName}`;
      }
      return {
        headers: {
          ...headers,
          ...mergedHeaders,
        },
        uri,
      };
    });

    this.client = new ApolloClient({
      ssrMode: typeof window === "undefined",
      link: from([authLink, errorLink, persistQueryLink.concat(httpLink)]),
      cache: createCache(options?.cacheConfig),
    });

    return this.client;
  }
}
