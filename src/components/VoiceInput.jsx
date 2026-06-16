import React, { useState, useRef, useEffect } from "react";

export default function VoiceInput({ onTranscript, isProcessing, aiSpeaking, pendingQuestion }) {
  const [isListening, setIsListening] = useState(false);
  const [liveText, setLiveText] = useState("");
  const [typedText, setTypedText] = useState("");
  const [inputMode, setInputMode] = useState("voice"); // "voice" | "text"
  const [bars, setBars] = useState(Array(20).fill(3));
  const [aiBars, setAiBars] = useState(Array(20).fill(3));
  const recognitionRef = useRef(null);
  const fullTranscriptRef = useRef("");
  const animFrameRef = useRef(null);
  const audioCtxRef = useRef(null);
  const micStreamRef = useRef(null);
  const aiWaveRef = useRef(null);
  const textareaRef = useRef(null);

  // AI speaking waveform
  useEffect(() => {
    if (aiSpeaking) {
      let t = 0;
      const animate = () => {
        t += 0.18;
        setAiBars(Array.from({ length: 20 }, (_, i) =>
          Math.max(4, Math.round(20 + 18 * Math.sin(t + i * 0.5)))
        ));
        aiWaveRef.current = requestAnimationFrame(animate);
      };
      animate();
    } else {
      cancelAnimationFrame(aiWaveRef.current);
      setAiBars(Array(20).fill(3));
    }
    return () => cancelAnimationFrame(aiWaveRef.current);
  }, [aiSpeaking]);

  const startWaveform = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const animate = () => {
        analyser.getByteFrequencyData(data);
        setBars(Array.from(data.slice(0, 20)).map(v => Math.max(3, Math.round((v / 255) * 52))));
        animFrameRef.current = requestAnimationFrame(animate);
      };
      animate();
    } catch {
      const animate = () => {
        setBars(prev => prev.map(() => Math.floor(Math.random() * 44) + 4));
        animFrameRef.current = requestAnimationFrame(animate);
      };
      animate();
    }
  };

  const stopWaveform = () => {
    cancelAnimationFrame(animFrameRef.current);
    setBars(Array(20).fill(3));
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    micStreamRef.current = null;
  };

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    fullTranscriptRef.current = "";
    setLiveText("");
    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onstart = () => { setIsListening(true); startWaveform(); };
    recognition.onresult = (e) => {
      let interim = "", final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        e.results[i].isFinal ? (final += t + " ") : (interim += t);
      }
      if (final) fullTranscriptRef.current += final;
      setLiveText((fullTranscriptRef.current + interim).trim());
    };
    recognition.onerror = (e) => {
      if (e.error === "no-speech") return;
      setIsListening(false); stopWaveform();
    };
    recognition.onend = () => {
      if (recognition._shouldKeepGoing) recognition.start();
    };
    recognition._shouldKeepGoing = true;
    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = async () => {
    if (!recognitionRef.current) return;
    recognitionRef.current._shouldKeepGoing = false;
    recognitionRef.current.stop();
    setIsListening(false);
    stopWaveform();
    const text = fullTranscriptRef.current.trim();
    setLiveText("");
    fullTranscriptRef.current = "";
    if (text) await onTranscript(text);
  };

  const handleTextSubmit = async () => {
    const text = typedText.trim();
    if (!text || isProcessing) return;
    setTypedText("");
    await onTranscript(text);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleTextSubmit();
    }
  };

  useEffect(() => () => { stopWaveform(); cancelAnimationFrame(animFrameRef.current); }, []);

  const state = aiSpeaking ? "ai-speaking" : isProcessing ? "processing" : isListening ? "listening" : "idle";

  const statusMessages = {
    idle: pendingQuestion ? "Tap mic to answer or type below" : "Speak your tasks or type them below",
    listening: "Listening... tap stop when done",
    processing: "Thinking...",
    "ai-speaking": "Speaking...",
  };

  return (
    <section className="voice-section">

      {/* AI waveform */}
      <div className={`waveform ai-wave ${aiSpeaking ? "active" : ""}`}>
        {aiBars.map((h, i) => (
          <span key={i} className="bar ai-bar" style={{ height: `${h}px` }} />
        ))}
      </div>

      {/* Mode toggle */}
      <div className="input-mode-toggle">
        <button
          className={`mode-btn ${inputMode === "voice" ? "active" : ""}`}
          onClick={() => setInputMode("voice")}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4z"/>
            <path d="M19 10a7 7 0 0 1-14 0H3a9 9 0 0 0 8 8.94V21H9v2h6v-2h-2v-2.06A9 9 0 0 0 21 10z"/>
          </svg>
          Voice
        </button>
        <button
          className={`mode-btn ${inputMode === "text" ? "active" : ""}`}
          onClick={() => { setInputMode("text"); setTimeout(() => textareaRef.current?.focus(), 100); }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
          </svg>
          Type
        </button>
      </div>

      {/* VOICE MODE */}
      {inputMode === "voice" && (
        <>
          <button
            className={`mic-btn state-${state}`}
            onClick={isListening ? stopListening : startListening}
            disabled={isProcessing || aiSpeaking}
            aria-label={isListening ? "Stop" : "Start"}
          >
            {isListening ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <rect x="5" y="5" width="14" height="14" rx="2"/>
              </svg>
            ) : isProcessing ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
            ) : aiSpeaking ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/>
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4z"/>
                <path d="M19 10a7 7 0 0 1-14 0H3a9 9 0 0 0 8 8.94V21H9v2h6v-2h-2v-2.06A9 9 0 0 0 21 10z"/>
              </svg>
            )}
          </button>

          {/* User waveform */}
          <div className={`waveform user-wave ${isListening ? "active" : ""}`}>
            {bars.map((h, i) => (
              <span key={i} className="bar" style={{ height: `${h}px` }} />
            ))}
          </div>

          <p className="status-msg">{statusMessages[state]}</p>

          {liveText && isListening && (
            <div className="transcript-box">
              <span className="transcript-label live">● LIVE</span>
              <p className="transcript-text">"{liveText}"</p>
            </div>
          )}
        </>
      )}

      {/* TEXT MODE */}
      {inputMode === "text" && (
        <div className="text-input-wrap">
          <textarea
            ref={textareaRef}
            className="text-input"
            placeholder={pendingQuestion ? "Type your answer..." : "Type your tasks here... (e.g. Meeting with Rahul at 2pm, lunch at 1pm)"}
            value={typedText}
            onChange={e => setTypedText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isProcessing || aiSpeaking}
            rows={3}
          />
          <div className="text-input-footer">
            <span className="text-hint">Press Enter to send · Shift+Enter for new line</span>
            <button
              className={`send-btn ${!typedText.trim() || isProcessing ? "disabled" : ""}`}
              onClick={handleTextSubmit}
              disabled={!typedText.trim() || isProcessing}
            >
              {isProcessing ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2 21l21-9L2 3v7l15 2-15 2z"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      )}

    </section>
  );
}
