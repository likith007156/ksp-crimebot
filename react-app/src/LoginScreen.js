import React, { useState } from "react";
import { Shield, BarChart2, ShieldAlert, Briefcase, Key } from "lucide-react";

// Module-level registry to remember badge allocations during the session
const badgeRoleRegistry = new Map([
  ["INV-1001", "Investigator"],
  ["ANA-2001", "Analyst"],
  ["SUP-3001", "Supervisor"],
  ["PM-4001", "Policymaker"],
  ["KSP-1234", "Investigator"],
]);

const rolePrefixes = {
  Investigator: ["INV", "INVESTIGATOR"],
  Analyst: ["ANA", "ANALYST"],
  Supervisor: ["SUP", "SUPERVISOR"],
  Policymaker: ["PM", "POLICY"]
};

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

    // Check if the badge is already registered to a role
    const registeredRole = badgeRoleRegistry.get(cleanBadge);
    if (registeredRole) {
      if (registeredRole !== selectedRole) {
        setError(`Access Denied: Badge ID '${cleanBadge}' is unique to the '${registeredRole}' role.`);
        return;
      }
    } else {
      // Check if it matches prefixes of other roles to avoid mismatching formats
      let prefixMatchRole = null;
      for (const [roleName, prefixes] of Object.entries(rolePrefixes)) {
        if (prefixes.some(p => upperBadge.startsWith(p))) {
          prefixMatchRole = roleName;
          break;
        }
      }

      if (prefixMatchRole && prefixMatchRole !== selectedRole) {
        setError(`Access Denied: Badge format detected as '${prefixMatchRole}'. Cannot login as '${selectedRole}'.`);
        return;
      }

      // Dynamically lock new badge to selected role for this session
      badgeRoleRegistry.set(cleanBadge, selectedRole);
    }

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
                onClick={() => setSelectedRole(role.name)}
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
                placeholder="Enter Badge Number (e.g. KSP-9874)"
                value={badgeNumber}
                onChange={(e) => {
                  setBadgeNumber(e.target.value);
                  if (error) setError("");
                }}
              />
            </div>
            {error && <p className="error-message">{error}</p>}
          </div>

          <button type="submit" className="login-submit-btn">
            Authenticate & Proceed
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
