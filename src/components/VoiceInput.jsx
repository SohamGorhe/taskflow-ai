import React, { useState, useRef, useEffect, useCallback } from "react";

const GROQ_KEY = process.env.REACT_APP_GROQ_KEY;
const isMobile = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

async function transcribeWithWhisper(audioBlob) {
  const formData = new FormData();
  formData.append("file", audioBlob, "audio.webm");
  formData.append("model", "whisper-large-v3");
  formData.append("language", "en");
  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${GROQ_KEY}` },
    body: formData,
  });
  const data = await res.json();
  return data.text || "";
}

// ── 3D Particle Sphere ────────────────────────────────────────────────────────
function ParticleSphere({ isListening, isProcessing, aiSpeaking, audioLevel }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const particlesRef = useRef([]);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const size = canvas.width = canvas.height = 260;
    const cx = size / 2, cy = size / 2;
    const NUM = 280;
    const R = 88;

    // Generate particles on sphere surface using golden ratio
    particlesRef.current = Array.from({ length: NUM }, (_, i) => {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / NUM);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      return {
        ox: Math.sin(phi) * Math.cos(theta),
        oy: Math.sin(phi) * Math.sin(theta),
        oz: Math.cos(phi),
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.7,
        size: 1.2 + Math.random() * 1.4,
      };
    });

    const draw = () => {
      timeRef.current += 0.012;
      const t = timeRef.current;

      // Audio reactivity
      const audio = audioLevel || 0;
      const pulse = isListening ? 1 + audio * 0.45 : aiSpeaking ? 1 + 0.15 * Math.sin(t * 3) : 1;
      const rotX = isListening ? t * 0.4 : t * 0.18;
      const rotY = t * 0.25;

      ctx.clearRect(0, 0, size, size);

      // Rotation matrices
      const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY), sinY = Math.sin(rotY);

      // Color config
      let primaryColor, glowColor;
      if (aiSpeaking) {
        primaryColor = { r: 255, g: 165, b: 60 };   // warm gold
        glowColor = "rgba(255,140,30,0.18)";
      } else if (isListening) {
        primaryColor = { r: 230, g: 235, b: 245 };  // silver-white
        glowColor = "rgba(200,210,240,0.15)";
      } else if (isProcessing) {
        primaryColor = { r: 180, g: 185, b: 210 };  // muted silver
        glowColor = "rgba(160,170,200,0.10)";
      } else {
        primaryColor = { r: 130, g: 140, b: 175 };  // dim idle
        glowColor = "rgba(120,130,165,0.08)";
      }

      // Outer glow
      if (isListening || aiSpeaking) {
        const grad = ctx.createRadialGradient(cx, cy, R * 0.6 * pulse, cx, cy, R * 1.35 * pulse);
        grad.addColorStop(0, glowColor);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, R * 1.4 * pulse, 0, Math.PI * 2);
        ctx.fill();
      }

      // Sort particles by z for depth
      const projected = particlesRef.current.map(p => {
        const waveOffset = isListening
          ? audio * 18 * Math.sin(p.phase + t * p.speed * 2)
          : aiSpeaking
          ? 8 * Math.sin(p.phase + t * p.speed * 1.5)
          : 0;
        const r = (R + waveOffset) * pulse;

        // Rotate around Y then X
        const x1 = p.ox * cosY - p.oz * sinY;
        const z1 = p.ox * sinY + p.oz * cosY;
        const y1 = p.oy * cosX - z1 * sinX;
        const z2 = p.oy * sinX + z1 * cosX;

        const sc = r / R;
        return {
          sx: cx + x1 * r,
          sy: cy + y1 * r,
          z: z2,
          depth: (z2 + 1) / 2,
          size: p.size * sc,
        };
      }).sort((a, b) => a.z - b.z);

      projected.forEach(({ sx, sy, depth, size }) => {
        const alpha = 0.25 + depth * 0.75;
        const s = size * (0.5 + depth * 0.7);
        const { r, g, b } = primaryColor;
        ctx.beginPath();
        ctx.arc(sx, sy, s, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.fill();
      });

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [isListening, isProcessing, aiSpeaking, audioLevel]);

  return (
    <canvas
      ref={canvasRef}
      width={260}
      height={260}
      style={{ display: "block", margin: "0 auto" }}
    />
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function VoiceInput({ onTranscript, isProcessing, aiSpeaking, pendingQuestion }) {
  const [isListening, setIsListening] = useState(false);
  const [liveText, setLiveText] = useState("");
  const [typedText, setTypedText] = useState("");
  const [inputMode, setInputMode] = useState("voice");
  const [transcribing, setTranscribing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const recognitionRef = useRef(null);
  const fullTranscriptRef = useRef("");
  const animFrameRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const micStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const textareaRef = useRef(null);

  const startAudioAnalyser = useCallback(async (existingStream) => {
    try {
      const stream = existingStream || await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!existingStream) micStreamRef.current = stream;
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((s, v) => s + v, 0) / data.length;
        setAudioLevel(avg / 128);
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      // fallback: fake audio level animation
      let t = 0;
      const tick = () => {
        t += 0.1;
        setAudioLevel(0.3 + 0.3 * Math.sin(t));
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    }
  }, []);

  const stopAudioAnalyser = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    setAudioLevel(0);
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    analyserRef.current = null;
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    micStreamRef.current = null;
  }, []);

  // Mobile: MediaRecorder + Whisper
  const startListeningMobile = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      audioChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.start(100);
      setIsListening(true);
      startAudioAnalyser(stream);
    } catch (err) { console.error("Mic error:", err); }
  };

  const stopListeningMobile = async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    recorder.stop();
    setIsListening(false);
    stopAudioAnalyser();
    setTranscribing(true);
    await new Promise(resolve => { recorder.onstop = resolve; });
    const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
    const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
    try {
      const text = await transcribeWithWhisper(audioBlob);
      if (text.trim()) await onTranscript(text.trim());
    } catch (err) { console.error("Whisper error:", err); }
    setTranscribing(false);
  };

  // Desktop: Web Speech API
  const startListeningDesktop = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return startListeningMobile();
    fullTranscriptRef.current = "";
    setLiveText("");
    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onstart = () => { setIsListening(true); startAudioAnalyser(); };
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
      setIsListening(false); stopAudioAnalyser();
    };
    recognition.onend = () => { if (recognition._shouldKeepGoing) recognition.start(); };
    recognition._shouldKeepGoing = true;
    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListeningDesktop = async () => {
    if (!recognitionRef.current) return;
    recognitionRef.current._shouldKeepGoing = false;
    recognitionRef.current.stop();
    setIsListening(false);
    stopAudioAnalyser();
    const text = fullTranscriptRef.current.trim();
    setLiveText("");
    fullTranscriptRef.current = "";
    if (text) await onTranscript(text);
  };

  const startListening = () => isMobile() ? startListeningMobile() : startListeningDesktop();
  const stopListening = () => isMobile() ? stopListeningMobile() : stopListeningDesktop();

  const handleTextSubmit = async () => {
    const text = typedText.trim();
    if (!text || isProcessing) return;
    setTypedText("");
    await onTranscript(text);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleTextSubmit(); }
  };

  useEffect(() => () => { stopAudioAnalyser(); }, [stopAudioAnalyser]);

  const isTranscribing = transcribing;
  const state = aiSpeaking ? "ai-speaking" : (isProcessing || isTranscribing) ? "processing" : isListening ? "listening" : "idle";

  const statusMessages = {
    idle: pendingQuestion ? "Tap mic to answer or type below" : "Tap the sphere to start speaking",
    listening: isMobile() ? "Recording... tap to stop" : "Listening... tap to stop",
    processing: isTranscribing ? "Transcribing..." : "Thinking...",
    "ai-speaking": "Speaking...",
  };

  return (
    <section className="voice-section">
      <div className="input-mode-toggle">
        <button className={`mode-btn ${inputMode === "voice" ? "active" : ""}`} onClick={() => setInputMode("voice")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4z"/>
            <path d="M19 10a7 7 0 0 1-14 0H3a9 9 0 0 0 8 8.94V21H9v2h6v-2h-2v-2.06A9 9 0 0 0 21 10z"/>
          </svg>
          Voice
        </button>
        <button className={`mode-btn ${inputMode === "text" ? "active" : ""}`} onClick={() => { setInputMode("text"); setTimeout(() => textareaRef.current?.focus(), 100); }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
          </svg>
          Type
        </button>
      </div>

      {inputMode === "voice" && (
        <>
          {/* 3D Particle Sphere — clickable */}
          <button
            className={`sphere-btn state-${state}`}
            onClick={isListening ? stopListening : (!isProcessing && !aiSpeaking && !isTranscribing) ? startListening : undefined}
            disabled={isProcessing || aiSpeaking || isTranscribing}
            aria-label={isListening ? "Stop recording" : "Start recording"}
            style={{ background: "none", border: "none", cursor: isProcessing || aiSpeaking || isTranscribing ? "default" : "pointer", padding: 0 }}
          >
            <ParticleSphere
              isListening={isListening}
              isProcessing={isProcessing || isTranscribing}
              aiSpeaking={aiSpeaking}
              audioLevel={audioLevel}
            />
          </button>

          <p className="status-msg">{statusMessages[state]}</p>

          {liveText && isListening && (
            <div className="transcript-box">
              <span className="transcript-label live">● LIVE</span>
              <p className="transcript-text">"{liveText}"</p>
            </div>
          )}
        </>
      )}

      {inputMode === "text" && (
        <div className="text-input-wrap">
          <textarea
            ref={textareaRef}
            className="text-input"
            placeholder={pendingQuestion ? "Type your answer..." : "Type your tasks here... (e.g. Meeting at 2pm, lunch at 1pm)"}
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
