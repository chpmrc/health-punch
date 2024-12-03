"use client";

import { useEffect, useRef, useState } from "react"; // Add useRef and useEffect
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { type Message } from "~/server/ai/replicate";
import { api } from "~/trpc/react";

export default function Home() {
  const [input, setInput] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [latestUserMessage, setLatestUserMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null); // Add ref for auto-scroll
  const messages = api.chat.getMessages.useQuery();

  // Auto-scroll function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages.data, latestUserMessage]);

  const sendMessage = api.chat.sendMessage.useMutation({
    onSuccess: async () => {
      await messages.refetch();
      setInput("");
      setLatestUserMessage("");
      setLoadingMessages(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage.mutate({ content: input });
    }
    setLatestUserMessage(input);
    setInput("");
    setLoadingMessages(true);
  };

  return (
    <div className="flex h-screen flex-col items-center pt-5">
      <h1>Health Punch</h1>
      <div className="flex w-full max-w-2xl flex-1 flex-col">
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-col space-y-4 pb-6">
            {" "}
            {/* Add padding bottom */}
            <Messages
              messages={[
                ...(messages.data ?? []),
                { content: latestUserMessage, role: "user" },
              ]}
            />
            {messages.isRefetching || loadingMessages ? (
              <div className="flex justify-start">
                <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-500"></div>
              </div>
            ) : null}
            <div ref={messagesEndRef} /> {/* Add scroll anchor */}
          </div>
        </div>
        <div className="sticky bottom-0 border-t bg-white p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 rounded-lg border p-2"
              placeholder="Type your message..."
            />
            <button
              type="submit"
              disabled={sendMessage.isPending}
              className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Messages({ messages }: { messages: Message[] }) {
  return (
    <>
      {messages.map((msg, i) => (
        <div
          key={i}
          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
        >
          {msg.content ? (
            <div
              className={`prose prose-invert max-w-[80%] rounded-lg p-3 ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-green-700 text-white"
              }`}
            >
              <Markdown remarkPlugins={[remarkGfm]}>{msg.content}</Markdown>
            </div>
          ) : null}
        </div>
      ))}
    </>
  );
}
