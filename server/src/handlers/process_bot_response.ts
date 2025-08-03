
import { db } from '../db';
import { messagesTable } from '../db/schema';
import { type Conversation, type Message } from '../schema';
import { updateConversation } from './update_conversation';

export const processBotResponse = async (conversation: Conversation, userMessage: string): Promise<Message> => {
  try {
    let botContent = '';
    let metadata: string | null = null;
    let updatedConversation = conversation;
    
    // Process user input and update conversation state
    switch (conversation.current_state) {
      case 'initial':
        // Determine party type from user message
        if (userMessage.toLowerCase().includes('bachelor') && !userMessage.toLowerCase().includes('bachelorette')) {
          updatedConversation = await updateConversation({
            conversation_id: conversation.id,
            party_type: 'bachelor',
            current_state: 'city'
          });
          botContent = "🎩 Awesome! A bachelor party it is! Now, which city are you thinking of for this epic celebration? Here are some popular destinations:";
        } else if (userMessage.toLowerCase().includes('bachelorette')) {
          updatedConversation = await updateConversation({
            conversation_id: conversation.id,
            party_type: 'bachelorette',
            current_state: 'city'
          });
          botContent = "💃 Perfect! A bachelorette party sounds amazing! Which city are you considering for this fabulous celebration? Here are some top choices:";
        } else {
          botContent = "Hi there! 🎉 I'm so excited to help you plan the perfect party! First, let me know - are you planning a bachelor or bachelorette party?";
        }
        break;
        
      case 'party_type':
        // This shouldn't happen if state transitions work correctly, but handle as fallback
        botContent = "I'd love to help you plan! Could you let me know if this is for a bachelor or bachelorette party?";
        break;
        
      case 'city':
        // Extract city from user message and update conversation
        const cityName = userMessage.trim();
        updatedConversation = await updateConversation({
          conversation_id: conversation.id,
          city: cityName,
          current_state: 'activity_preference'
        });
        
        const partyType = updatedConversation.party_type === 'bachelor' ? 'bachelor party' : 'bachelorette party';
        botContent = `🏙️ ${cityName} is such a fantastic choice for a ${partyType}! Now, what type of experience are you looking for?`;
        break;
        
      case 'activity_preference':
        // Determine activity preference and update state
        let activityPreference: 'activities' | 'package' | 'nightlife' | null = null;
        
        if (userMessage.toLowerCase().includes('activities') || userMessage.toLowerCase().includes('adventure')) {
          activityPreference = 'activities';
          botContent = "🎯 Perfect! Activity-focused celebrations create the best memories. Now let's get some details to personalize your experience - what's the name of the person you're celebrating?";
        } else if (userMessage.toLowerCase().includes('package') || userMessage.toLowerCase().includes('complete')) {
          activityPreference = 'package';
          botContent = "📦 Excellent choice! A complete package takes all the stress out of planning. Let me gather some details - what's the name of the person you're celebrating?";
        } else if (userMessage.toLowerCase().includes('nightlife') || userMessage.toLowerCase().includes('night')) {
          activityPreference = 'nightlife';
          botContent = "🌙 Great! Nightlife celebrations are always unforgettable. Let's get some details - what's the name of the person you're celebrating?";
        } else {
          botContent = "I'd love to help you choose the perfect experience! Are you interested in activities & adventures, a complete package, or nightlife focused experiences?";
        }
        
        if (activityPreference) {
          updatedConversation = await updateConversation({
            conversation_id: conversation.id,
            activity_preference: activityPreference,
            current_state: 'party_details'
          });
        }
        break;
        
      case 'party_details':
        // Collect party name and ask for next detail
        if (!updatedConversation.party_name) {
          updatedConversation = await updateConversation({
            conversation_id: conversation.id,
            party_name: userMessage.trim()
          });
          botContent = `📅 Wonderful! ${userMessage.trim()} is going to have an amazing time! What dates are you thinking for the celebration? (e.g., "March 15-17" or "Next weekend")`;
        } else if (!updatedConversation.party_dates) {
          updatedConversation = await updateConversation({
            conversation_id: conversation.id,
            party_dates: userMessage.trim()
          });
          botContent = "👥 Perfect! How many people will be joining the celebration? (Including the guest of honor)";
        } else if (!updatedConversation.guest_count) {
          const guestCount = parseInt(userMessage.trim());
          if (!isNaN(guestCount) && guestCount > 0) {
            updatedConversation = await updateConversation({
              conversation_id: conversation.id,
              guest_count: guestCount
            });
            botContent = "💰 Great! What's your approximate budget for the celebration? (e.g., $500 per person, $2000 total, or 'flexible')";
          } else {
            botContent = "Please enter the number of guests as a number (e.g., 8, 12, etc.)";
          }
        } else if (!updatedConversation.budget) {
          updatedConversation = await updateConversation({
            conversation_id: conversation.id,
            budget: 0, // We'll store budget as text in party_dates for now
            current_state: 'preferences'
          });
          botContent = "🎨 Awesome! Do you have any specific theme or special requests for the celebration? (e.g., 'tropical theme', 'surprise elements', or 'just keep it classic')";
        }
        break;
        
      case 'preferences':
        // Collect preferences and move toward completion
        if (!updatedConversation.theme) {
          updatedConversation = await updateConversation({
            conversation_id: conversation.id,
            theme: userMessage.trim()
          });
          botContent = "🍽️ Perfect! Any dining preferences I should know about? (e.g., 'fine dining', 'casual spots', 'dietary restrictions', or 'surprise me')";
        } else if (!updatedConversation.dining_preferences) {
          updatedConversation = await updateConversation({
            conversation_id: conversation.id,
            dining_preferences: userMessage.trim()
          });
          botContent = "🎵 Great! What about music and entertainment preferences? (e.g., 'live music', 'DJ', 'karaoke', or 'whatever's fun')";
        } else if (!updatedConversation.music_preferences) {
          updatedConversation = await updateConversation({
            conversation_id: conversation.id,
            music_preferences: userMessage.trim(),
            current_state: 'generating_itinerary'
          });
          botContent = "🎉 Amazing! I have everything I need to create the perfect itinerary. Let me put together some incredible suggestions based on all your preferences...";
          
          // Generate rich media content for itinerary
          const itineraryData = {
            city: updatedConversation.city,
            party_type: updatedConversation.party_type,
            activity_preference: updatedConversation.activity_preference,
            guest_count: updatedConversation.guest_count,
            theme: updatedConversation.theme
          };
          
          // Sample media URLs based on party type and city
          const mediaUrls = updatedConversation.party_type === 'bachelor'
            ? ['https://images.unsplash.com/photo-1566737236500-c8ac43014a8e', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819']
            : ['https://images.unsplash.com/photo-1469371670807-013ccf25f16a', 'https://images.unsplash.com/photo-1502635385003-ee1e6a1a742d'];
          
          metadata = JSON.stringify({
            media_urls: mediaUrls,
            itinerary_preview: itineraryData,
            type: 'itinerary_generation'
          });
          
          // Update to completed state after a delay simulation
          setTimeout(async () => {
            await updateConversation({
              conversation_id: conversation.id,
              current_state: 'completed'
            });
          }, 2000);
        }
        break;
        
      case 'generating_itinerary':
        botContent = "✨ Your personalized itinerary is almost ready! I'm putting the finishing touches on some amazing experiences...";
        
        // Generate final itinerary with rich media
        const finalItinerary = {
          title: `${updatedConversation.party_name}'s ${updatedConversation.party_type === 'bachelor' ? 'Bachelor' : 'Bachelorette'} Party`,
          city: updatedConversation.city,
          dates: updatedConversation.party_dates,
          activities: [
            { time: '2:00 PM', activity: 'Welcome drinks & group photos', venue: 'Rooftop bar' },
            { time: '4:00 PM', activity: updatedConversation.activity_preference === 'activities' ? 'Adventure activity' : 'Spa session', venue: 'Premium location' },
            { time: '7:00 PM', activity: 'Dinner', venue: 'Upscale restaurant' },
            { time: '10:00 PM', activity: 'Nightlife', venue: 'VIP club experience' }
          ]
        };
        
        metadata = JSON.stringify({
          media_urls: ['https://images.unsplash.com/photo-1566737236500-c8ac43014a8e', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819'],
          itinerary: finalItinerary,
          type: 'final_itinerary'
        });
        
        updatedConversation = await updateConversation({
          conversation_id: conversation.id,
          current_state: 'completed'
        });
        break;
        
      case 'completed':
        botContent = "🎊 Your itinerary is ready and it's going to be incredible! Is there anything you'd like me to adjust or do you have any other questions about the celebration?";
        break;
        
      default:
        botContent = "Tell me more about what you're looking for! I'm here to help make this celebration unforgettable. 🎉";
    }
    
    // Save bot message to database
    const result = await db.insert(messagesTable)
      .values({
        conversation_id: conversation.id,
        message_type: 'bot',
        content: botContent,
        metadata: metadata
      })
      .returning()
      .execute();
    
    const message = result[0];
    return {
      ...message,
      created_at: message.created_at
    };
  } catch (error) {
    console.error('Bot response processing failed:', error);
    throw error;
  }
};
