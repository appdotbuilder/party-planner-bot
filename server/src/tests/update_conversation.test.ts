
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { conversationsTable } from '../db/schema';
import { type UpdateConversationInput } from '../schema';
import { updateConversation } from '../handlers/update_conversation';
import { eq } from 'drizzle-orm';

describe('updateConversation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update conversation fields', async () => {
    // Create initial conversation
    const initialConversation = await db.insert(conversationsTable)
      .values({
        user_id: 'test-user-123',
        current_state: 'initial'
      })
      .returning()
      .execute();

    const conversationId = initialConversation[0].id;

    // Update conversation with party planning details
    const updateInput: UpdateConversationInput = {
      conversation_id: conversationId,
      party_type: 'bachelor',
      city: 'Las Vegas',
      activity_preference: 'nightlife',
      party_name: 'John\'s Bachelor Party',
      guest_count: 8,
      budget: 2500.50,
      theme: 'Casino Night',
      current_state: 'party_details'
    };

    const result = await updateConversation(updateInput);

    // Verify updated fields
    expect(result.id).toEqual(conversationId);
    expect(result.party_type).toEqual('bachelor');
    expect(result.city).toEqual('Las Vegas');
    expect(result.activity_preference).toEqual('nightlife');
    expect(result.party_name).toEqual('John\'s Bachelor Party');
    expect(result.guest_count).toEqual(8);
    expect(result.budget).toEqual(2500.50);
    expect(result.theme).toEqual('Casino Night');
    expect(result.current_state).toEqual('party_details');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update only provided fields', async () => {
    // Create initial conversation with some data
    const initialConversation = await db.insert(conversationsTable)
      .values({
        user_id: 'test-user-456',
        party_type: 'bachelorette',
        city: 'Miami',
        current_state: 'party_type'
      })
      .returning()
      .execute();

    const conversationId = initialConversation[0].id;

    // Update only specific fields
    const updateInput: UpdateConversationInput = {
      conversation_id: conversationId,
      activity_preference: 'activities',
      guest_count: 12,
      current_state: 'activity_preference'
    };

    const result = await updateConversation(updateInput);

    // Verify updated fields
    expect(result.activity_preference).toEqual('activities');
    expect(result.guest_count).toEqual(12);
    expect(result.current_state).toEqual('activity_preference');

    // Verify unchanged fields remain the same
    expect(result.party_type).toEqual('bachelorette');
    expect(result.city).toEqual('Miami');
    expect(result.user_id).toEqual('test-user-456');
  });

  it('should save updated conversation to database', async () => {
    // Create initial conversation
    const initialConversation = await db.insert(conversationsTable)
      .values({
        user_id: 'test-user-789',
        current_state: 'initial'
      })
      .returning()
      .execute();

    const conversationId = initialConversation[0].id;

    // Update conversation
    const updateInput: UpdateConversationInput = {
      conversation_id: conversationId,
      party_dates: '{"start": "2024-06-15", "end": "2024-06-17"}',
      dining_preferences: '["steakhouse", "rooftop"]',
      music_preferences: '["rock", "pop"]',
      budget: 1800.75
    };

    await updateConversation(updateInput);

    // Verify changes were saved to database
    const savedConversation = await db.select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, conversationId))
      .execute();

    expect(savedConversation).toHaveLength(1);
    expect(savedConversation[0].party_dates).toEqual('{"start": "2024-06-15", "end": "2024-06-17"}');
    expect(savedConversation[0].dining_preferences).toEqual('["steakhouse", "rooftop"]');
    expect(savedConversation[0].music_preferences).toEqual('["rock", "pop"]');
    expect(parseFloat(savedConversation[0].budget!)).toEqual(1800.75);
  });

  it('should handle JSON string fields correctly', async () => {
    // Create initial conversation
    const initialConversation = await db.insert(conversationsTable)
      .values({
        user_id: 'test-user-json',
        current_state: 'preferences'
      })
      .returning()
      .execute();

    const conversationId = initialConversation[0].id;

    // Update with JSON string fields
    const updateInput: UpdateConversationInput = {
      conversation_id: conversationId,
      day_activities: '["spa", "pool", "shopping"]',
      night_activities: '["clubs", "bars", "shows"]',
      dining_preferences: '["italian", "sushi", "fine dining"]',
      music_preferences: '["edm", "hip hop", "latin"]'
    };

    const result = await updateConversation(updateInput);

    // Verify JSON fields are stored as strings
    expect(result.day_activities).toEqual('["spa", "pool", "shopping"]');
    expect(result.night_activities).toEqual('["clubs", "bars", "shows"]');
    expect(result.dining_preferences).toEqual('["italian", "sushi", "fine dining"]');
    expect(result.music_preferences).toEqual('["edm", "hip hop", "latin"]');
  });

  it('should throw error for non-existent conversation', async () => {
    const updateInput: UpdateConversationInput = {
      conversation_id: 999999,
      party_type: 'bachelor'
    };

    await expect(updateConversation(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should handle null values correctly', async () => {
    // Create conversation with some data
    const initialConversation = await db.insert(conversationsTable)
      .values({
        user_id: 'test-user-null',
        party_type: 'bachelor',
        city: 'New York',
        budget: '1500.00',
        current_state: 'party_details'
      })
      .returning()
      .execute();

    const conversationId = initialConversation[0].id;

    // Update some fields to null (by not providing them, existing data remains)
    const updateInput: UpdateConversationInput = {
      conversation_id: conversationId,
      theme: 'Sports Theme',
      current_state: 'preferences'
    };

    const result = await updateConversation(updateInput);

    // Verify existing fields remain unchanged
    expect(result.party_type).toEqual('bachelor');
    expect(result.city).toEqual('New York');
    expect(result.budget).toEqual(1500);

    // Verify new field was added
    expect(result.theme).toEqual('Sports Theme');
    expect(result.current_state).toEqual('preferences');
  });
});
