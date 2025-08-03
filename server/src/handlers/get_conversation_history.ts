
import { db } from '../db';
import { messagesTable } from '../db/schema';
import { type GetConversationHistoryInput, type Message } from '../schema';
import { eq, asc } from 'drizzle-orm';

export const getConversationHistory = async (input: GetConversationHistoryInput): Promise<Message[]> => {
  try {
    // Query messages for the conversation, ordered by creation time (oldest first)
    // Apply limit to get the most recent N messages, but in chronological order
    const results = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.conversation_id, input.conversation_id))
      .orderBy(asc(messagesTable.created_at))
      .limit(input.limit)
      .execute();

    return results;
  } catch (error) {
    console.error('Get conversation history failed:', error);
    throw error;
  }
};
