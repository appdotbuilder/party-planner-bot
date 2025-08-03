
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { conversationsTable, messagesTable } from '../db/schema';
import { type Conversation } from '../schema';
import { processBotResponse } from '../handlers/process_bot_response';
import { eq } from 'drizzle-orm';

describe('processBotResponse', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testConversation: Conversation;

  beforeEach(async () => {
    // Create a test conversation
    const result = await db.insert(conversationsTable)
      .values({
        user_id: 'test-user-123',
        current_state: 'initial'
      })
      .returning()
      .execute();

    testConversation = {
      ...result[0],
      budget: result[0].budget ? parseFloat(result[0].budget) : null
    };
  });

  it('should generate initial greeting message', async () => {
    const result = await processBotResponse(testConversation, 'Hello');

    expect(result.message_type).toEqual('bot');
    expect(result.conversation_id).toEqual(testConversation.id);
    expect(result.content).toContain('Hi there!');
    expect(result.content).toContain('bachelor or bachelorette');
    expect(result.metadata).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.id).toBeDefined();
  });

  it('should respond appropriately to party type state', async () => {
    testConversation.current_state = 'party_type';

    const result = await processBotResponse(testConversation, 'bachelor party');

    expect(result.content).toContain('bachelor party');
    expect(result.content).toContain('which city');
  });

  it('should handle bachelorette party response', async () => {
    testConversation.current_state = 'party_type';

    const result = await processBotResponse(testConversation, 'bachelorette');

    expect(result.content).toContain('bachelorette party');
    expect(result.content).toContain('which city');
  });

  it('should ask for clarification on unclear party type', async () => {
    testConversation.current_state = 'party_type';

    const result = await processBotResponse(testConversation, 'I need help planning');

    expect(result.content).toContain('bachelor or bachelorette');
  });

  it('should respond contextually to city selection', async () => {
    testConversation.current_state = 'city';

    const result = await processBotResponse(testConversation, 'Las Vegas');

    expect(result.content).toContain('Las Vegas');
    expect(result.content).toContain('amazing place');
    expect(result.content).toContain('Activities, a complete package, or nightlife');
  });

  it('should handle activity preference responses', async () => {
    testConversation.current_state = 'activity_preference';

    const result = await processBotResponse(testConversation, 'activities');

    expect(result.content).toContain('Activity-focused');
    expect(result.content).toContain('name of the person');
  });

  it('should handle package preference', async () => {
    testConversation.current_state = 'activity_preference';

    const result = await processBotResponse(testConversation, 'complete package');

    expect(result.content).toContain('complete package');
    expect(result.content).toContain('name of the person');
  });

  it('should handle nightlife preference', async () => {
    testConversation.current_state = 'activity_preference';

    const result = await processBotResponse(testConversation, 'nightlife focused');

    expect(result.content).toContain('Nightlife');
    expect(result.content).toContain('name of the person');
  });

  it('should save message to database', async () => {
    const result = await processBotResponse(testConversation, 'Hello');

    const messages = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.id, result.id))
      .execute();

    expect(messages).toHaveLength(1);
    expect(messages[0].conversation_id).toEqual(testConversation.id);
    expect(messages[0].message_type).toEqual('bot');
    expect(messages[0].content).toEqual(result.content);
    expect(messages[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle party details state', async () => {
    testConversation.current_state = 'party_details';

    const result = await processBotResponse(testConversation, 'John Smith');

    expect(result.content).toContain('preferences');
    expect(result.content).toContain('dates');
  });

  it('should handle preferences state', async () => {
    testConversation.current_state = 'preferences';

    const result = await processBotResponse(testConversation, 'March 15-17');

    expect(result.content).toContain('amazing');
    expect(result.content).toContain('themes');
  });

  it('should handle generating itinerary state', async () => {
    testConversation.current_state = 'generating_itinerary';

    const result = await processBotResponse(testConversation, 'Sounds great!');

    expect(result.content).toContain('working on creating');
    expect(result.content).toContain('perfect');
  });

  it('should handle completed state', async () => {
    testConversation.current_state = 'completed';

    const result = await processBotResponse(testConversation, 'Thank you!');

    expect(result.content).toContain('itinerary is ready');
    expect(result.content).toContain('amazing celebration');
  });

  it('should provide default response for unknown states', async () => {
    // Force an unknown state for testing
    const unknownConversation = {
      ...testConversation,
      current_state: 'unknown_state' as any
    };

    const result = await processBotResponse(unknownConversation, 'Help me');

    expect(result.content).toContain('Tell me more');
    expect(result.content).toContain('unforgettable');
  });
});
