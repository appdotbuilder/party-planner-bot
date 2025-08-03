
import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { trpc } from '@/utils/trpc';
import type { Conversation, Message } from '../../server/src/schema';

interface MessageWithOptimistic extends Message {
  isOptimistic?: boolean;
}

interface TypewriterMessageProps {
  message: Message;
}

function TypewriterMessage({ message }: TypewriterMessageProps) {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (message.message_type !== 'bot') {
      setDisplayText(message.content);
      setIsComplete(true);
      return;
    }

    setDisplayText('');
    setIsComplete(false);
    
    let index = 0;
    const speed = 30; // milliseconds per character
    
    const typewriterInterval = setInterval(() => {
      if (index < message.content.length) {
        setDisplayText(message.content.slice(0, index + 1));
        index++;
      } else {
        setIsComplete(true);
        clearInterval(typewriterInterval);
      }
    }, speed);

    return () => clearInterval(typewriterInterval);
  }, [message.content, message.message_type]);

  return (
    <div className={`flex ${message.message_type === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex items-start space-x-3 max-w-[85%] sm:max-w-[75%] md:max-w-[60%] ${
        message.message_type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
      }`}>
        <Avatar className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0">
          <AvatarFallback className={
            message.message_type === 'user'
              ? 'bg-gray-200 text-gray-700 text-sm font-medium'
              : 'bg-blue-900 text-white text-sm font-bold'
          }>
            {message.message_type === 'user' ? 'U' : 'PP'}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-2">
          <Card className={`p-3 sm:p-4 transition-all duration-200 hover:shadow-md ${
            message.message_type === 'user'
              ? 'bg-black text-white border-black shadow-sm'
              : 'bg-gray-50 text-black border-gray-200 shadow-sm'
          }`}>
            <p className="text-sm sm:text-base leading-relaxed break-words">
              {displayText}
              {message.message_type === 'bot' && !isComplete && (
                <span className="inline-block w-0.5 h-5 bg-blue-900 ml-1 animate-pulse" />
              )}
            </p>
            {/* Rich media content */}
            {message.metadata && (() => {
              try {
                const metadata = JSON.parse(message.metadata);
                if (metadata.media_urls && metadata.media_urls.length > 0) {
                  return (
                    <div className="mt-3 space-y-2">
                      {metadata.media_urls.slice(0, 2).map((url: string, index: number) => (
                        <img 
                          key={index}
                          src={url} 
                          alt={`Itinerary preview ${index + 1}`}
                          className="w-full h-32 sm:h-40 object-cover rounded-md"
                          loading="lazy"
                        />
                      ))}
                    </div>
                  );
                }
                return null;
              } catch {
                return null;
              }
            })()}
            <p className="text-xs opacity-70 mt-2 sm:mt-3">
              {message.created_at.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<MessageWithOptimistic[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const initializeConversation = useCallback(async () => {
    try {
      const newConversation = await trpc.startConversation.mutate({
        user_id: `user_${Date.now()}`
      });
      setConversation(newConversation);

      const history = await trpc.getConversationHistory.query({
        conversation_id: newConversation.id
      });
      setMessages(history);
    } catch (error) {
      console.error('Failed to initialize conversation:', error);
    } finally {
      setIsInitializing(false);
    }
  }, []);

  useEffect(() => {
    initializeConversation();
  }, [initializeConversation]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !conversation || isLoading) return;

    const userMessageContent = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    // Add optimistic user message
    const optimisticUserMessage: MessageWithOptimistic = {
      id: Date.now(),
      conversation_id: conversation.id,
      message_type: 'user',
      content: userMessageContent,
      metadata: null,
      created_at: new Date(),
      isOptimistic: true
    };

    setMessages((prev: MessageWithOptimistic[]) => [...prev, optimisticUserMessage]);

    try {
      // Send user message
      const userMessage = await trpc.sendMessage.mutate({
        conversation_id: conversation.id,
        content: userMessageContent,
        message_type: 'user'
      });

      // Process bot response
      const botResponse = await trpc.processBotResponse.mutate({
        conversationId: conversation.id,
        userMessage: userMessageContent
      });

      // Update messages with actual responses, removing optimistic
      setMessages((prev: MessageWithOptimistic[]) => [
        ...prev.filter(msg => !msg.isOptimistic),
        userMessage,
        botResponse
      ]);

      // Update conversation state if needed
      const updatedConversation = await trpc.getConversation.query({
        conversationId: conversation.id
      });
      if (updatedConversation) {
        setConversation(updatedConversation);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove optimistic message on error
      setMessages((prev: MessageWithOptimistic[]) => 
        prev.filter(msg => !msg.isOptimistic)
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickResponse = async (response: string) => {
    if (!conversation || isLoading) return;

    setIsLoading(true);

    // Add optimistic user message immediately
    const optimisticUserMessage: MessageWithOptimistic = {
      id: Date.now(),
      conversation_id: conversation.id,
      message_type: 'user',
      content: response,
      metadata: null,
      created_at: new Date(),
      isOptimistic: true
    };

    setMessages((prev: MessageWithOptimistic[]) => [...prev, optimisticUserMessage]);

    try {
      // Send user message
      const userMessage = await trpc.sendMessage.mutate({
        conversation_id: conversation.id,
        content: response,
        message_type: 'user'
      });

      // Process bot response
      const botResponse = await trpc.processBotResponse.mutate({
        conversationId: conversation.id,
        userMessage: response
      });

      // Update messages with actual responses, removing optimistic
      setMessages((prev: MessageWithOptimistic[]) => [
        ...prev.filter(msg => !msg.isOptimistic),
        userMessage,
        botResponse
      ]);

      // Update conversation state
      const updatedConversation = await trpc.getConversation.query({
        conversationId: conversation.id
      });
      if (updatedConversation) {
        setConversation(updatedConversation);
      }
    } catch (error) {
      console.error('Failed to send quick response:', error);
      // Remove optimistic message on error
      setMessages((prev: MessageWithOptimistic[]) => 
        prev.filter(msg => !msg.isOptimistic)
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getQuickResponses = (): string[] => {
    if (!conversation) return [];

    switch (conversation.current_state) {
      case 'initial':
        return ['Bachelor Party 🎩', 'Bachelorette Party 💃'];
      case 'city':
        return ['Bangkok', 'Pattaya', 'Phuket', 'Other City'];
      case 'activity_preference':
        return ['Activities & Adventures 🎯', 'Complete Package 📦', 'Nightlife Focus 🌙'];
      case 'party_details':
        if (!conversation.party_dates) {
          return ['This Weekend', 'Next Month', 'In 2 Months'];
        }
        if (!conversation.guest_count) {
          return ['4-6 People', '7-10 People', '10+ People'];
        }
        if (!conversation.budget) {
          return ['$200-500 per person', '$500-1000 per person', 'Flexible Budget'];
        }
        return [];
      case 'preferences':
        if (!conversation.theme) {
          return ['Classic & Elegant', 'Fun & Playful', 'Adventure Theme', 'Surprise Me!'];
        }
        if (!conversation.dining_preferences) {
          return ['Fine Dining', 'Casual Spots', 'Local Cuisine', 'Mix of Everything'];
        }
        if (!conversation.music_preferences) {
          return ['Live Music', 'DJ & Dancing', 'Karaoke Fun', 'Whatever\'s Popular'];
        }
        return [];
      default:
        return [];
    }
  };

  const getProgressSteps = () => {
    const steps = [
      { key: 'party_type', label: 'Party Type', icon: '🎉' },
      { key: 'city', label: 'City', icon: '🏙️' },
      { key: 'activity_preference', label: 'Activities', icon: '🎯' },
      { key: 'party_details', label: 'Details', icon: '📋' },
      { key: 'preferences', label: 'Preferences', icon: '❤️' },
      { key: 'completed', label: 'Complete', icon: '✅' }
    ];

    const currentIndex = steps.findIndex(step => step.key === conversation?.current_state);
    return { steps, currentIndex };
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing your party planner...</p>
        </div>
      </div>
    );
  }

  const { steps, currentIndex } = getProgressSteps();
  const quickResponses = getQuickResponses();

  return (
    <div className="min-h-screen bg-white flex flex-col touch-manipulation">
      {/* Header with safe area support */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 safe-area-top">
        <div className="p-4 sm:p-5 lg:p-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-900 rounded-full flex items-center justify-center shadow-sm">
                <span className="text-white text-base sm:text-lg font-bold">PP</span>
              </div>
              <div>
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-black">Party Planner</h1>
                <p className="text-xs sm:text-sm text-gray-500">Your AI assistant</p>
              </div>
            </div>
            {conversation?.party_type && (
              <Badge variant="outline" className="border-blue-900 text-blue-900 px-3 py-1 text-sm font-medium">
                {conversation.party_type === 'bachelor' ? '🎩 Bachelor' : '💃 Bachelorette'}
              </Badge>
            )}
          </div>

          {/* Enhanced Progress Bar */}
          {conversation && currentIndex >= 0 && (
            <div className="mt-4 sm:mt-6">
              <div className="flex justify-between mb-3">
                {steps.map((step, index) => (
                  <div
                    key={step.key}
                    className={`flex flex-col items-center transition-all duration-300 ${
                      index <= currentIndex ? 'text-blue-900 scale-105' : 'text-gray-300'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-all duration-300 ${
                        index <= currentIndex
                          ? 'bg-blue-900 text-white shadow-md'
                          : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      {index < currentIndex ? '✓' : step.icon}
                    </div>
                    <span className="text-xs sm:text-sm mt-1 sm:mt-2 font-medium text-center leading-tight max-w-[60px] sm:max-w-none">
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-900 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Messages Area with responsive container */}
      <ScrollArea className="flex-1 hide-scrollbar">
        <div className="max-w-4xl mx-auto p-4 sm:p-5 lg:p-6">
          <div className="space-y-4 sm:space-y-6">
            {messages.map((message: MessageWithOptimistic) => (
              <TypewriterMessage key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-3">
                  <Avatar className="w-8 h-8 sm:w-9 sm:h-9">
                    <AvatarFallback className="bg-blue-900 text-white text-sm font-bold">PP</AvatarFallback>
                  </Avatar>
                  <Card className="p-3 sm:p-4 bg-gray-50 border-gray-200 shadow-sm">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </Card>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </ScrollArea>

      {/* Quick Responses with enhanced mobile design */}
      {quickResponses.length > 0 && (
        <div className="border-t border-gray-200 bg-white">
          <div className="max-w-4xl mx-auto p-4 sm:p-5">
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {quickResponses.map((response: string) => (
                <Button
                  key={response}
                  variant="outline"
                  size="sm"
                  className="min-h-[44px] px-4 py-2 border-blue-900 text-blue-900 hover:bg-blue-900 hover:text-white transition-all duration-200 active:scale-95 font-medium text-sm sm:text-base"
                  onClick={() => handleQuickResponse(response)}
                  disabled={isLoading}
                >
                  {response}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Input Area with safe area support */}
      <div className="border-t border-gray-200 bg-white safe-area-bottom">
        <div className="max-w-4xl mx-auto p-4 sm:p-5">
          <form onSubmit={handleSendMessage} className="flex space-x-3">
            <Input
              value={inputValue}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 min-h-[44px] text-base border-gray-300 focus:border-blue-900 focus:ring-blue-900 chat-input mobile-input transition-all duration-200"
              disabled={isLoading}
            />
            <Button
              type="submit"
              className="min-h-[44px] min-w-[44px] bg-blue-900 hover:bg-blue-800 active:bg-blue-950 text-white px-4 sm:px-6 transition-all duration-200 active:scale-95 shadow-sm"
              disabled={isLoading || !inputValue.trim()}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span className="text-lg">→</span>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;
