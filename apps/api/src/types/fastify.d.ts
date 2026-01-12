// ===========================================
// Fastify Type Declarations
// ===========================================

import 'fastify';
import '@fastify/jwt';

// User payload structure
interface UserPayload {
  id: string;
  email: string;
  name: string;
  level: number;
  isAdmin?: boolean;
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    startTime?: number;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: UserPayload;
    user: UserPayload;
  }
}
