
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { conversationsTable, itinerariesTable } from '../db/schema';
import { getItineraries } from '../handlers/get_itineraries';

describe('getItineraries', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no itineraries exist', async () => {
    const result = await getItineraries(999);
    expect(result).toEqual([]);
  });

  it('should return itineraries for a conversation', async () => {
    // Create a conversation first
    const conversationResult = await db.insert(conversationsTable)
      .values({
        user_id: 'test-user-123',
        current_state: 'initial'
      })
      .returning()
      .execute();

    const conversationId = conversationResult[0].id;

    // Create test itineraries
    await db.insert(itinerariesTable)
      .values([
        {
          conversation_id: conversationId,
          title: 'Vegas Bachelor Party',
          description: 'Epic weekend in Las Vegas',
          activities: JSON.stringify({
            day1: ['Pool party', 'Fine dining', 'Casino night'],
            day2: ['Golf', 'Shows', 'Club hopping']
          }),
          estimated_cost: '2500.50',
          media_urls: JSON.stringify(['vegas1.jpg', 'vegas2.jpg'])
        },
        {
          conversation_id: conversationId,
          title: 'Miami Beach Weekend',
          description: 'Tropical bachelor party experience',
          activities: JSON.stringify({
            day1: ['Beach volleyball', 'Seafood dinner'],
            day2: ['Boat party', 'Nightclub']
          }),
          estimated_cost: '1800.00',
          media_urls: JSON.stringify(['miami1.jpg'])
        }
      ])
      .execute();

    const result = await getItineraries(conversationId);

    expect(result).toHaveLength(2);
    
    // Check first itinerary
    const vegasItinerary = result.find(i => i.title === 'Vegas Bachelor Party');
    expect(vegasItinerary).toBeDefined();
    expect(vegasItinerary!.description).toEqual('Epic weekend in Las Vegas');
    expect(vegasItinerary!.estimated_cost).toEqual(2500.50);
    expect(typeof vegasItinerary!.estimated_cost).toBe('number');
    expect(vegasItinerary!.activities).toContain('Pool party');
    expect(vegasItinerary!.media_urls).toContain('vegas1.jpg');
    expect(vegasItinerary!.created_at).toBeInstanceOf(Date);

    // Check second itinerary
    const miamiItinerary = result.find(i => i.title === 'Miami Beach Weekend');
    expect(miamiItinerary).toBeDefined();
    expect(miamiItinerary!.estimated_cost).toEqual(1800.00);
    expect(typeof miamiItinerary!.estimated_cost).toBe('number');
  });

  it('should handle null estimated_cost correctly', async () => {
    // Create a conversation first
    const conversationResult = await db.insert(conversationsTable)
      .values({
        user_id: 'test-user-456',
        current_state: 'initial'
      })
      .returning()
      .execute();

    const conversationId = conversationResult[0].id;

    // Create itinerary without estimated cost
    await db.insert(itinerariesTable)
      .values({
        conversation_id: conversationId,
        title: 'Budget-Free Party',
        description: 'No cost limit party',
        activities: JSON.stringify({ day1: ['Free activities'] }),
        estimated_cost: null
      })
      .execute();

    const result = await getItineraries(conversationId);

    expect(result).toHaveLength(1);
    expect(result[0].estimated_cost).toBeNull();
    expect(result[0].title).toEqual('Budget-Free Party');
  });

  it('should only return itineraries for the specified conversation', async () => {
    // Create two conversations
    const conversation1Result = await db.insert(conversationsTable)
      .values({
        user_id: 'user-1',
        current_state: 'initial'
      })
      .returning()
      .execute();

    const conversation2Result = await db.insert(conversationsTable)
      .values({
        user_id: 'user-2',
        current_state: 'initial'
      })
      .returning()
      .execute();

    const conversationId1 = conversation1Result[0].id;
    const conversationId2 = conversation2Result[0].id;

    // Create itineraries for both conversations
    await db.insert(itinerariesTable)
      .values([
        {
          conversation_id: conversationId1,
          title: 'Party for User 1',
          description: 'First user party',
          activities: JSON.stringify({ day1: ['Activity 1'] })
        },
        {
          conversation_id: conversationId2,
          title: 'Party for User 2',
          description: 'Second user party',
          activities: JSON.stringify({ day1: ['Activity 2'] })
        }
      ])
      .execute();

    // Get itineraries for first conversation only
    const result = await getItineraries(conversationId1);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Party for User 1');
    expect(result[0].conversation_id).toEqual(conversationId1);
  });
});
