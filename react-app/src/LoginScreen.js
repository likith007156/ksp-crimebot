import React, { useState } from "react";
import { Shield, BarChart2, ShieldAlert, Briefcase, Key } from "lucide-react";

// ─── Whitelist: ID → role mapping ───────────────────────────────────────────
// Add new IDs here without touching the validation logic below.
// Keys are stored UPPERCASE; lookup always uppercases the input first.
const VALID_CREDENTIALS = {
  "INV-1001": "Investigator",
  "KSP-1234": "Investigator",
  "ANA-2001": "Analyst",
  "SUP-3001": "Supervisor",
  "PM-4001":  "Policymaker",
};
// ────────────────────────────────────────────────────────────────────────────

export default function LoginScreen({ onLogin }) {
  const [selectedRole, setSelectedRole] = useState("Investigator");
  const [badgeNumber, setBadgeNumber] = useState("");
  const [error, setError] = useState("");

  const roles = [
    {
      name: "Investigator",
      icon: <Shield size={20} />,
      desc: "Case queries, network analysis, case details",
    },
    {
      name: "Analyst",
      icon: <BarChart2 size={20} />,
      desc: "Full analytics, trends, hotspot data",
    },
    {
      name: "Supervisor",
      icon: <ShieldAlert size={20} />,
      desc: "All access + district-level oversight",
    },
    {
      name: "Policymaker",
      icon: <Briefcase size={20} />,
      desc: "Aggregated stats and trend reports only",
    },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();

    const cleanBadge = badgeNumber.trim();
    if (!cleanBadge) {
      setError("Please enter a valid Badge Number / Officer ID.");
      return;
    }

    const upperBadge = cleanBadge.toUpperCase();
    const mappedRole = VALID_CREDENTIALS[upperBadge];

    if (!mappedRole) {
      // ID not in whitelist at all
      setError("Badge number not recognized.");
      return;
    }

    if (mappedRole !== selectedRole) {
      // ID exists but maps to a different role
      setError(
        `This ID is not valid for the ${selectedRole} role. Try selecting ${mappedRole} instead.`
      );
      return; // keep selectedRole highlighted — do NOT reset it
    }

    // ID found and role matches → proceed
    onLogin({ role: selectedRole, badgeNumber: cleanBadge });
  };

  return (
    <div className="login-screen">
      {/* Centered login card */}
      <div className="login-card">
        <div className="login-header">
          <img src="/ksp-emblem.png" alt="KSP Emblem" className="login-logo" />
          <h1>KSP CrimeBot</h1>
          <p className="login-subtitle">Karnataka State Police — Intelligent Crime Analysis</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <label className="section-label">Select Your Role</label>
          <div className="role-grid">
            {roles.map((role) => (
              <button
                key={role.name}
                type="button"
                className={`role-card ${selectedRole === role.name ? "selected" : ""}`}
                onClick={() => {
                  setSelectedRole(role.name);
                  setError(""); // clear error when role changes
                }}
              >
                <div className="role-icon-wrapper">{role.icon}</div>
                <div className="role-info">
                  <span className="role-name">{role.name}</span>
                  <span className="role-desc">{role.desc}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="input-group">
            <label htmlFor="badgeNumber" className="section-label">Officer ID / Badge Number</label>
            <div className="input-with-icon">
              <Key size={16} className="input-icon" />
              <input
                type="text"
                id="badgeNumber"
                placeholder="e.g. INV-1001, KSP-1234, ANA-2001…"
                value={badgeNumber}
                onChange={(e) => {
                  setBadgeNumber(e.target.value);
                  // Clear error only on keystroke so the message isn't
                  // disruptive, but validation still fires on submit.
                  if (error) setError("");
                }}
              />
            </div>
            {error && <p className="error-message">{error}</p>}
          </div>

          <button type="submit" className="login-submit-btn">
            Authenticate &amp; Proceed
          </button>
        </form>

        <div className="login-footer">
          <p>⚠️ Authorized Personnel Only. All access is logged.</p>
          <p className="gov-tag">Government of Karnataka — Karnataka State Police Dept.</p>
        </div>
      </div>
    </div>
  );
}
