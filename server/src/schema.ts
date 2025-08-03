
import { z } from 'zod';

// Enums for better type safety
export const partyTypeSchema = z.enum(['bachelor', 'bachelorette']);
export type PartyType = z.infer<typeof partyTypeSchema>;

export const activityPreferenceSchema = z.enum(['activities', 'package', 'nightlife']);
export type ActivityPreference = z.infer<typeof activityPreferenceSchema>;

export const conversationStateSchema = z.enum([
  'initial',
  'party_type',
  'city',
  'activity_preference',
  'party_details',
  'preferences',
  'generating_itinerary',
  'completed'
]);
export type ConversationState = z.infer<typeof conversationStateSchema>;

export const messageTypeSchema = z.enum(['user', 'bot', 'system']);
export type MessageType = z.infer<typeof messageTypeSchema>;

// Chat conversation schema
export const conversationSchema = z.object({
  id: z.number(),
  user_id: z.string(),
  party_type: partyTypeSchema.nullable(),
  city: z.string().nullable(),
  activity_preference: activityPreferenceSchema.nullable(),
  party_name: z.string().nullable(),
  party_dates: z.string().nullable(), // JSON string for date ranges
  guest_count: z.number().int().nullable(),
  budget: z.number().nullable(),
  theme: z.string().nullable(),
  dining_preferences: z.string().nullable(), // JSON string for preferences
  music_preferences: z.string().nullable(), // JSON string for preferences
  day_activities: z.string().nullable(), // JSON string for activities
  night_activities: z.string().nullable(), // JSON string for activities
  current_state: conversationStateSchema,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Conversation = z.infer<typeof conversationSchema>;

// Chat message schema
export const messageSchema = z.object({
  id: z.number(),
  conversation_id: z.number(),
  message_type: messageTypeSchema,
  content: z.string(),
  metadata: z.string().nullable(), // JSON string for rich media content
  created_at: z.coerce.date()
});

export type Message = z.infer<typeof messageSchema>;

// Itinerary schema for generated suggestions
export const itinerarySchema = z.object({
  id: z.number(),
  conversation_id: z.number(),
  title: z.string(),
  description: z.string(),
  activities: z.string(), // JSON string for structured activities
  estimated_cost: z.number().nullable(),
  media_urls: z.string().nullable(), // JSON string for image/video URLs
  created_at: z.coerce.date()
});

export type Itinerary = z.infer<typeof itinerarySchema>;

// Input schemas for API operations
export const startConversationInputSchema = z.object({
  user_id: z.string()
});

export type StartConversationInput = z.infer<typeof startConversationInputSchema>;

export const sendMessageInputSchema = z.object({
  conversation_id: z.number(),
  content: z.string(),
  message_type: messageTypeSchema.optional().default('user')
});

export type SendMessageInput = z.infer<typeof sendMessageInputSchema>;

export const updateConversationInputSchema = z.object({
  conversation_id: z.number(),
  party_type: partyTypeSchema.optional(),
  city: z.string().optional(),
  activity_preference: activityPreferenceSchema.optional(),
  party_name: z.string().optional(),
  party_dates: z.string().optional(),
  guest_count: z.number().int().optional(),
  budget: z.number().optional(),
  theme: z.string().optional(),
  dining_preferences: z.string().optional(),
  music_preferences: z.string().optional(),
  day_activities: z.string().optional(),
  night_activities: z.string().optional(),
  current_state: conversationStateSchema.optional()
});

export type UpdateConversationInput = z.infer<typeof updateConversationInputSchema>;

export const createItineraryInputSchema = z.object({
  conversation_id: z.number(),
  title: z.string(),
  description: z.string(),
  activities: z.string(),
  estimated_cost: z.number().optional(),
  media_urls: z.string().optional()
});

export type CreateItineraryInput = z.infer<typeof createItineraryInputSchema>;

export const getConversationHistoryInputSchema = z.object({
  conversation_id: z.number(),
  limit: z.number().int().optional().default(50)
});

export type GetConversationHistoryInput = z.infer<typeof getConversationHistoryInputSchema>;
