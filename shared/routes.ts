import { z } from 'zod';
import { insertConversationSchema, conversations, messages } from './schema.js';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  conversations: {
    list: {
      method: 'GET' as const,
      path: '/api/conversations',
      responses: {
        200: z.array(z.custom<typeof conversations.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/conversations/:id',
      responses: {
        200: z.object({
          conversation: z.custom<typeof conversations.$inferSelect>(),
          messages: z.array(z.custom<typeof messages.$inferSelect>()),
        }),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/conversations',
      input: insertConversationSchema.omit({ userId: true }),
      responses: {
        201: z.custom<typeof conversations.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/conversations/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
  },
  messages: {
    create: {
      method: 'POST' as const,
      path: '/api/conversations/:id/messages',
      input: z.object({
        content: z.string().min(1), // User's message in native language
      }),
      responses: {
        201: z.array(z.custom<typeof messages.$inferSelect>()), // Returns [userMsg, assistantMsg]
        404: errorSchemas.notFound,
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type Conversation = z.infer<typeof api.conversations.get.responses[200]>['conversation'];
export type Message = z.infer<typeof api.conversations.get.responses[200]>['messages'][0];
