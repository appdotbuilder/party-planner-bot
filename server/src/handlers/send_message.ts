
import { db } from '../db';
import { messagesTable, conversationsTable } from '../db/schema';
import { type SendMessageInput, type Message } from '../schema';
import { eq } from 'drizzle-orm';

export const sendMessage = async (input: SendMessageInput): Promise<Message> => {
  try {
    // Verify the conversation exists
    const conversation = await db.select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, input.conversation_id))
      .execute();

    if (conversation.length === 0) {
      throw new Error(`Conversation with id ${input.conversation_id} not found`);
    }

    // Insert the message
    const result = await db.insert(messagesTable)
      .values({
        conversation_id: input.conversation_id,
        message_type: input.message_type || 'user',
        content: input.content,
        metadata: null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Send message failed:', error);
    throw error;
  }
};
