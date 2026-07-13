import jsPDF from 'jspdf';
import React, { useState, useRef, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";
import LoginScreen from "./LoginScreen";
import {
  MessageSquare,
  BarChart2,
  Map,
  Network,
  AlertTriangle,
  Sun,
  Moon,
  Download,
  Tag,
  MapPin,
  ShieldAlert,
  AlertOctagon,
  Lightbulb,
  Send,
  RefreshCw,
} from "lucide-react";

const FUNCTION_URL = "https://ksp-crimebot-backend.onrender.com";

/* ─── Dark-map tile layer (CartoDB Dark Matter) ─── */
const CARTO_DARK =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const CARTO_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>';

/* ─── Map component ─── */
const HotspotMap = ({ hotspots }) => {
  const districtCoords = {
    "Bengaluru Urban": [12.9716, 77.5946],
    "Bengaluru Rural": [13.1986, 77.7066],
    Mysuru: [12.2958, 76.6394],
    "Dakshina Kannada": [12.9141, 74.856],
    Dharwad: [15.4589, 75.0078],
    "Hubballi-Dharwad": [15.3647, 75.124],
    Belagavi: [15.8497, 74.4977],
    Kalaburagi: [17.3297, 76.8343],
    Tumakuru: [13.3379, 77.1173],
    Shivamogga: [13.9299, 75.5681],
    Vijayapura: [16.8302, 75.71],
    Ballari: [15.1394, 76.9214],
    Raichur: [16.212, 77.3439],
  };

  const getColor = (count) => {
    if (count >= 15) return "#ff4444";
    if (count >= 8) return "#ff7700";
    if (count >= 5) return "#ffbb00";
    return "#88dd44";
  };

  const getSeverityLabel = (count) => {
    if (count >= 15) return "CRITICAL ZONE";
    if (count >= 8) return "HIGH ALERT";
    if (count >= 5) return "MEDIUM RISK";
    return "LOW RISK";
  };

  return (
    <MapContainer
      center={[14.5, 75.7]}
      zoom={7}
      style={{ height: "450px", width: "100%", borderRadius: "12px" }}
    >
      <TileLayer url={CARTO_DARK} attribution={CARTO_ATTR} />
      {hotspots &&
        hotspots.map(([district, count], i) => {
          const coords = districtCoords[district];
          if (!coords) return null;
          return (
            <CircleMarker
              key={i}
              center={coords}
              radius={Math.max(count * 3, 10)}
              fillColor={getColor(count)}
              color="#cc0000"
              fillOpacity={0.75}
              weight={2}
            >
              <Popup>
                <div style={{ textAlign: "center", fontFamily: "Inter, sans-serif" }}>
                  <b>{district}</b>
                  <br />
                  {count} crimes recorded
                  <br />
                  <span style={{ color: getColor(count), fontWeight: 600 }}>
                    {getSeverityLabel(count)}
                  </span>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
    </MapContainer>
  );
};

/* ─── Network Graph component (ForceGraph2D with lazy import) ─── */
const NetworkGraph = ({ network, darkMode }) => {
  const [ForceGraph2D, setForceGraph2D] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const containerRef = useRef(null);

  useEffect(() => {
    import("react-force-graph-2d").then((mod) => {
      setForceGraph2D(() => mod.default);
    });
  }, []);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: Math.max(entry.contentRect.height, 500),
        });
      }
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const graphData = React.useMemo(() => {
    if (!network || network.length === 0) return { nodes: [], links: [] };
    const nodeSet = new Set();
    network.forEach((link) => {
      nodeSet.add(link.from);
      nodeSet.add(link.to);
    });
    const nodes = Array.from(nodeSet).map((id) => ({ id }));
    const links = network.map((link) => ({
      source: link.from,
      target: link.to,
      label: link.relationship,
    }));
    return { nodes, links };
  }, [network]);

  const nodeCanvasObject = useCallback(
    (node, ctx, globalScale) => {
      const label = node.id;
      const fontSize = Math.max(12 / globalScale, 8);
      const r = 18;
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
      ctx.fillStyle = darkMode ? "#1a4a8a" : "#1a3a6b";
      ctx.fill();
      ctx.strokeStyle = darkMode ? "#4fa3e3" : "#2563eb";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = `${fontSize}px Inter, sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // Truncate long names
      const maxLen = 12;
      const displayLabel =
        label.length > maxLen ? label.slice(0, maxLen) + "…" : label;
      ctx.fillText(displayLabel, node.x, node.y);
    },
    [darkMode]
  );

  const linkLabel = useCallback((link) => link.label || "", []);

  if (!ForceGraph2D) {
    return (
      <div className="graph-loading">
        <RefreshCw size={24} className="spin-icon" />
        <span>Loading graph…</span>
      </div>
    );
  }

  if (graphData.nodes.length === 0) {
    return (
      <div className="graph-empty">
        <Network size={40} />
        <p>No network data available</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="force-graph-container">
      <ForceGraph2D
        graphData={graphData}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor={darkMode ? "#0d1420" : "#f0f4ff"}
        nodeCanvasObject={nodeCanvasObject}
        nodeCanvasObjectMode={() => "replace"}
        linkColor={() => (darkMode ? "#334e6b" : "#94a3b8")}
        linkWidth={2}
        linkDirectionalArrowLength={6}
        linkDirectionalArrowRelPos={1}
        linkLabel={linkLabel}
        cooldownTicks={100}
        nodeLabel={(node) => node.id}
      />
    </div>
  );
};

/* ─── Main App ─── */
export default function App() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "ನಮಸ್ಕಾರ! I am KSP CrimeBot — your intelligent crime analysis assistant for Karnataka State Police. Ask me anything about crime patterns, cases, or criminal networks in English or Kannada.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState("chat");
  const [network, setNetwork] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [darkMode, setDarkMode] = useState(false); // light mode default
  const [lastSynced, setLastSynced] = useState("");
  const [hintDismissed, setHintDismissed] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const messagesEndRef = useRef(null);

  // Animated counter hook
  const useCounter = (target, active, duration = 1200) => {
    const [value, setValue] = useState(0);
    useEffect(() => {
      if (!active || !target) { setValue(0); return; }
      let start = 0;
      const step = Math.ceil(target / (duration / 16));
      const timer = setInterval(() => {
        start += step;
        if (start >= target) { setValue(target); clearInterval(timer); }
        else setValue(start);
      }, 16);
      return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [target, active]);
    return value;
  };

  // Trigger stats animation when tab opens
  useEffect(() => {
    if (activeTab === "stats") {
      setStatsVisible(false);
      const t = setTimeout(() => setStatsVisible(true), 50);
      return () => clearTimeout(t);
    }
  }, [activeTab]);

  const handleLogin = (userInfo) => {
    setUser(userInfo);
    if (userInfo.role === "Policymaker") {
      setActiveTab("stats");
    } else {
      setActiveTab("chat");
    }
  };

  // Counter values
  const cTotal      = useCounter(stats?.total_cases,                       statsVisible);
  const cLinks      = useCounter(stats?.network_links,                     statsVisible);
  const cArrested   = useCounter(stats?.by_status?.Arrested ?? 0,          statsVisible);
  const cInvest     = useCounter(stats?.by_status?.["Under Investigation"] ?? 0, statsVisible);

  useEffect(() => {
    fetchStats();
    fetchNetwork();
    fetchHotspots();
    fetchWarnings();
    // Set last synced timestamp
    const now = new Date();
    setLastSynced(
      now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    );
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
      console.error(e);
    }
  };

  const fetchNetwork = async () => {
    try {
      const res = await fetch(`${FUNCTION_URL}/api/network`);
      const data = await res.json();
      setNetwork(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchHotspots = async () => {
    try {
      const res = await fetch(`${FUNCTION_URL}/api/hotspots`);
      const data = await res.json();
      setHotspots(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchWarnings = async () => {
    try {
      const res = await fetch(`${FUNCTION_URL}/api/warnings`);
      const data = await res.json();
      setWarnings(data);
    } catch (e) {
      console.error(e);
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
        {
          role: "assistant",
          content: "Error connecting to server. Please try again.",
        },
      ]);
    }
    setLoading(false);
  };

const exportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const maxWidth = pageWidth - margin * 2;

    const addHeader = () => {
      // Dark blue header
      doc.setFillColor(13, 71, 161);
      doc.rect(0, 0, pageWidth, 42, 'F');

      // Gold accent line
      doc.setFillColor(255, 193, 7);
      doc.rect(0, 42, pageWidth, 2, 'F');

      // KSP Shield (drawn manually)
      doc.setFillColor(255, 255, 255);
      doc.circle(24, 21, 13, 'F');
      doc.setFillColor(13, 71, 161);
      doc.circle(24, 21, 10, 'F');
      doc.setFillColor(255, 193, 7);
      doc.circle(24, 21, 7, 'F');
      doc.setFillColor(13, 71, 161);
      doc.circle(24, 21, 4, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(5);
      doc.setFont('helvetica', 'bold');
      doc.text('KSP', 21.5, 22);

      // Title text
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.text('KARNATAKA STATE POLICE', 42, 13);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('State Crime Records Bureau (SCRB) — Datathon 2026', 42, 21);

      doc.setFontSize(8);
      doc.setTextColor(144, 202, 249);
      doc.text('KSP CrimeBot AI Crime Analysis Report', 42, 29);
      doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 42, 36);
    };

    const addFooter = (pageNum, totalPages) => {
      doc.setFillColor(13, 71, 161);
      doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'normal');
      doc.text('Karnataka State Police | SCRB | KSP CrimeBot AI Analysis', margin, pageHeight - 4);
      doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - 28, pageHeight - 4);
      doc.setTextColor(255, 193, 7);
      doc.text('CONFIDENTIAL — FOR POLICE USE ONLY', pageWidth / 2 - 22, pageHeight - 4);
    };

    // ---- PAGE 1 ----
    addHeader();
    let y = 52;

    // Report title box
    doc.setFillColor(232, 240, 254);
    doc.rect(margin, y, maxWidth, 12, 'F');
    doc.setDrawColor(13, 71, 161);
    doc.setLineWidth(0.5);
    doc.rect(margin, y, maxWidth, 12, 'S');
    doc.setTextColor(13, 71, 161);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('CRIME ANALYSIS CONVERSATION REPORT', margin + 4, y + 8);
    y += 18;

    // FIR Info Table
    doc.setFillColor(245, 247, 250);
    doc.rect(margin, y, maxWidth, 36, 'F');
    doc.setDrawColor(180, 180, 200);
    doc.rect(margin, y, maxWidth, 36, 'S');

    const half = maxWidth / 2;
    const firInfo = [
      ['District Name', 'All 12 Karnataka Districts', 'Unit Name', 'SCRB — State HQ'],
      ['FIR Year', '2024-2025', 'FIR Stage', 'Investigation / Trial'],
      ['Crime Group', 'IPC / NDPS / IT Act', 'Complaint Mode', 'Direct / Online'],
      ['Total FIRs', '100 Cases Analyzed', 'Report Type', 'AI Pattern Analysis'],
    ];

    firInfo.forEach(([k1, v1, k2, v2], i) => {
      const rowY = y + 8 + i * 8;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(60, 60, 60);
      doc.text(k1 + ':', margin + 3, rowY);
      doc.text(k2 + ':', margin + half + 3, rowY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(13, 71, 161);
      doc.text(v1, margin + 38, rowY);
      doc.text(v2, margin + half + 30, rowY);
    });
    y += 44;

    // Conversation header
    doc.setFillColor(13, 71, 161);
    doc.rect(margin, y, maxWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('INVESTIGATOR QUERIES & AI RESPONSES', margin + 4, y + 5.5);
    y += 12;

    // Filter out non-English characters for PDF compatibility
    const cleanForPDF = (text) => {
      return text
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/#{1,6} /g, '')
        .replace(/[^\x00-\x7F]/g, (char) => {
          // Replace Kannada and other non-latin with transliteration note
          return '[Kannada]';
        });
    };

    // Messages
    const filteredMessages = messages.filter(m => m.role !== 'assistant' || messages.indexOf(m) > 0);

    filteredMessages.forEach((msg, index) => {
      if (y > pageHeight - 50) {
        doc.addPage();
        addHeader();
        y = 52;
      }

      // Role badge
      if (msg.role === 'user') {
        doc.setFillColor(227, 242, 253);
        doc.setDrawColor(33, 150, 243);
      } else {
        doc.setFillColor(232, 245, 233);
        doc.setDrawColor(56, 142, 60);
      }
      doc.rect(margin, y - 1, maxWidth, 7, 'F');
      doc.rect(margin, y - 1, 3, 7, 'F');

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      if (msg.role === 'user') {
        doc.setTextColor(13, 71, 161);
        doc.text(`[Q${index + 1}] INVESTIGATOR:`, margin + 5, y + 4);
      } else {
        doc.setTextColor(27, 94, 32);
        doc.text(`[A${index + 1}] KSP CRIMEBOT:`, margin + 5, y + 4);
      }
      y += 10;

      // Content
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(40, 40, 40);

      const cleanText = cleanForPDF(msg.content);
      const lines = doc.splitTextToSize(cleanText, maxWidth - 4);

      lines.forEach(line => {
        if (y > pageHeight - 50) {
          doc.addPage();
          addHeader();
          y = 52;
        }
        doc.text(line, margin + 2, y);
        y += 4.5;
      });

      // Case tags
      if (msg.cases && msg.cases.length > 0) {
        if (y > pageHeight - 50) {
          doc.addPage();
          addHeader();
          y = 52;
        }
        y += 2;
        doc.setFillColor(13, 71, 161);
        doc.rect(margin, y - 3, maxWidth, 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.text(`Referenced Cases: ${msg.cases.join(' | ')}`, margin + 3, y + 1.5);
        y += 9;
      }

      // Divider
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;
    });

    // FIR Summary Table
    if (y > pageHeight - 100) {
      doc.addPage();
      addHeader();
      y = 52;
    }

    y += 4;
    doc.setFillColor(13, 71, 161);
    doc.rect(margin, y, maxWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('FIR ANALYSIS SUMMARY', margin + 4, y + 5.5);
    y += 10;

    const firSummary = [
      ['District Name', 'All 12 Karnataka Districts'],
      ['Unit Name', 'SCRB — State Crime Records Bureau'],
      ['FIR Year', '2024-2025'],
      ['FIR Month', 'January 2024 — December 2025'],
      ['Crime Group Name', 'IPC / NDPS / IT Act / Special Laws'],
      ['Crime Head Name', 'Theft / Robbery / Cybercrime / Murder / Kidnapping'],
      ['Act Section', 'IPC 379 / 392 / 302 / 363 | IT Act 66C | NDPS 20'],
      ['Place of Offence', 'Urban & Rural areas across Karnataka'],
      ['Total FIRs Analyzed', '100 Cases'],
      ['Victim Count', 'Multiple victims across all districts'],
      ['Accused Count', '100+ individuals identified'],
      ['Arrested Male', '48 arrested'],
      ['Arrested Female', '2 arrested'],
      ['Arrested Count', '50 total arrested'],
      ['Charge Sheeted Count', '8 cases charge sheeted'],
      ['Conviction Count', '2 convictions recorded'],
      ['Complaint Mode', 'Direct / Online / Phone / Mobile App'],
      ['FIR Stage', 'Under Investigation / Chargesheeted / Convicted'],
      ['IO Name', 'Multiple SCRB Investigating Officers'],
      ['Beat Name', 'All beats across 12 districts'],
    ];

    firSummary.forEach(([field, value], i) => {
      if (y > pageHeight - 30) {
        doc.addPage();
        addHeader();
        y = 52;
      }
      if (i % 2 === 0) {
        doc.setFillColor(245, 247, 250);
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.rect(margin, y, maxWidth, 7, 'F');
      doc.setDrawColor(220, 220, 220);
      doc.rect(margin, y, maxWidth, 7, 'S');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(60, 60, 60);
      doc.text(field + ':', margin + 3, y + 5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(13, 71, 161);
      doc.text(value, margin + 65, y + 5);
      y += 7;
    });

    // Fix page numbers
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addFooter(i, totalPages);
    }

    doc.save(`KSP_FIR_Report_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  const suggestedQueries = [
    "Show all theft cases in Bengaluru",
    "Who are the repeat offenders?",
    "Show cybercrime trends",
    "Which district has most crimes?",
    "ಬೆಂಗಳೂರಿನಲ್ಲಿ ಅಪರಾಧ ಮಾಹಿತಿ ತೋರಿಸಿ",
  ];

  const tabs = [
    { id: "chat", label: "Chat", icon: <MessageSquare size={16} /> },
    { id: "stats", label: "Stats", icon: <BarChart2 size={16} /> },
    { id: "map", label: "Map", icon: <Map size={16} /> },
    { id: "network", label: "Network", icon: <Network size={16} /> },
    { id: "warnings", label: "Warnings", icon: <AlertTriangle size={16} /> },
  ];

  const filteredTabs = React.useMemo(() => {
    if (user?.role === "Policymaker") {
      return tabs.filter((tab) => tab.id === "stats" || tab.id === "map");
    }
    return tabs;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const maxStatValue =
    stats
      ? Math.max(
          ...[
            ...Object.values(stats.by_type || {}),
            ...Object.values(stats.by_district || {}),
          ]
        )
      : 1;

  return (
    <div className={`app${darkMode ? " dark" : ""}`}>
      {/* ── Watermark ── */}
      <div className="watermark" aria-hidden="true">
        <img src="/ksp-emblem.png" alt="" />
      </div>

      {/* ── Header ── */}
      <header className="header">
        <div className="header-left">
          <img
            src="/ksp-emblem.png"
            alt="KSP Emblem"
            className="header-logo"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
          <div>
            <h1>KSP CrimeBot</h1>
            <p>Karnataka State Police — Intelligent Crime Analysis</p>
          </div>
        </div>
        <div className="header-right">
          {user && (
            <div className="user-badge" title={`${user.badgeNumber} (${user.role})`}>
              <span className="user-status-dot"></span>
              <span className="user-info-text">{user.badgeNumber} ({user.role})</span>
            </div>
          )}
          <div className="last-synced-badge">
            <RefreshCw size={13} />
            <span>Last synced: {lastSynced || "—"}</span>
          </div>
          <button
            className="theme-toggle"
            onClick={() => setDarkMode((d) => !d)}
            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            aria-label="Toggle dark mode"
          >
            {darkMode ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button className="export-btn" onClick={exportPDF} title="Export conversation">
            <Download size={15} />
            <span>Export</span>
          </button>
        </div>
      </header>

      {/* ── Tabs ── */}
      {user && (
        <div className="tabs" role="tablist">
          {filteredTabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`tab${activeTab === tab.id ? " active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Conditional Login vs Dashboard content ── */}
      {!user ? (
        <LoginScreen onLogin={handleLogin} />
      ) : (
        <>
          {/* ══ CHAT TAB ══ */}
          {activeTab === "chat" && (
            <div className="chat-container">
              {/* Onboarding hint */}
              {!hintDismissed && (
                <div className="onboarding-hint" role="note">
                  <Lightbulb size={15} className="hint-icon" />
                  <span>
                    Try: <em>"Show all theft cases in Bengaluru"</em> or ask in
                    Kannada — <em>"ಬೆಂಗಳೂರಿನಲ್ಲಿ ಅಪರಾಧ ಮಾಹಿತಿ ತೋರಿಸಿ"</em>
                  </span>
                  <button
                    className="hint-dismiss"
                    onClick={() => setHintDismissed(true)}
                    aria-label="Dismiss hint"
                  >
                    ×
                  </button>
                </div>
              )}

              <div className="messages">
                {messages.map((msg, i) => (
                  <div key={i} className={`message ${msg.role}`}>
                    {msg.role === "assistant" && (
                      <img
                        src="/bot-avatar.jpg"
                        alt="KSP Bot"
                        className="bot-avatar"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    )}
                    <div className="bubble">
                      <p dangerouslySetInnerHTML={{
  __html: msg.content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')
    .replace(/^(\d+\.)/gm, '<span class="list-num">$1</span>')
}} />
                      {msg.cases && msg.cases.length > 0 && (
                        <div className="case-tags">
                          {msg.cases.map((c) => (
                            <span key={c} className="case-tag">
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="message assistant">
                    <img
                      src="/bot-avatar.jpg"
                      alt="KSP Bot"
                      className="bot-avatar"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                    <div className="bubble loading">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Suggestions */}
              <div className="suggestions">
                {suggestedQueries.map((q, i) => (
                  <button
                    key={i}
                    className="suggestion"
                    onClick={() => setInput(q)}
                  >
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
                  placeholder="Ask about crimes, patterns, suspects… (English or Kannada)"
                />
                <button
                  onClick={sendMessage}
                  disabled={loading}
                  aria-label="Send message"
                >
                  <Send size={17} />
                  <span>{loading ? "Sending…" : "Send"}</span>
                </button>
              </div>
            </div>
          )}

          {/* ══ STATS TAB ══ */}
          {activeTab === "stats" && stats && (
            <div className="stats-container">
              {/* Stat cards — animated counters */}
              <div className="stat-card accent-blue">
                <div className="stat-number">{cTotal}</div>
                <div className="stat-label">Total Cases</div>
              </div>
              <div className="stat-card accent-purple">
                <div className="stat-number">{cLinks}</div>
                <div className="stat-label">Network Links</div>
              </div>
              <div className="stat-card accent-green">
                <div className="stat-number">{cArrested}</div>
                <div className="stat-label">Arrested</div>
              </div>
              <div className="stat-card accent-amber">
                <div className="stat-number">{cInvest}</div>
                <div className="stat-label">Under Investigation</div>
              </div>

              {/* By Crime Type */}
              <div className="stat-section">
                <h3>
                  <Tag size={15} />
                  <span>By Crime Type</span>
                </h3>
                <div className="bar-chart">
                  {Object.entries(stats.by_type || {})
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, count]) => {
                      const pct = Math.round((count / maxStatValue) * 100);
                      return (
                        <div key={type} className="stat-bar">
                          <span className="bar-label">{type}</span>
                          <div className="bar-track">
                            <div
                              className="bar-fill"
                              style={{ width: statsVisible ? `${pct}%` : "0%" }}
                            />
                            {/* Gridlines */}
                            {[25, 50, 75].map((tick) => (
                              <div
                                key={tick}
                                className="bar-tick"
                                style={{ left: `${tick}%` }}
                              />
                            ))}
                          </div>
                          <span className="bar-count">{count}</span>
                        </div>
                      );
                    })}
                  <div className="bar-axis">
                    <span>0</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>

              {/* By District */}
              <div className="stat-section">
                <h3>
                  <MapPin size={15} />
                  <span>By District</span>
                </h3>
                <div className="bar-chart">
                  {Object.entries(stats.by_district || {})
                    .sort((a, b) => b[1] - a[1])
                    .map(([district, count]) => {
                      const pct = Math.round((count / maxStatValue) * 100);
                      return (
                        <div key={district} className="stat-bar">
                          <span className="bar-label">{district}</span>
                          <div className="bar-track">
                            <div
                              className="bar-fill"
                              style={{ width: statsVisible ? `${pct}%` : "0%" }}
                            />
                            {[25, 50, 75].map((tick) => (
                              <div
                                key={tick}
                                className="bar-tick"
                                style={{ left: `${tick}%` }}
                              />
                            ))}
                          </div>
                          <span className="bar-count">{count}</span>
                        </div>
                      );
                    })}
                  <div className="bar-axis">
                    <span>0</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══ MAP TAB ══ */}
          {activeTab === "map" && (
            <div className="map-container">
              <h3>
                <Map size={18} />
                <span>Karnataka Crime Hotspot Map</span>
              </h3>
              <p className="map-subtitle">
                Circle size and color indicate crime density per district
              </p>
              <div className="map-hint">
                <Lightbulb size={13} />
                <span>
                  Pan by dragging · Zoom with scroll or pinch · Click a circle to
                  see district details
                </span>
              </div>
              <div className="map-legend">
                <span>
                  <span className="legend-dot" style={{ background: "#ff4444" }} />
                  Critical (15+)
                </span>
                <span>
                  <span className="legend-dot" style={{ background: "#ff7700" }} />
                  High (8–14)
                </span>
                <span>
                  <span className="legend-dot" style={{ background: "#ffbb00" }} />
                  Medium (5–7)
                </span>
                <span>
                  <span className="legend-dot" style={{ background: "#88dd44" }} />
                  Low (1–4)
                </span>
              </div>
              <HotspotMap hotspots={hotspots} />
            </div>
          )}

          {/* ══ NETWORK TAB ══ */}
          {activeTab === "network" && (
            <div className="network-container">
              <h3>
                <Network size={18} />
                <span>Criminal Network Graph</span>
              </h3>
              <p>
                Known associations between accused persons — drag nodes to explore
              </p>
              <NetworkGraph network={network} darkMode={darkMode} />
            </div>
          )}

          {/* ══ WARNINGS TAB ══ */}
          {activeTab === "warnings" && (
            <div className="warnings-container">
              <h3>
                <AlertTriangle size={18} />
                <span>Early Warning System</span>
              </h3>
              <p>Districts requiring immediate attention</p>
              {warnings.map((w, i) => {
                const severity =
                  w.crime_count >= 15
                    ? "critical"
                    : w.crime_count >= 8
                    ? "high"
                    : "medium";
                const Icon =
                  w.crime_count >= 15
                    ? ShieldAlert
                    : w.crime_count >= 8
                    ? AlertOctagon
                    : AlertTriangle;
                return (
                  <div key={i} className={`warning-card ${severity}`}>
                    <div className="warning-header">
                      <span className="warning-icon">
                        <Icon size={20} />
                      </span>
                      <h4>{w.district}</h4>
                      <span className="warning-count">{w.crime_count} crimes</span>
                    </div>
                    <p>{w.alert}</p>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}