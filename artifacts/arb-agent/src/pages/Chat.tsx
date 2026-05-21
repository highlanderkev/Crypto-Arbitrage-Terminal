import { useListOpenaiConversations, useCreateOpenaiConversation, useGetOpenaiConversation, useDeleteOpenaiConversation, getListOpenaiConversationsQueryKey, getGetOpenaiConversationQueryKey } from "@workspace/api-client-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { MessageSquareCode, Send, Plus, Trash2, Bot, User } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function Chat() {
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedResponse, setStreamedResponse] = useState("");
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: conversations, isLoading: loadingConvs } = useListOpenaiConversations();
  const { data: activeConv, isLoading: loadingActive } = useGetOpenaiConversation(
    activeConvId!, 
    { query: { enabled: !!activeConvId, queryKey: getGetOpenaiConversationQueryKey(activeConvId!) } }
  );

  const createConv = useCreateOpenaiConversation();
  const deleteConv = useDeleteOpenaiConversation();

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeConv?.messages, streamedResponse]);

  const handleNewChat = () => {
    createConv.mutate({ data: { title: "New Chat" } }, {
      onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
        setActiveConvId(res.id);
      }
    });
  };

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteConv.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
        if (activeConvId === id) setActiveConvId(null);
      }
    });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    let convId = activeConvId;
    if (!convId) {
      // Create conv first if none active
      const res = await createConv.mutateAsync({ data: { title: input.substring(0, 30) } });
      convId = res.id;
      setActiveConvId(res.id);
      queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
    }

    const messageContent = input.trim();
    setInput("");
    
    // Optimistically add user message to cache
    queryClient.setQueryData(getGetOpenaiConversationQueryKey(convId), (old: any) => {
      if (!old) return old;
      return {
        ...old,
        messages: [...old.messages, { id: Date.now(), role: "user", content: messageContent, createdAt: new Date().toISOString() }]
      };
    });

    setIsStreaming(true);
    setStreamedResponse("");

    try {
      const response = await fetch(`/api/openai/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: messageContent })
      });

      if (!response.ok) throw new Error("Network response was not ok");
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  setStreamedResponse(prev => prev + parsed.content);
                }
                if (parsed.done) {
                  done = true;
                }
              } catch (e) {
                // ignore parse errors for incomplete chunks
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Streaming error:", error);
    } finally {
      setIsStreaming(false);
      setStreamedResponse("");
      queryClient.invalidateQueries({ queryKey: getGetOpenaiConversationQueryKey(convId) });
      queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
    }
  };

  return (
    <div className="flex h-[calc(100vh-100px)] gap-6">
      {/* Sidebar */}
      <div className="w-64 flex flex-col gap-4 border-r border-border/50 pr-6">
        <Button onClick={handleNewChat} className="w-full justify-start gap-2" variant="outline">
          <Plus className="h-4 w-4" /> New Analysis
        </Button>
        
        <ScrollArea className="flex-1">
          <div className="space-y-2 pr-4">
            {loadingConvs ? (
              <div className="text-sm text-muted-foreground p-2">Loading history...</div>
            ) : conversations?.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setActiveConvId(conv.id)}
                className={`group flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors text-sm ${activeConvId === conv.id ? 'bg-primary/10 text-primary border border-primary/20' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}
              >
                <div className="truncate flex-1">{conv.title || "New Conversation"}</div>
                <button 
                  onClick={(e) => handleDelete(conv.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-opacity"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-card/30 rounded-lg border border-border/50 backdrop-blur-sm overflow-hidden">
        {/* Header */}
        <div className="h-14 border-b border-border/50 flex items-center px-6 gap-2 bg-muted/20">
          <MessageSquareCode className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">{activeConv ? activeConv.title : "New Analysis Chat"}</h2>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6" ref={scrollRef}>
          {loadingActive ? (
            <div className="flex justify-center items-center h-full text-muted-foreground">
              Loading messages...
            </div>
          ) : !activeConv && !activeConvId ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4">
              <Bot className="h-12 w-12 text-primary/50" />
              <p>Start a new conversation with the Arbitrage AI Analyst</p>
            </div>
          ) : (
            <div className="space-y-6">
              {activeConv?.messages.map((msg, i) => (
                <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center shrink-0">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-lg px-4 py-3 ${msg.role === 'user' ? 'bg-primary/20 border border-primary/30 text-foreground' : 'bg-muted/30 border border-border/50 text-foreground'}`}>
                    {msg.role === 'user' ? (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    ) : (
                      <div className="prose prose-invert prose-sm max-w-none prose-p:text-muted-foreground prose-headings:text-foreground prose-a:text-primary">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
              
              {/* Streaming Response */}
              {isStreaming && streamedResponse && (
                <div className="flex gap-4 justify-start">
                  <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center shrink-0">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                  <div className="max-w-[80%] rounded-lg px-4 py-3 bg-muted/30 border border-border/50 text-foreground">
                    <div className="prose prose-invert prose-sm max-w-none prose-p:text-muted-foreground">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {streamedResponse}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}
              {isStreaming && !streamedResponse && (
                 <div className="flex gap-4 justify-start">
                 <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center shrink-0 animate-pulse">
                   <Bot className="h-5 w-5 text-primary" />
                 </div>
               </div>
              )}
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="p-4 border-t border-border/50 bg-background/50">
          <form onSubmit={handleSend} className="relative flex items-center">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about arbitrage strategies, specific pairs, or market conditions..."
              className="pr-12 bg-card/50"
              disabled={isStreaming}
            />
            <Button 
              type="submit" 
              size="icon" 
              className="absolute right-1 h-8 w-8" 
              disabled={!input.trim() || isStreaming}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <div className="text-center mt-2 text-[10px] text-muted-foreground font-mono">
            AI can make mistakes. Verify critical trade data before execution.
          </div>
        </div>
      </div>
    </div>
  );
}