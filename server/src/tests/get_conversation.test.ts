
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { conversationsTable } from '../db/schema';
import { getConversation } from '../handlers/get_conversation';
import { type StartConversationInput } from '../schema';

describe('getConversation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return conversation when it exists', async () => {
    // Create test conversation
    const testInput = {
      user_id: 'test-user-123',
      party_type: 'bachelor' as const,
      city: 'Las Vegas',
      activity_preference: 'nightlife' as const,
      party_name: 'Johns Bachelor Party',
      guest_count: 8,
      budget: 1500.00,
      theme: 'Casino Night',
      current_state: 'party_details' as const
    };

    const insertResult = await db.insert(conversationsTable)
      .values({
        ...testInput,
        budget: testInput.budget.toString()
      })
      .returning()
      .execute();

    const conversationId = insertResult[0].id;

    // Test retrieval
    const result = await getConversation(conversationId);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(conversationId);
    expect(result!.user_id).toEqual('test-user-123');
    expect(result!.party_type).toEqual('bachelor');
    expect(result!.city).toEqual('Las Vegas');
    expect(result!.activity_preference).toEqual('nightlife');
    expect(result!.party_name).toEqual('Johns Bachelor Party');
    expect(result!.guest_count).toEqual(8);
    expect(result!.budget).toEqual(1500.00);
    expect(typeof result!.budget).toBe('number');
    expect(result!.theme).toEqual('Casino Night');
    expect(result!.current_state).toEqual('party_details');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when conversation does not exist', async () => {
    const result = await getConversation(999);
    expect(result).toBeNull();
  });

  it('should handle conversation with null values', async () => {
    // Create minimal conversation
    const insertResult = await db.insert(conversationsTable)
      .values({
        user_id: 'test-user-456'
      })
      .returning()
      .execute();

    const conversationId = insertResult[0].id;
    const result = await getConversation(conversationId);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(conversationId);
    expect(result!.user_id).toEqual('test-user-456');
    expect(result!.party_type).toBeNull();
    expect(result!.city).toBeNull();
    expect(result!.activity_preference).toBeNull();
    expect(result!.party_name).toBeNull();
    expect(result!.party_dates).toBeNull();
    expect(result!.guest_count).toBeNull();
    expect(result!.budget).toBeNull();
    expect(result!.theme).toBeNull();
    expect(result!.dining_preferences).toBeNull();
    expect(result!.music_preferences).toBeNull();
    expect(result!.day_activities).toBeNull();
    expect(result!.night_activities).toBeNull();
    expect(result!.current_state).toEqual('initial');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should handle conversation with JSON string fields', async () => {
    // Create conversation with JSON fields
    const testInput = {
      user_id: 'test-user-789',
      party_dates: '["2024-06-15", "2024-06-16", "2024-06-17"]',
      dining_preferences: '["steakhouse", "rooftop", "buffet"]',
      music_preferences: '["hip-hop", "electronic", "rock"]',
      day_activities: '["pool party", "golf", "spa"]',
      night_activities: '["club", "casino", "bar crawl"]'
    };

    const insertResult = await db.insert(conversationsTable)
      .values(testInput)
      .returning()
      .execute();

    const conversationId = insertResult[0].id;
    const result = await getConversation(conversationId);

    expect(result).not.toBeNull();
    expect(result!.party_dates).toEqual('["2024-06-15", "2024-06-16", "2024-06-17"]');
    expect(result!.dining_preferences).toEqual('["steakhouse", "rooftop", "buffet"]');
    expect(result!.music_preferences).toEqual('["hip-hop", "electronic", "rock"]');
    expect(result!.day_activities).toEqual('["pool party", "golf", "spa"]');
    expect(result!.night_activities).toEqual('["club", "casino", "bar crawl"]');
  });
});
