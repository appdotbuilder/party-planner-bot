
import { db } from '../db';
import { itinerariesTable } from '../db/schema';
import { type Itinerary } from '../schema';
import { eq } from 'drizzle-orm';

export const getItineraries = async (conversationId: number): Promise<Itinerary[]> => {
  try {
    const results = await db.select()
      .from(itinerariesTable)
      .where(eq(itinerariesTable.conversation_id, conversationId))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(itinerary => ({
      ...itinerary,
      estimated_cost: itinerary.estimated_cost ? parseFloat(itinerary.estimated_cost) : null
    }));
  } catch (error) {
    console.error('Get itineraries failed:', error);
    throw error;
  }
};
