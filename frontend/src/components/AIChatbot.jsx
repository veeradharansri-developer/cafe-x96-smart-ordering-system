import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Coffee, Sparkles } from "lucide-react";
import { API_BASE } from "../utils/config";

let messageIdCounter = 0;
const getMessageId = () => {
  messageIdCounter += 1;
  return `msg-${messageIdCounter}`;
};

const getFormattedTime = () => {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(() => [
    {
      id: "init",
      sender: "bot",
      content: "Hello! ☕ I'm Bean, your AI cafe assistant. Ask me anything about our coffees, teas, combos, or dietary preferences. How can I help you today?",
      timestamp: getFormattedTime()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputValue;
    if (!text.trim()) return;

    if (!textToSend) {
      setInputValue("");
    }

    const userMsg = {
      id: getMessageId(),
      sender: "user",
      content: text,
      timestamp: getFormattedTime()
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const history = [...messages, userMsg].map(m => ({
        sender: m.sender,
        content: m.content
      }));

      const response = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history })
      });

      if (!response.ok) {
        throw new Error("Chat service unavailable");
      }

      const data = await response.json();
      
      setMessages((prev) => [
        ...prev,
        {
          id: getMessageId(),
          sender: "bot",
          content: data.response,
          timestamp: getFormattedTime()
        }
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: getMessageId(),
          sender: "bot",
          content: "Oops! ☕ My coffee machine got clogged. (Failed to reach server). I can answer simple queries in offline mode: try asking about 'coffee', 'combos', or 'veg items'!",
          timestamp: getFormattedTime()
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  const suggestionChips = [
    { label: "☕ Best coffee?", query: "What is your best signature coffee?" },
    { label: "🌱 Veg options?", query: "What vegetarian options do you have?" },
    { label: "🎁 Show Combos", query: "Suggest some good combos with tea/coffee" },
    { label: "🌶️ Spicy food?", query: "Do you have anything spicy?" }
  ];

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 p-4 rounded-full btn-gradient-warm shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 border border-accent-warm/20 pulse-primary-btn"
        aria-label="Ask Bean, Cafe AI Assistant"
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-2rem)] h-[500px] rounded-2xl bg-white border border-border custom-shadow-lg flex flex-col z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
          
          {/* Chat Header */}
          <div className="p-4 bg-gradient-to-r from-primary to-primary-light border-b border-primary/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Coffee className="text-white" size={16} />
              </div>
              <div>
                <h3 className="font-display font-semibold text-white text-sm flex items-center gap-1">
                  Bean Assistant <Sparkles size={12} className="text-accent-gold" />
                </h3>
                <p className="text-[10px] text-white/70">Powered by Claude AI</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/70 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages Log */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-background">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm ${
                    msg.sender === "user"
                      ? "bg-primary text-white rounded-tr-none font-medium"
                      : "bg-white border border-border text-on-background rounded-tl-none custom-shadow"
                  }`}
                >
                  {msg.content}
                </div>
                <span className="text-[10px] text-secondary mt-1 px-1">{msg.timestamp}</span>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex flex-col items-start">
                <div className="bg-white border border-border px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-1.5 custom-shadow">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Prompt Chips */}
          {messages.length === 1 && (
            <div className="px-4 py-2 flex flex-wrap gap-1.5 border-t border-border bg-surface-variant/40">
              {suggestionChips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(chip.query)}
                  className="text-xs px-2.5 py-1.5 rounded-full bg-white text-on-background border border-border hover:bg-secondary-container hover:text-on-secondary-container transition-all duration-200 custom-shadow cursor-pointer"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          {/* Chat Footer Input */}
          <div className="p-3 border-t border-border bg-surface-variant/60 flex items-center gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Bean a question..."
              className="flex-1 bg-white border border-border text-on-background placeholder-secondary rounded-input px-3.5 py-2 text-sm focus:outline-none focus:border-primary/50 transition-colors"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim()}
              className="p-2.5 rounded-full bg-primary hover:bg-primary-hover text-white transition-all disabled:opacity-50 disabled:hover:scale-100 hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
