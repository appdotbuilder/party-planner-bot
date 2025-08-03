
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { conversationsTable } from '../db/schema';
import { type StartConversationInput } from '../schema';
import { startConversation } from '../handlers/start_conversation';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: StartConversationInput = {
  user_id: 'user123'
};

describe('startConversation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a conversation', async () => {
    const result = await startConversation(testInput);

    // Basic field validation
    expect(result.user_id).toEqual('user123');
    expect(result.current_state).toEqual('initial');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    
    // Nullable fields should be null initially
    expect(result.party_type).toBeNull();
    expect(result.city).toBeNull();
    expect(result.activity_preference).toBeNull();
    expect(result.party_name).toBeNull();
    expect(result.party_dates).toBeNull();
    expect(result.guest_count).toBeNull();
    expect(result.budget).toBeNull();
    expect(result.theme).toBeNull();
    expect(result.dining_preferences).toBeNull();
    expect(result.music_preferences).toBeNull();
    expect(result.day_activities).toBeNull();
    expect(result.night_activities).toBeNull();
  });

  it('should save conversation to database', async () => {
    const result = await startConversation(testInput);

    // Query using proper drizzle syntax
    const conversations = await db.select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, result.id))
      .execute();

    expect(conversations).toHaveLength(1);
    expect(conversations[0].user_id).toEqual('user123');
    expect(conversations[0].current_state).toEqual('initial');
    expect(conversations[0].created_at).toBeInstanceOf(Date);
    expect(conversations[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create multiple conversations for same user', async () => {
    const firstConversation = await startConversation(testInput);
    const secondConversation = await startConversation(testInput);

    expect(firstConversation.id).not.toEqual(secondConversation.id);
    expect(firstConversation.user_id).toEqual(secondConversation.user_id);
    expect(firstConversation.current_state).toEqual('initial');
    expect(secondConversation.current_state).toEqual('initial');

    // Verify both exist in database
    const conversations = await db.select()
      .from(conversationsTable)
      .where(eq(conversationsTable.user_id, 'user123'))
      .execute();

    expect(conversations).toHaveLength(2);
  });

  it('should create conversations for different users', async () => {
    const user1Input: StartConversationInput = { user_id: 'user1' };
    const user2Input: StartConversationInput = { user_id: 'user2' };

    const conversation1 = await startConversation(user1Input);
    const conversation2 = await startConversation(user2Input);

    expect(conversation1.user_id).toEqual('user1');
    expect(conversation2.user_id).toEqual('user2');
    expect(conversation1.id).not.toEqual(conversation2.id);

    // Verify correct user assignment in database
    const allConversations = await db.select()
      .from(conversationsTable)
      .execute();

    expect(allConversations).toHaveLength(2);
    const userIds = allConversations.map(c => c.user_id).sort();
    expect(userIds).toEqual(['user1', 'user2']);
  });
});
