
import { db } from '../db';
import { messagesTable } from '../db/schema';
import { type Conversation, type Message } from '../schema';

export const processBotResponse = async (conversation: Conversation, userMessage: string): Promise<Message> => {
  try {
    let botContent = '';
    
    // Generate contextual responses based on conversation state and user input
    switch (conversation.current_state) {
      case 'initial':
        botContent = "Hi there! I'm excited to help you plan the perfect party! First, are you planning a bachelor or bachelorette party?";
        break;
        
      case 'party_type':
        if (userMessage.toLowerCase().includes('bachelor') && !userMessage.toLowerCase().includes('bachelorette')) {
          botContent = "Great choice for a bachelor party! Now, which city are you thinking of for this celebration?";
        } else if (userMessage.toLowerCase().includes('bachelorette')) {
          botContent = "Perfect for a bachelorette party! Now, which city are you thinking of for this celebration?";
        } else {
          botContent = "I'd love to help you plan! Could you let me know if this is for a bachelor or bachelorette party?";
        }
        break;
        
      case 'city':
        botContent = `${userMessage} sounds like an amazing place to celebrate! What type of experience are you looking for? Activities, a complete package, or nightlife focused?`;
        break;
        
      case 'activity_preference':
        if (userMessage.toLowerCase().includes('activities')) {
          botContent = "Perfect! Activity-focused celebrations are so much fun. Now let's get some details - what's the name of the person you're celebrating?";
        } else if (userMessage.toLowerCase().includes('package')) {
          botContent = "Excellent choice! A complete package takes all the stress out of planning. What's the name of the person you're celebrating?";
        } else if (userMessage.toLowerCase().includes('nightlife')) {
          botContent = "Great! Nightlife celebrations are always memorable. What's the name of the person you're celebrating?";
        } else {
          botContent = "I'd love to help you choose! Are you interested in activities, a complete package, or nightlife focused experiences?";
        }
        break;
        
      case 'party_details':
        botContent = "Thanks for those details! Now let's talk about your preferences. What dates are you thinking for the celebration?";
        break;
        
      case 'preferences':
        botContent = "This is going to be amazing! I'm gathering all your preferences to create the perfect itinerary. Any specific themes or special requests?";
        break;
        
      case 'generating_itinerary':
        botContent = "I'm working on creating an incredible itinerary based on everything you've told me. This is going to be perfect!";
        break;
        
      case 'completed':
        botContent = "Your itinerary is ready! I hope you have an absolutely amazing celebration. Is there anything else you'd like to adjust?";
        break;
        
      default:
        botContent = "Tell me more about what you're looking for! I'm here to help make this celebration unforgettable.";
    }
    
    // Save bot message to database
    const result = await db.insert(messagesTable)
      .values({
        conversation_id: conversation.id,
        message_type: 'bot',
        content: botContent,
        metadata: null
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
