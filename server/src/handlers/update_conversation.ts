
import { db } from '../db';
import { conversationsTable } from '../db/schema';
import { type UpdateConversationInput, type Conversation } from '../schema';
import { eq } from 'drizzle-orm';

export const updateConversation = async (input: UpdateConversationInput): Promise<Conversation> => {
  try {
    // Build update object with only provided fields
    const updateData: Record<string, any> = {
      updated_at: new Date()
    };

    // Add fields if they are provided in input
    if (input.party_type !== undefined) {
      updateData['party_type'] = input.party_type;
    }
    if (input.city !== undefined) {
      updateData['city'] = input.city;
    }
    if (input.activity_preference !== undefined) {
      updateData['activity_preference'] = input.activity_preference;
    }
    if (input.party_name !== undefined) {
      updateData['party_name'] = input.party_name;
    }
    if (input.party_dates !== undefined) {
      updateData['party_dates'] = input.party_dates;
    }
    if (input.guest_count !== undefined) {
      updateData['guest_count'] = input.guest_count;
    }
    if (input.budget !== undefined) {
      updateData['budget'] = input.budget.toString(); // Convert number to string for numeric column
    }
    if (input.theme !== undefined) {
      updateData['theme'] = input.theme;
    }
    if (input.dining_preferences !== undefined) {
      updateData['dining_preferences'] = input.dining_preferences;
    }
    if (input.music_preferences !== undefined) {
      updateData['music_preferences'] = input.music_preferences;
    }
    if (input.day_activities !== undefined) {
      updateData['day_activities'] = input.day_activities;
    }
    if (input.night_activities !== undefined) {
      updateData['night_activities'] = input.night_activities;
    }
    if (input.current_state !== undefined) {
      updateData['current_state'] = input.current_state;
    }

    // Update conversation record
    const result = await db.update(conversationsTable)
      .set(updateData)
      .where(eq(conversationsTable.id, input.conversation_id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Conversation with id ${input.conversation_id} not found`);
    }

    // Convert numeric fields back to numbers before returning
    const conversation = result[0];
    return {
      ...conversation,
      budget: conversation.budget ? parseFloat(conversation.budget) : null
    };
  } catch (error) {
    console.error('Conversation update failed:', error);
    throw error;
  }
};
