import React, { useState, useRef, useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";

const FUNCTION_URL = "https://ksp-crimebot-backend.onrender.com";

const HotspotMap = ({ hotspots }) => {
  const districtCoords = {
    "Bengaluru Urban": [12.9716, 77.5946],
    "Bengaluru Rural": [13.1986, 77.7066],
    "Mysuru": [12.2958, 76.6394],
    "Dakshina Kannada": [12.9141, 74.8560],
    "Dharwad": [15.4589, 75.0078],
    "Hubballi-Dharwad": [15.3647, 75.1240],
    "Belagavi": [15.8497, 74.4977],
    "Kalaburagi": [17.3297, 76.8343],
    "Tumakuru": [13.3379, 77.1173],
    "Shivamogga": [13.9299, 75.5681],
    "Vijayapura": [16.8302, 75.7100],
    "Ballari": [15.1394, 76.9214],
    "Raichur": [16.2120, 77.3439]
  };

  const getColor = (count) => {
    if (count >= 15) return "#ff0000";
    if (count >= 8) return "#ff6600";
    if (count >= 5) return "#ffaa00";
    return "#ffff00";
  };

  return (
    <MapContainer
      center={[14.5, 75.7]}
      zoom={7}
      style={{ height: "450px", width: "100%", borderRadius: "12px" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="© OpenStreetMap"
      />
      {hotspots && hotspots.map(([district, count], i) => {
        const coords = districtCoords[district];
        if (!coords) return null;
        return (
          <CircleMarker
            key={i}
            center={coords}
            radius={Math.max(count * 3, 10)}
            fillColor={getColor(count)}
            color="#cc0000"
            fillOpacity={0.7}
            weight={2}
          >
            <Popup>
              <div style={{textAlign:'center'}}>
                <b>{district}</b><br />
                🚨 {count} crimes recorded<br />
                {count >= 15 ? "⛔ CRITICAL ZONE" : count >= 8 ? "🔴 HIGH ALERT" : count >= 5 ? "🟡 MEDIUM RISK" : "🟢 LOW RISK"}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
};

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
  const [hotspots, setHotspots] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchStats();
    fetchNetwork();
    fetchHotspots();
    fetchWarnings();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${FUNCTION_URL}/api/stats`);
      const data = await res.json();
      setStats(data);
    } catch (e) { console.error(e); }
  };

  const fetchNetwork = async () => {
    try {
      const res = await fetch(`${FUNCTION_URL}/api/network`);
      const data = await res.json();
      setNetwork(data);
    } catch (e) { console.error(e); }
  };

  const fetchHotspots = async () => {
    try {
      const res = await fetch(`${FUNCTION_URL}/api/hotspots`);
      const data = await res.json();
      setHotspots(data);
    } catch (e) { console.error(e); }
  };

  const fetchWarnings = async () => {
    try {
      const res = await fetch(`${FUNCTION_URL}/api/warnings`);
      const data = await res.json();
      setWarnings(data);
    } catch (e) { console.error(e); }
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
      setMessages([...newMessages, { role: "assistant", content: "⚠️ Error connecting to server. Please try again." }]);
    }
    setLoading(false);
  };

  const exportPDF = () => {
    const content = messages.map((m) => `[${m.role.toUpperCase()}]: ${m.content}`).join("\n\n");
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
    "Show cybercrime trends",
    "Which district has most crimes?",
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
          <button className="export-btn" onClick={exportPDF}>📄 Export</button>
        </div>
      </header>

      {/* Tabs */}
      <div className="tabs">
        {["chat", "stats", "map", "network", "warnings"].map((tab) => (
          <button
            key={tab}
            className={`tab ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "chat" ? "💬 Chat" :
             tab === "stats" ? "📊 Stats" :
             tab === "map" ? "🗺️ Map" :
             tab === "network" ? "🕸️ Network" : "⚠️ Warnings"}
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
                <div className="bubble loading"><span /><span /><span /></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="suggestions">
            {suggestedQueries.map((q, i) => (
              <button key={i} className="suggestion" onClick={() => setInput(q)}>{q}</button>
            ))}
          </div>
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
          <div className="stat-card">
            <h2>{stats.by_status?.Arrested || 0}</h2>
            <p>Arrested</p>
          </div>
          <div className="stat-card">
            <h2>{stats.by_status?.["Under Investigation"] || 0}</h2>
            <p>Under Investigation</p>
          </div>
          <div className="stat-section">
            <h3>📌 By Crime Type</h3>
            {Object.entries(stats.by_type || {}).sort((a,b) => b[1]-a[1]).map(([type, count]) => (
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
            {Object.entries(stats.by_district || {}).sort((a,b) => b[1]-a[1]).map(([district, count]) => (
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

      {/* Map Tab */}
      {activeTab === "map" && (
        <div className="map-container">
          <h3>🗺️ Karnataka Crime Hotspot Map</h3>
          <p>Circle size and color indicate crime density per district</p>
          <div className="map-legend">
            <span><span className="legend-dot" style={{background:'#ff0000'}}/>⛔ Critical (15+)</span>
            <span><span className="legend-dot" style={{background:'#ff6600'}}/>🔴 High (8-14)</span>
            <span><span className="legend-dot" style={{background:'#ffaa00'}}/>🟡 Medium (5-7)</span>
            <span><span className="legend-dot" style={{background:'#ffff00'}}/>🟢 Low (1-4)</span>
          </div>
          <HotspotMap hotspots={hotspots} />
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
                {link.cases && link.cases.length > 0 && (
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

      {/* Warnings Tab */}
      {activeTab === "warnings" && (
        <div className="warnings-container">
          <h3>⚠️ Early Warning System</h3>
          <p>Districts requiring immediate attention</p>
          {warnings.map((w, i) => (
            <div key={i} className={`warning-card ${w.crime_count >= 15 ? 'critical' : w.crime_count >= 8 ? 'high' : 'medium'}`}>
              <div className="warning-header">
                <span className="warning-icon">
                  {w.crime_count >= 15 ? '⛔' : w.crime_count >= 8 ? '🔴' : '🟡'}
                </span>
                <h4>{w.district}</h4>
                <span className="warning-count">{w.crime_count} crimes</span>
              </div>
              <p>{w.alert}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}