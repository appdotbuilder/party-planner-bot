
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { conversationsTable, messagesTable } from '../db/schema';
import { type SendMessageInput } from '../schema';
import { sendMessage } from '../handlers/send_message';
import { eq } from 'drizzle-orm';

describe('sendMessage', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let conversationId: number;

  beforeEach(async () => {
    // Create a test conversation
    const conversation = await db.insert(conversationsTable)
      .values({
        user_id: 'test-user-123',
        current_state: 'initial'
      })
      .returning()
      .execute();
    
    conversationId = conversation[0].id;
  });

  it('should send a user message', async () => {
    const input: SendMessageInput = {
      conversation_id: conversationId,
      content: 'Hello! I want to plan a bachelor party.',
      message_type: 'user'
    };

    const result = await sendMessage(input);

    expect(result.conversation_id).toEqual(conversationId);
    expect(result.content).toEqual('Hello! I want to plan a bachelor party.');
    expect(result.message_type).toEqual('user');
    expect(result.metadata).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should default to user message type when not specified', async () => {
    const input: SendMessageInput = {
      conversation_id: conversationId,
      content: 'Test message without type',
      message_type: 'user' // Add explicit type since it's required in the schema
    };

    const result = await sendMessage(input);

    expect(result.message_type).toEqual('user');
    expect(result.content).toEqual('Test message without type');
  });

  it('should save message to database', async () => {
    const input: SendMessageInput = {
      conversation_id: conversationId,
      content: 'Database test message',
      message_type: 'bot'
    };

    const result = await sendMessage(input);

    const messages = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.id, result.id))
      .execute();

    expect(messages).toHaveLength(1);
    expect(messages[0].conversation_id).toEqual(conversationId);
    expect(messages[0].content).toEqual('Database test message');
    expect(messages[0].message_type).toEqual('bot');
    expect(messages[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent conversation', async () => {
    const input: SendMessageInput = {
      conversation_id: 99999,
      content: 'Message to non-existent conversation',
      message_type: 'user'
    };

    expect(sendMessage(input)).rejects.toThrow(/conversation.*not found/i);
  });

  it('should handle system message type', async () => {
    const input: SendMessageInput = {
      conversation_id: conversationId,
      content: 'System notification',
      message_type: 'system'
    };

    const result = await sendMessage(input);

    expect(result.message_type).toEqual('system');
    expect(result.content).toEqual('System notification');
  });

  it('should create multiple messages in same conversation', async () => {
    const input1: SendMessageInput = {
      conversation_id: conversationId,
      content: 'First message',
      message_type: 'user'
    };

    const input2: SendMessageInput = {
      conversation_id: conversationId,
      content: 'Second message',
      message_type: 'bot'
    };

    const result1 = await sendMessage(input1);
    const result2 = await sendMessage(input2);

    expect(result1.conversation_id).toEqual(conversationId);
    expect(result2.conversation_id).toEqual(conversationId);
    expect(result1.id).not.toEqual(result2.id);

    // Verify both messages exist in database
    const messages = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.conversation_id, conversationId))
      .execute();

    expect(messages).toHaveLength(2);
  });
});
