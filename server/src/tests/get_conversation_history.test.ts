
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { conversationsTable, messagesTable } from '../db/schema';
import { type GetConversationHistoryInput } from '../schema';
import { getConversationHistory } from '../handlers/get_conversation_history';

// Test input with default limit applied by Zod
const testInput: GetConversationHistoryInput = {
  conversation_id: 1,
  limit: 50
};

describe('getConversationHistory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array for non-existent conversation', async () => {
    const result = await getConversationHistory(testInput);
    expect(result).toEqual([]);
  });

  it('should return messages in chronological order', async () => {
    // Create a conversation first
    const conversationResult = await db.insert(conversationsTable)
      .values({
        user_id: 'test-user-1',
        current_state: 'initial'
      })
      .returning()
      .execute();

    const conversationId = conversationResult[0].id;

    // Create multiple messages with different timestamps
    await db.insert(messagesTable)
      .values([
        {
          conversation_id: conversationId,
          message_type: 'bot',
          content: 'First message'
        },
        {
          conversation_id: conversationId,
          message_type: 'user',
          content: 'Second message'
        },
        {
          conversation_id: conversationId,
          message_type: 'bot',
          content: 'Third message'
        }
      ])
      .execute();

    const result = await getConversationHistory({
      conversation_id: conversationId,
      limit: 50
    });

    expect(result).toHaveLength(3);
    expect(result[0].content).toEqual('First message');
    expect(result[1].content).toEqual('Second message');
    expect(result[2].content).toEqual('Third message');
    
    // Verify chronological order
    expect(result[0].created_at.getTime()).toBeLessThanOrEqual(result[1].created_at.getTime());
    expect(result[1].created_at.getTime()).toBeLessThanOrEqual(result[2].created_at.getTime());
  });

  it('should respect limit parameter', async () => {
    // Create a conversation first
    const conversationResult = await db.insert(conversationsTable)
      .values({
        user_id: 'test-user-1',
        current_state: 'initial'
      })
      .returning()
      .execute();

    const conversationId = conversationResult[0].id;

    // Create 5 messages
    const messages = Array.from({ length: 5 }, (_, i) => ({
      conversation_id: conversationId,
      message_type: 'user' as const,
      content: `Message ${i + 1}`
    }));

    await db.insert(messagesTable)
      .values(messages)
      .execute();

    // Test with limit of 3
    const result = await getConversationHistory({
      conversation_id: conversationId,
      limit: 3
    });

    expect(result).toHaveLength(3);
    // Should get the first 3 messages in chronological order
    expect(result[0].content).toEqual('Message 1');
    expect(result[1].content).toEqual('Message 2');
    expect(result[2].content).toEqual('Message 3');
  });

  it('should return correct message structure', async () => {
    // Create a conversation first
    const conversationResult = await db.insert(conversationsTable)
      .values({
        user_id: 'test-user-1',
        current_state: 'initial'
      })
      .returning()
      .execute();

    const conversationId = conversationResult[0].id;

    // Create a single message
    await db.insert(messagesTable)
      .values({
        conversation_id: conversationId,
        message_type: 'bot',
        content: 'Test message',
        metadata: '{"type": "greeting"}'
      })
      .execute();

    const result = await getConversationHistory({
      conversation_id: conversationId,
      limit: 50
    });

    expect(result).toHaveLength(1);
    const message = result[0];
    
    expect(message.id).toBeDefined();
    expect(message.conversation_id).toEqual(conversationId);
    expect(message.message_type).toEqual('bot');
    expect(message.content).toEqual('Test message');
    expect(message.metadata).toEqual('{"type": "greeting"}');
    expect(message.created_at).toBeInstanceOf(Date);
  });

  it('should filter messages by conversation_id', async () => {
    // Create two conversations
    const conversation1Result = await db.insert(conversationsTable)
      .values({
        user_id: 'test-user-1',
        current_state: 'initial'
      })
      .returning()
      .execute();

    const conversation2Result = await db.insert(conversationsTable)
      .values({
        user_id: 'test-user-2',
        current_state: 'initial'
      })
      .returning()
      .execute();

    const conversation1Id = conversation1Result[0].id;
    const conversation2Id = conversation2Result[0].id;

    // Create messages for both conversations
    await db.insert(messagesTable)
      .values([
        {
          conversation_id: conversation1Id,
          message_type: 'user',
          content: 'Message for conversation 1'
        },
        {
          conversation_id: conversation2Id,
          message_type: 'user',
          content: 'Message for conversation 2'
        }
      ])
      .execute();

    // Get history for conversation 1
    const result = await getConversationHistory({
      conversation_id: conversation1Id,
      limit: 50
    });

    expect(result).toHaveLength(1);
    expect(result[0].conversation_id).toEqual(conversation1Id);
    expect(result[0].content).toEqual('Message for conversation 1');
  });
});
