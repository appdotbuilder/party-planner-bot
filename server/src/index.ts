
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  startConversationInputSchema,
  sendMessageInputSchema,
  updateConversationInputSchema,
  createItineraryInputSchema,
  getConversationHistoryInputSchema
} from './schema';

// Import handlers
import { startConversation } from './handlers/start_conversation';
import { sendMessage } from './handlers/send_message';
import { updateConversation } from './handlers/update_conversation';
import { getConversation } from './handlers/get_conversation';
import { getConversationHistory } from './handlers/get_conversation_history';
import { createItinerary } from './handlers/create_itinerary';
import { getItineraries } from './handlers/get_itineraries';
import { processBotResponse } from './handlers/process_bot_response';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Conversation management
  startConversation: publicProcedure
    .input(startConversationInputSchema)
    .mutation(({ input }) => startConversation(input)),

  getConversation: publicProcedure
    .input(z.object({ conversationId: z.number() }))
    .query(({ input }) => getConversation(input.conversationId)),

  updateConversation: publicProcedure
    .input(updateConversationInputSchema)
    .mutation(({ input }) => updateConversation(input)),

  // Message handling
  sendMessage: publicProcedure
    .input(sendMessageInputSchema)
    .mutation(({ input }) => sendMessage(input)),

  getConversationHistory: publicProcedure
    .input(getConversationHistoryInputSchema)
    .query(({ input }) => getConversationHistory(input)),

  // Itinerary management
  createItinerary: publicProcedure
    .input(createItineraryInputSchema)
    .mutation(({ input }) => createItinerary(input)),

  getItineraries: publicProcedure
    .input(z.object({ conversationId: z.number() }))
    .query(({ input }) => getItineraries(input.conversationId)),

  // Bot response processing
  processBotResponse: publicProcedure
    .input(z.object({ 
      conversationId: z.number(), 
      userMessage: z.string() 
    }))
    .mutation(async ({ input }) => {
      const conversation = await getConversation(input.conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }
      return processBotResponse(conversation, input.userMessage);
    }),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
