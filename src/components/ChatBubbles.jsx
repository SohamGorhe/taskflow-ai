import React, { useEffect, useRef } from "react";

export default function ChatBubbles({ chatLog, isProcessing }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLog, isProcessing]);

  if (chatLog.length === 0 && !isProcessing) return null;

  return (
    <section className="chat-section">
      {chatLog.map((msg, i) => (
        <div key={i} className={`bubble ${msg.role}`}>
          {msg.role === "ai" && <span className="bubble-avatar">◎</span>}
          <p className="bubble-text">{msg.text}</p>
        </div>
      ))}
      {isProcessing && (
        <div className="bubble ai">
          <span className="bubble-avatar">◎</span>
          <div className="typing-dots">
            <span/><span/><span/>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </section>
  );
}
