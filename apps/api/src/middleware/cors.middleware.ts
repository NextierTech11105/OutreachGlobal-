import { Injectable, NestMiddleware } from "@nestjs/common";
import { FastifyRequest, FastifyReply } from "fastify";

@Injectable()
export class CorsMiddleware implements NestMiddleware {
  use(req: FastifyRequest, res: FastifyReply["raw"], next: () => void) {
    const origin = req.headers.origin || "*";

    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization, apollographql-client-name, apollographql-client-version"
    );

    // Handle preflight
    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }

    next();
  }
}
