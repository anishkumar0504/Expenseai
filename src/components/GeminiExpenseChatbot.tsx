import React, { useState, useRef, useEffect } from 'react';
import { useFinanceStore } from '../store/useFinanceStore.js';
import { ChatMessage, ProposedAiAction } from '../types.js';
import { Sparkles, Send, Check, X, Bot, User, CheckCircle2, AlertCircle, Mic, MicOff } from 'lucide-react';

export const GeminiExpenseChatbot: React.FC = () => {
  const { executeAiAction } = useFinanceStore();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_welcome',
      sender: 'bot',
      text: 'Hey! I am your ExpenseAI Financial Assistant. Ask me anything about your spendings or tell me to add/remove expenses, goals, tasks, or subscriptions (e.g., "Add ₹350 for Zepto", "Add ₹250 for Swiggy Food", "Cancel Netflix subscription", "Add goal Save ₹5000").',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [actionStatuses, setActionStatuses] = useState<Record<string, 'confirmed' | 'cancelled'>>({});
  const [processingActions, setProcessingActions] = useState<Record<string, boolean>>({});
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (messages.length > 1 || isLoading) {
      scrollToBottom();
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (queryText?: string) => {
    const userQuery = (queryText || inputText).trim();
    if (!userQuery || isLoading) return;

    setInputText('');

    const history = messages
      .filter((m) => m.id !== 'msg_welcome')
      .map((m) => ({
        role: (m.sender === 'user' ? 'user' : 'model') as 'user' | 'model',
        text: m.text,
      }));

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      text: userQuery,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const token = localStorage.getItem('pfinance_token') || 'demo_guest_token';
      const res = await fetch('/api/gemini/chat-qa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question: userQuery, history }),
      });

      if (res.ok) {
        const data = await res.json();
        const botMsg: ChatMessage = {
          id: `msg_bot_${Date.now()}`,
          sender: 'bot',
          text: data.answer || 'I evaluated your financial request.',
          proposedAction: data.proposedAction,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg_err_${Date.now()}`,
            sender: 'bot',
            text: 'I could not process that request right now. Please check your connection.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (err) {
      console.error('Chatbot error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_err_${Date.now()}`,
          sender: 'bot',
          text: 'Something went wrong while contacting the AI server.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const startVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice input is not supported in this browser. Please type your command.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputText(transcript);
        }
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleConfirmAction = async (msgId: string, action: ProposedAiAction) => {
    if (processingActions[msgId] || actionStatuses[msgId]) return;

    setProcessingActions((prev) => ({ ...prev, [msgId]: true }));

    try {
      const result = await executeAiAction(action);
      setActionStatuses((prev) => ({ ...prev, [msgId]: 'confirmed' }));

      setMessages((prev) => [
        ...prev,
        {
          id: `msg_confirm_${Date.now()}`,
          sender: 'bot',
          text: result.message || 'Operation executed successfully!',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      console.error('Action execution error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_err_${Date.now()}`,
          sender: 'bot',
          text: 'Failed to execute the action. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setProcessingActions((prev) => ({ ...prev, [msgId]: false }));
    }
  };

  const handleCancelAction = (msgId: string) => {
    if (processingActions[msgId]) return;
    setActionStatuses((prev) => ({ ...prev, [msgId]: 'cancelled' }));
  };

  const quickPrompts = [
    'Add ₹350 for Zepto grocery',
    'Add ₹240 for Swiggy Food',
    'How much spent on Food this month?',
    'Add goal Save ₹10,000 for iPhone',
    'Cancel Netflix subscription',
  ];

  return (
    <div className="glass-card p-4 sm:p-5 max-w-4xl mx-auto flex flex-col h-[580px] sm:h-[620px] relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-2.5 rounded-2xl bg-white text-black">
            <Bot className="w-5 h-5 text-black" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              ExpenseAI Assistant <Sparkles className="w-4 h-4 text-gray-300" />
            </h3>
            <p className="text-[11px] sm:text-xs text-gray-400">Instant expense parsing & automated financial operations</p>
          </div>
        </div>
      </div>

      {/* Messages Feed */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto space-y-3.5 my-3 sm:my-4 pr-1">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const actionState = actionStatuses[msg.id];

          return (
            <div
              key={msg.id}
              className={`flex gap-2.5 sm:gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start animate-fade-in`}
            >
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                  isUser
                    ? 'bg-white text-black'
                    : 'bg-white/10 text-white border border-white/10'
                }`}
              >
                {isUser ? <User className="w-3.5 h-3.5 text-black" /> : <Bot className="w-3.5 h-3.5 text-white" />}
              </div>

              <div className="max-w-[85%] sm:max-w-[80%] space-y-2">
                <div
                  className={`p-3.5 sm:p-4 rounded-2xl text-xs leading-relaxed ${
                    isUser
                      ? 'bg-white/10 border border-white/20 text-white'
                      : 'bg-[#181818] border border-white/10 text-white'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>

                {/* Proposed Action Confirmation Card */}
                {msg.proposedAction && !actionState && (
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-[#181818] border border-white/20 space-y-3">
                    <div className="flex items-center gap-2 text-white font-bold text-xs">
                      <AlertCircle className="w-4 h-4 text-amber-400" /> Action Confirmation Required
                    </div>
                    <p className="text-xs text-white font-medium">
                      {msg.proposedAction.confirmationPrompt}
                    </p>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleConfirmAction(msg.id, msg.proposedAction!)}
                        disabled={!!processingActions[msg.id]}
                        className="px-4 py-2 rounded-xl bg-white text-black text-xs font-bold hover:bg-gray-200 transition-colors flex items-center gap-1.5 disabled:opacity-40"
                      >
                        <Check className="w-4 h-4" /> {processingActions[msg.id] ? 'Processing...' : 'Confirm'}
                      </button>
                      <button
                        onClick={() => handleCancelAction(msg.id)}
                        disabled={!!processingActions[msg.id]}
                        className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white text-xs font-semibold hover:bg-white/10 transition-colors flex items-center gap-1 disabled:opacity-40"
                      >
                        <X className="w-4 h-4" /> Cancel
                      </button>
                    </div>
                  </div>
                )}

                {actionState === 'confirmed' && (
                  <div className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white text-[11px] font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" /> Action Confirmed & Executed
                  </div>
                )}

                {actionState === 'cancelled' && (
                  <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-[11px] font-medium">
                    Action cancelled
                  </div>
                )}

                <span className="text-[10px] text-gray-400 block px-1">{msg.timestamp}</span>
              </div>
            </div>
          );
        })}

       {isLoading && (
  <div className="flex items-center gap-3">
    <div className="p-3.5 rounded-2xl bg-[#181818] border border-white/10 text-xs text-gray-400 flex items-center gap-3">
      <div className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span>ExpenseAI is parsing your request...</span>
    </div>
  </div>
)}
      </div>

      {/* Quick Prompt Chips */}
      <div className="pb-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <span className="text-[10px] font-semibold text-gray-400 shrink-0 uppercase tracking-wider">Quick Prompts:</span>
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(prompt)}
            className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 hover:border-white/30 text-[11px] font-medium text-gray-400 hover:text-white whitespace-nowrap transition-colors shrink-0"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="pt-2.5 border-t border-white/10 flex items-center gap-2"
      >
        <button
          type="button"
          onClick={startVoiceInput}
          className={`p-3 rounded-xl border transition-colors ${
            isListening
              ? 'bg-amber-500/20 border-amber-500 text-amber-400 animate-pulse'
              : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
          }`}
          title="Voice Command"
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <input
          type="text"
          placeholder="e.g. 'Add ₹350 Zepto expense', 'Cancel Netflix', 'Show Food spend'..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 px-4 py-3 glass-input text-xs font-medium"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isLoading}
          className="p-3 rounded-xl bg-white text-black hover:bg-gray-200 disabled:opacity-40 transition-colors shrink-0 font-bold"
        >
          <Send className="w-4 h-4 text-black" />
        </button>
      </form>
    </div>
  );
};