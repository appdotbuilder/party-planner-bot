
import { serial, text, pgTable, timestamp, numeric, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define enums
export const partyTypeEnum = pgEnum('party_type', ['bachelor', 'bachelorette']);
export const activityPreferenceEnum = pgEnum('activity_preference', ['activities', 'package', 'nightlife']);
export const conversationStateEnum = pgEnum('conversation_state', [
  'initial',
  'party_type',
  'city',
  'activity_preference',
  'party_details',
  'preferences',
  'generating_itinerary',
  'completed'
]);
export const messageTypeEnum = pgEnum('message_type', ['user', 'bot', 'system']);

// Conversations table
export const conversationsTable = pgTable('conversations', {
  id: serial('id').primaryKey(),
  user_id: text('user_id').notNull(),
  party_type: partyTypeEnum('party_type'),
  city: text('city'),
  activity_preference: activityPreferenceEnum('activity_preference'),
  party_name: text('party_name'),
  party_dates: text('party_dates'), // JSON string for date ranges
  guest_count: integer('guest_count'),
  budget: numeric('budget', { precision: 10, scale: 2 }),
  theme: text('theme'),
  dining_preferences: text('dining_preferences'), // JSON string
  music_preferences: text('music_preferences'), // JSON string
  day_activities: text('day_activities'), // JSON string
  night_activities: text('night_activities'), // JSON string
  current_state: conversationStateEnum('current_state').notNull().default('initial'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Messages table
export const messagesTable = pgTable('messages', {
  id: serial('id').primaryKey(),
  conversation_id: integer('conversation_id').notNull(),
  message_type: messageTypeEnum('message_type').notNull(),
  content: text('content').notNull(),
  metadata: text('metadata'), // JSON string for rich media content
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Itineraries table
export const itinerariesTable = pgTable('itineraries', {
  id: serial('id').primaryKey(),
  conversation_id: integer('conversation_id').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  activities: text('activities').notNull(), // JSON string for structured activities
  estimated_cost: numeric('estimated_cost', { precision: 10, scale: 2 }),
  media_urls: text('media_urls'), // JSON string for image/video URLs
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Relations
export const conversationsRelations = relations(conversationsTable, ({ many }) => ({
  messages: many(messagesTable),
  itineraries: many(itinerariesTable)
}));

export const messagesRelations = relations(messagesTable, ({ one }) => ({
  conversation: one(conversationsTable, {
    fields: [messagesTable.conversation_id],
    references: [conversationsTable.id]
  })
}));

export const itinerariesRelations = relations(itinerariesTable, ({ one }) => ({
  conversation: one(conversationsTable, {
    fields: [itinerariesTable.conversation_id],
    references: [conversationsTable.id]
  })
}));

// TypeScript types for the table schemas
export type Conversation = typeof conversationsTable.$inferSelect;
export type NewConversation = typeof conversationsTable.$inferInsert;
export type Message = typeof messagesTable.$inferSelect;
export type NewMessage = typeof messagesTable.$inferInsert;
export type Itinerary = typeof itinerariesTable.$inferSelect;
export type NewItinerary = typeof itinerariesTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  conversations: conversationsTable,
  messages: messagesTable,
  itineraries: itinerariesTable
};
