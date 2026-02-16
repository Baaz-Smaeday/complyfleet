"use client";
import { calcComplianceScore, scoreColor } from "../lib/utils";

export default function ComplianceDonut({ vehicles, defects, size = 64 }) {
  const score = calcComplianceScore(vehicles, defects);
  const color = scoreColor(score);
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E5E7EB" strokeWidth="5" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color.ring} strokeWidth="5"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: size * 0.28, fontWeight: 800, color: color.ring, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: size * 0.12, color: "#94A3B8", fontWeight: 600 }}>%</span>
      </div>
    </div>
  );
}

export function ComplianceDonutInline({ score, size = 40 }) {
  const color = scoreColor(score);
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E5E7EB" strokeWidth="4" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color.ring} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: size * 0.3, fontWeight: 800, color: color.ring, lineHeight: 1 }}>{score}</span>
      </div>
    </div>
  );
}
