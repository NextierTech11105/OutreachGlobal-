import {
  ApolloClient,
  ApolloLink,
  HttpLink,
  InMemoryCache,
  InMemoryCacheConfig,
  NormalizedCacheObject,
  from,
} from "@apollo/client";

export interface CreateApolloOptions {
  uri: string;
  cacheConfig?: InMemoryCacheConfig;
  authLinkContext?: () => Record<string, any>;
}

export const APOLLO_STATE_PROP_NAME = "__APOLLO_STATE__";

const createCache = (config?: InMemoryCacheConfig) => {
  return new InMemoryCache(config);
};

// Simple error logging link (replaces onError from deep import)
const errorLink = new ApolloLink((operation, forward) => {
  return forward(operation).map((response) => {
    if (response.errors) {
      response.errors.forEach((error) => {
        console.log(
          `[GraphQL client error]: Message: ${error.message}, Path: ${error.path}`,
        );
      });
    }
    return response;
  });
});

// Auth link (replaces setContext from deep import)
const createAuthLink = (options: CreateApolloOptions) => {
  return new ApolloLink((operation, forward) => {
    const operationName = operation.operationName;
    let uri = options.uri;
    const mergedHeaders = options?.authLinkContext?.() ?? {};

    if (operationName) {
      uri = `${uri}?operation=${operationName}`;
    }

    operation.setContext(({ headers = {} }) => ({
      headers: {
        ...headers,
        ...mergedHeaders,
      },
      uri,
    }));

    return forward(operation);
  });
};

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

    const authLink = createAuthLink(options);

    this.client = new ApolloClient({
      ssrMode: typeof window === "undefined",
      link: from([authLink, errorLink, httpLink]),
      cache: createCache(options?.cacheConfig),
    });

    return this.client;
  }
}
