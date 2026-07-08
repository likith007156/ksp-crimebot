import React, { useState, useRef, useEffect } from "react";
import "./App.css";

const FUNCTION_URL = "https://ksp-crimebot-60033455592.development.catalystappsail.com"; // We'll update this after deploy

export default function App() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "ನಮಸ್ಕಾರ! I am KSP CrimeBot 🚔 — your intelligent crime analysis assistant for Karnataka State Police. Ask me anything about crime patterns, cases, or criminal networks in English or Kannada.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState("chat");
  const [network, setNetwork] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchStats();
    fetchNetwork();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${FUNCTION_URL}/api/stats`);
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error("Stats fetch failed:", e);
    }
  };

  const fetchNetwork = async () => {
    try {
      const res = await fetch(`${FUNCTION_URL}/api/network`);
      const data = await res.json();
      setNetwork(data);
    } catch (e) {
      console.error("Network fetch failed:", e);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: "user", content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const history = newMessages.slice(0, -1).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch(`${FUNCTION_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, history }),
      });

      const data = await res.json();
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: data.response,
          cases: data.relevant_cases,
          connections: data.network_connections,
        },
      ]);
    } catch (e) {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "⚠️ Error connecting to server. Please try again." },
      ]);
    }
    setLoading(false);
  };

  const exportPDF = () => {
    const content = messages
      .map((m) => `[${m.role.toUpperCase()}]: ${m.content}`)
      .join("\n\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ksp_crimebot_conversation.txt";
    a.click();
  };

  const suggestedQueries = [
    "Show all theft cases in Bengaluru",
    "Who are the repeat offenders?",
    "What is the criminal network of Raju Kumar?",
    "Show cybercrime trends",
    "ಬೆಂಗಳೂರಿನಲ್ಲಿ ಅಪರಾಧ ಮಾಹಿತಿ ತೋರಿಸಿ",
  ];

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <span className="badge">🛡️</span>
          <div>
            <h1>KSP CrimeBot</h1>
            <p>Karnataka State Police — Intelligent Crime Analysis</p>
          </div>
        </div>
        <div className="header-right">
          <span className="status-dot" />
          <span>Live</span>
          <button className="export-btn" onClick={exportPDF}>
            📄 Export
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="tabs">
        {["chat", "stats", "network"].map((tab) => (
          <button
            key={tab}
            className={`tab ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "chat" ? "💬 Chat" : tab === "stats" ? "📊 Stats" : "🕸️ Network"}
          </button>
        ))}
      </div>

      {/* Chat Tab */}
      {activeTab === "chat" && (
        <div className="chat-container">
          <div className="messages">
            {messages.map((msg, i) => (
              <div key={i} className={`message ${msg.role}`}>
                <div className="bubble">
                  <p>{msg.content}</p>
                  {msg.cases && msg.cases.length > 0 && (
                    <div className="case-tags">
                      {msg.cases.map((c) => (
                        <span key={c} className="case-tag">{c}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="message assistant">
                <div className="bubble loading">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Queries */}
          <div className="suggestions">
            {suggestedQueries.map((q, i) => (
              <button key={i} className="suggestion" onClick={() => setInput(q)}>
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="input-area">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask about crimes, patterns, suspects... (English or Kannada)"
            />
            <button onClick={sendMessage} disabled={loading}>
              {loading ? "..." : "Send 🚀"}
            </button>
          </div>
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === "stats" && stats && (
        <div className="stats-container">
          <div className="stat-card">
            <h2>{stats.total_cases}</h2>
            <p>Total Cases</p>
          </div>
          <div className="stat-card">
            <h2>{stats.network_links}</h2>
            <p>Criminal Network Links</p>
          </div>
          <div className="stat-section">
            <h3>📌 By Crime Type</h3>
            {Object.entries(stats.by_type).map(([type, count]) => (
              <div key={type} className="stat-bar">
                <span>{type}</span>
                <div className="bar">
                  <div className="fill" style={{ width: `${(count / stats.total_cases) * 100}%` }} />
                </div>
                <span>{count}</span>
              </div>
            ))}
          </div>
          <div className="stat-section">
            <h3>📍 By District</h3>
            {Object.entries(stats.by_district).map(([district, count]) => (
              <div key={district} className="stat-bar">
                <span>{district}</span>
                <div className="bar">
                  <div className="fill" style={{ width: `${(count / stats.total_cases) * 100}%` }} />
                </div>
                <span>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Network Tab */}
      {activeTab === "network" && (
        <div className="network-container">
          <h3>🕸️ Criminal Network Map</h3>
          <p>Known associations between accused persons</p>
          {network.map((link, i) => (
            <div key={i} className="network-card">
              <div className="node">{link.from}</div>
              <div className="edge">
                <span>{link.relationship}</span>
                <div className="arrow">↔</div>
                {link.cases.length > 0 && (
                  <div className="cases">
                    {link.cases.map((c) => (
                      <span key={c} className="case-tag">{c}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="node">{link.to}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}