---
trigger: always_on
---

# Rules for backend inside apps/api
Backend use nestjs, fastify, apollo server + graphql, drizzle-orm

## File structures and naming conventions
Follow this structures and naming conventions
src/
├── app/
│   ├── user/
│   │   ├── objects/
│   │   ├── models/
│   │   ├── resolvers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── inputs/
│   │   ├── args/
│   │   └── user.module.ts
├── common/
│   ├── decorators/
│   ├── guards/
│   ├── interceptors/
│   ├── pipes/
│   └── filters/
├── database/
│   ├── schema/
|-- lib/

### objects/{name}.object.ts
Usually contains custom graphql object type and mutation payload

### models/{name}.model.ts
Graphql object type and entities that connect with the drizzle schema

### resolvers/{name}.resolver.ts
Graphql resolvers for handling CRUD

### services/{name}.service.ts
business logic like read or writing to or from database

### repositories/{name}.repository.ts
business logic if services are too long to handle read and writing

### inputs/{name}.input.ts
graphql InputType that implement DTO from packages/dto
- one entity for one file e.g user.input.ts
- unleash its too long or need to separate, we can split it like create-user.input.ts

### args/{name}.args.ts
graphQL args types for each model resolvers e.g user.args.ts

## Basic Principles
- use nestjs best practice and naming convention
- use singular for common nestjs file such as service e.g user.service.ts
- use modular architecture
- one module per domain/resolver
- one graphql resolver for its route
- the patterns should be resolver->service when reading or writing business logic
- do not create redundant method or function especially in class where the classname already represents what it is e.g creating user in UserService should be `create` instead of `createUser` unleash the method is not directly used for it e.g `createToken` is not represent user but related

## Always Remember
- Use proper TypeScript types throughout
- Follow NestJS lifecycle hooks appropriately
- Use dependency injection instead of direct imports as much as possible, usually for common nestjs lifecycle like service, repository, etc
- Implement proper data validation at all entry points
- when working on CRUD especially `delete` use `remove` instead of delete since we use drizzle eslint plugin and it cause the delete method to have a `where` chain function, but keep types or interfaces as is, as well as `delete` that has suffix or prefix e.g `deleteUser` = keep delete user instead changing to `removeUser`
