
import { db } from '../db';
import { conversationsTable } from '../db/schema';
import { type Conversation } from '../schema';
import { eq } from 'drizzle-orm';

export const getConversation = async (conversationId: number): Promise<Conversation | null> => {
  try {
    const results = await db.select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, conversationId))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const conversation = results[0];
    return {
      ...conversation,
      budget: conversation.budget ? parseFloat(conversation.budget) : null
    };
  } catch (error) {
    console.error('Failed to get conversation:', error);
    throw error;
  }
};
