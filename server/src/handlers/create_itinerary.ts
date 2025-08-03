
import { db } from '../db';
import { itinerariesTable } from '../db/schema';
import { type CreateItineraryInput, type Itinerary } from '../schema';

export const createItinerary = async (input: CreateItineraryInput): Promise<Itinerary> => {
  try {
    // Insert itinerary record
    const result = await db.insert(itinerariesTable)
      .values({
        conversation_id: input.conversation_id,
        title: input.title,
        description: input.description,
        activities: input.activities,
        estimated_cost: input.estimated_cost ? input.estimated_cost.toString() : null, // Convert number to string for numeric column
        media_urls: input.media_urls || null
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const itinerary = result[0];
    return {
      ...itinerary,
      estimated_cost: itinerary.estimated_cost ? parseFloat(itinerary.estimated_cost) : null // Convert string back to number
    };
  } catch (error) {
    console.error('Itinerary creation failed:', error);
    throw error;
  }
};
