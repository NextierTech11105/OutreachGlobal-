import { GraphQLScalarType } from "graphql";

export const JSONScalar = new GraphQLScalarType({
  name: "JSON",
  description: "JSON scalar that accept anything",
  serialize(value) {
    return value;
  },
  parseValue: (value) => value,
  parseLiteral() {
    return null;
  },
});
