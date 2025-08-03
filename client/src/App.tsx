
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
    setInputValue(response);
    // Trigger form submission
    const form = document.querySelector('form');
    if (form) {
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
  };

  const getQuickResponses = (): string[] => {
    if (!conversation) return [];

    switch (conversation.current_state) {
      case 'initial':
        return ['Bachelor Party 🎩', 'Bachelorette Party 💃'];
      case 'party_type':
        return ['Las Vegas', 'Miami', 'Nashville', 'New York', 'Austin'];
      case 'city':
        return ['Activities & Adventures', 'Complete Package', 'Nightlife Focus'];
      case 'activity_preference':
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
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-900 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">PP</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-black">Party Planner</h1>
              <p className="text-xs text-gray-500">Your AI assistant</p>
            </div>
          </div>
          {conversation?.party_type && (
            <Badge variant="outline" className="border-blue-900 text-blue-900">
              {conversation.party_type === 'bachelor' ? '🎩 Bachelor' : '💃 Bachelorette'}
            </Badge>
          )}
        </div>

        {/* Progress Bar */}
        {conversation && currentIndex >= 0 && (
          <div className="mt-4">
            <div className="flex justify-between mb-2">
              {steps.map((step, index) => (
                <div
                  key={step.key}
                  className={`flex flex-col items-center ${
                    index <= currentIndex ? 'text-blue-900' : 'text-gray-300'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      index <= currentIndex
                        ? 'bg-blue-900 text-white'
                        : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {index < currentIndex ? '✓' : step.icon}
                  </div>
                  <span className="text-xs mt-1 hidden sm:block">{step.label}</span>
                </div>
              ))}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div
                className="bg-blue-900 h-1 rounded-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 pb-4">
          {messages.map((message: MessageWithOptimistic) => (
            <div
              key={message.id}
              className={`flex ${
                message.message_type === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`flex items-start space-x-2 max-w-[85%] ${
                  message.message_type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarFallback
                    className={
                      message.message_type === 'user'
                        ? 'bg-gray-200 text-gray-700'
                        : 'bg-blue-900 text-white'
                    }
                  >
                    {message.message_type === 'user' ? 'U' : 'PP'}
                  </AvatarFallback>
                </Avatar>
                <Card
                  className={`p-3 ${
                    message.message_type === 'user'
                      ? 'bg-black text-white border-black'
                      : 'bg-gray-50 text-black border-gray-200'
                  } ${message.isOptimistic ? 'opacity-60' : ''}`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  <p className="text-xs opacity-70 mt-2">
                    {message.created_at.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </Card>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-2">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-blue-900 text-white">PP</AvatarFallback>
                </Avatar>
                <Card className="p-3 bg-gray-50 border-gray-200">
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
      </ScrollArea>

      {/* Quick Responses */}
      {quickResponses.length > 0 && (
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex flex-wrap gap-2">
            {quickResponses.map((response: string) => (
              <Button
                key={response}
                variant="outline"
                size="sm"
                className="border-blue-900 text-blue-900 hover:bg-blue-900 hover:text-white"
                onClick={() => handleQuickResponse(response)}
                disabled={isLoading}
              >
                {response}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <Input
            value={inputValue}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 border-gray-300 focus:border-blue-900 focus:ring-blue-900"
            disabled={isLoading}
          />
          <Button
            type="submit"
            className="bg-blue-900 hover:bg-blue-800 text-white px-6"
            disabled={isLoading || !inputValue.trim()}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              '→'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default App;
