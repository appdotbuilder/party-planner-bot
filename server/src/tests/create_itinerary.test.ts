
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { itinerariesTable, conversationsTable } from '../db/schema';
import { type CreateItineraryInput } from '../schema';
import { createItinerary } from '../handlers/create_itinerary';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateItineraryInput = {
  conversation_id: 1,
  title: 'Epic Bachelor Party Weekend',
  description: 'A complete weekend itinerary with activities, dining, and nightlife',
  activities: JSON.stringify([
    {
      time: '10:00 AM',
      activity: 'Golf at Championship Course',
      location: 'Pebble Beach Golf Links',
      duration: '4 hours'
    },
    {
      time: '7:00 PM',
      activity: 'Dinner at Steakhouse',
      location: 'The Capital Grille',
      duration: '2 hours'
    }
  ]),
  estimated_cost: 1250.50,
  media_urls: JSON.stringify([
    'https://example.com/golf-course.jpg',
    'https://example.com/steakhouse.jpg'
  ])
};

describe('createItinerary', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an itinerary with all fields', async () => {
    // Create prerequisite conversation
    await db.insert(conversationsTable)
      .values({
        user_id: 'test-user-123',
        current_state: 'completed'
      })
      .execute();

    const result = await createItinerary(testInput);

    // Basic field validation
    expect(result.conversation_id).toEqual(1);
    expect(result.title).toEqual('Epic Bachelor Party Weekend');
    expect(result.description).toEqual(testInput.description);
    expect(result.activities).toEqual(testInput.activities);
    expect(result.estimated_cost).toEqual(1250.50);
    expect(typeof result.estimated_cost).toBe('number');
    expect(result.media_urls).toEqual(testInput.media_urls!);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create an itinerary with optional fields null', async () => {
    // Create prerequisite conversation
    await db.insert(conversationsTable)
      .values({
        user_id: 'test-user-456',
        current_state: 'generating_itinerary'
      })
      .execute();

    const minimalInput: CreateItineraryInput = {
      conversation_id: 1,
      title: 'Simple Weekend Plan',
      description: 'Basic activities without cost estimates',
      activities: JSON.stringify([
        {
          time: '2:00 PM',
          activity: 'City Tour',
          location: 'Downtown'
        }
      ])
    };

    const result = await createItinerary(minimalInput);

    expect(result.conversation_id).toEqual(1);
    expect(result.title).toEqual('Simple Weekend Plan');
    expect(result.description).toEqual(minimalInput.description);
    expect(result.activities).toEqual(minimalInput.activities);
    expect(result.estimated_cost).toBeNull();
    expect(result.media_urls).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save itinerary to database', async () => {
    // Create prerequisite conversation
    await db.insert(conversationsTable)
      .values({
        user_id: 'test-user-789',
        current_state: 'preferences'
      })
      .execute();

    const result = await createItinerary(testInput);

    // Query using proper drizzle syntax
    const itineraries = await db.select()
      .from(itinerariesTable)
      .where(eq(itinerariesTable.id, result.id))
      .execute();

    expect(itineraries).toHaveLength(1);
    const savedItinerary = itineraries[0];
    expect(savedItinerary.conversation_id).toEqual(1);
    expect(savedItinerary.title).toEqual('Epic Bachelor Party Weekend');
    expect(savedItinerary.description).toEqual(testInput.description);
    expect(savedItinerary.activities).toEqual(testInput.activities);
    expect(parseFloat(savedItinerary.estimated_cost!)).toEqual(1250.50);
    expect(savedItinerary.media_urls).toEqual(testInput.media_urls!);
    expect(savedItinerary.created_at).toBeInstanceOf(Date);
  });

  it('should handle JSON string data correctly', async () => {
    // Create prerequisite conversation
    await db.insert(conversationsTable)
      .values({
        user_id: 'test-user-json',
        current_state: 'completed'
      })
      .execute();

    const jsonTestInput: CreateItineraryInput = {
      conversation_id: 1,
      title: 'JSON Data Test',
      description: 'Testing JSON string handling',
      activities: JSON.stringify({
        day1: [
          { time: '9:00 AM', activity: 'Breakfast', venue: 'Local Cafe' },
          { time: '11:00 AM', activity: 'Adventure Activity', venue: 'Outdoor Center' }
        ],
        day2: [
          { time: '10:00 AM', activity: 'Brunch', venue: 'Rooftop Restaurant' }
        ]
      }),
      estimated_cost: 850.75,
      media_urls: JSON.stringify({
        thumbnails: ['thumb1.jpg', 'thumb2.jpg'],
        videos: ['intro.mp4'],
        galleries: ['gallery1', 'gallery2']
      })
    };

    const result = await createItinerary(jsonTestInput);

    // Validate JSON strings are preserved
    expect(result.activities).toEqual(jsonTestInput.activities);
    expect(result.media_urls).toEqual(jsonTestInput.media_urls!);
    
    // Verify JSON can be parsed back
    const parsedActivities = JSON.parse(result.activities);
    expect(parsedActivities.day1).toHaveLength(2);
    expect(parsedActivities.day2).toHaveLength(1);
    
    if (result.media_urls) {
      const parsedMedia = JSON.parse(result.media_urls);
      expect(parsedMedia.thumbnails).toHaveLength(2);
      expect(parsedMedia.videos).toHaveLength(1);
      expect(parsedMedia.galleries).toHaveLength(2);
    }
  });
});
