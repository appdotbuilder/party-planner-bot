
import { db } from '../db';
import { conversationsTable } from '../db/schema';
import { type StartConversationInput, type Conversation } from '../schema';

export const startConversation = async (input: StartConversationInput): Promise<Conversation> => {
  try {
    // Insert new conversation record
    const result = await db.insert(conversationsTable)
      .values({
        user_id: input.user_id,
        current_state: 'initial'
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const conversation = result[0];
    return {
      ...conversation,
      budget: conversation.budget ? parseFloat(conversation.budget) : null
    };
  } catch (error) {
    console.error('Conversation creation failed:', error);
    throw error;
  }
};
