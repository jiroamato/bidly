"use client";

import { useState } from "react";
import { ChatInput } from "@/components/chat-input";
import { AgentState } from "@/hooks/use-agent";
import { useChat } from "@/hooks/use-chat";

interface WriterViewProps {
  agent: AgentState;
}

type SectionId = "exec_summary" | "technical" | "team" | "project_mgmt" | "safety" | "pricing" | "forms" | "preview";
type SectionStatus = "done" | "draft" | "empty";

interface Section {
  id: SectionId;
  label: string;
  status: SectionStatus;
  group: "sections" | "forms" | "export";
}

const SECTIONS: Section[] = [
  { id: "exec_summary", label: "Executive Summary", status: "draft", group: "sections" },
  { id: "technical", label: "Technical Approach", status: "done", group: "sections" },
  { id: "team", label: "Team & Experience", status: "draft", group: "sections" },
  { id: "project_mgmt", label: "Project Management", status: "empty", group: "sections" },
  { id: "safety", label: "Safety Plan", status: "empty", group: "sections" },
  { id: "pricing", label: "Pricing Schedule", status: "empty", group: "forms" },
  { id: "forms", label: "Form Guidance", status: "empty", group: "forms" },
  { id: "preview", label: "Preview Full Bid", status: "done", group: "export" },
];

const MOCK_CONTENT: Record<string, { blocks: { label: string; content: string; suggestion?: string }[]; pricing?: { items: { desc: string; amount: number }[]; province: string } }> = {
  exec_summary: {
    blocks: [
      {
        label: "Opening Statement",
        content: "Maple Facility Services Inc. is pleased to submit this proposal for Janitorial and Facility Cleaning Services at RCMP Detachments across Saskatchewan (Solicitation #EP732-242817). With extensive experience maintaining federal law enforcement facilities, we are well-positioned to deliver consistent, high-quality cleaning services that meet the security and operational requirements of active RCMP detachments.",
      },
      {
        label: "Company Qualifications",
        content: "Maple Facility Services Inc. has provided commercial janitorial and facility cleaning services across Saskatchewan for over 8 years. Our portfolio includes cleaning and maintaining secured government facilities, including multiple RCMP detachments in Regina, Saskatoon, and rural communities.\n\nWe maintain WSIB equivalent certification, bonding up to $500K, and carry $2M commercial liability insurance. Our team is trained in RCMP-specific security protocols and holds valid RCMP security clearances for facility access.",
        suggestion: "Consider highlighting your experience with rural RCMP detachments specifically — the evaluation criteria weights relevant experience at 30%. Mention any after-hours or on-call cleaning capabilities.",
      },
    ],
  },
  technical: {
    blocks: [
      {
        label: "Methodology",
        content: "Our approach follows a structured service delivery model designed for secure government facilities. Phase 1 involves security orientation and site assessment at each detachment. Phase 2 covers routine daily cleaning services including office areas, holding cells, interview rooms, and public-facing spaces. Phase 3 addresses periodic deep cleaning, floor care, and HVAC vent cleaning on a quarterly cycle.",
      },
    ],
  },
  pricing: {
    blocks: [],
    pricing: {
      items: [
        { desc: "Monthly Janitorial Services — Regina Detachment", amount: 8500 },
        { desc: "Monthly Janitorial Services — Saskatoon Detachment", amount: 7200 },
        { desc: "Monthly Janitorial Services — Rural Locations (6 sites)", amount: 18000 },
        { desc: "Quarterly Deep Cleaning — All Locations", amount: 12000 },
        { desc: "Emergency / On-Call Cleaning", amount: 3500 },
        { desc: "Supplies & Equipment", amount: 4800 },
      ],
      province: "Saskatchewan",
    },
  },
};

const STATUS_ICONS: Record<SectionStatus, { icon: string; color: string }> = {
  done: { icon: "\u2713", color: "var(--success)" },
  draft: { icon: "\u25CF", color: "var(--agent-writer)" },
  empty: { icon: "\u25CB", color: "var(--text-hint)" },
};

/* ---------- PDF PREVIEW DATA ---------- */

const PDF_PRICING = [
  { desc: "Monthly Janitorial Services — Regina Detachment", amount: 8500 },
  { desc: "Monthly Janitorial Services — Saskatoon Detachment", amount: 7200 },
  { desc: "Monthly Janitorial Services — Rural Locations (6 sites)", amount: 18000 },
  { desc: "Quarterly Deep Cleaning — All Locations", amount: 12000 },
  { desc: "Emergency / On-Call Cleaning", amount: 3500 },
  { desc: "Supplies & Equipment", amount: 4800 },
];

const PDF_MONTHLY_TOTAL = PDF_PRICING.reduce((a, i) => a + i.amount, 0);
const PDF_ANNUAL_TOTAL = PDF_MONTHLY_TOTAL * 12;
const PDF_GST = Math.round(PDF_ANNUAL_TOTAL * 0.05);
const PDF_GRAND_TOTAL = PDF_ANNUAL_TOTAL + PDF_GST;

function BidPreview() {
  return (
    <div className="flex-1 overflow-y-auto" style={{ background: "#e5e7eb" }}>
      <div className="py-8 px-6 flex justify-center">
        <div
          style={{
            width: 816,
            minHeight: 1056,
            background: "#fff",
            boxShadow: "0 4px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)",
            fontFamily: "'Times New Roman', 'Georgia', serif",
            color: "#1a1a1a",
            position: "relative",
          }}
        >
          {/* Page 1 — Cover */}
          <div style={{ padding: "72px 72px 48px 72px" }}>
            {/* Header bar */}
            <div style={{ borderBottom: "3px solid #1a1a1a", paddingBottom: 24, marginBottom: 48 }}>
              <div style={{ fontSize: 11, letterSpacing: "3px", textTransform: "uppercase", color: "#666", fontFamily: "Arial, sans-serif", marginBottom: 8 }}>
                PROTECTED B WHEN COMPLETED
              </div>
              <div style={{ fontSize: 11, letterSpacing: "1px", color: "#666", fontFamily: "Arial, sans-serif" }}>
                Public Works and Government Services Canada
              </div>
            </div>

            {/* Title block */}
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <div style={{ fontSize: 14, letterSpacing: "4px", textTransform: "uppercase", color: "#888", fontFamily: "Arial, sans-serif", marginBottom: 16 }}>
                BID PROPOSAL
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.3, marginBottom: 16 }}>
                Janitorial and Facility Cleaning Services
              </div>
              <div style={{ fontSize: 18, color: "#444", marginBottom: 8 }}>
                RCMP Detachments — Saskatchewan Region
              </div>
              <div style={{ fontSize: 13, color: "#888", fontFamily: "Arial, sans-serif", letterSpacing: "1px" }}>
                Solicitation No. EP732-242817
              </div>
            </div>

            {/* Info table */}
            <div style={{ maxWidth: 480, margin: "0 auto 48px", borderTop: "1px solid #ddd" }}>
              {[
                ["Submitted By", "Maple Facility Services Inc."],
                ["Address", "Regina, Saskatchewan"],
                ["Date", "March 22, 2026"],
                ["Contact", "Operations Manager"],
                ["Closing Date", "April 15, 2026 — 2:00 PM CST"],
                ["Contracting Authority", "PWGSC — Western Region"],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", borderBottom: "1px solid #eee", padding: "10px 0" }}>
                  <div style={{ width: 180, fontSize: 12, color: "#888", fontFamily: "Arial, sans-serif", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    {label}
                  </div>
                  <div style={{ flex: 1, fontSize: 14 }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Confidentiality notice */}
            <div style={{ fontSize: 10, color: "#999", textAlign: "center", fontFamily: "Arial, sans-serif", lineHeight: 1.6, borderTop: "1px solid #eee", paddingTop: 16 }}>
              This document contains proprietary and confidential information.<br />
              It is submitted solely for the purpose of evaluation under the above solicitation.
            </div>
          </div>

          {/* Page break indicator */}
          <div style={{ borderTop: "2px dashed #d1d5db", margin: "0 48px", position: "relative" }}>
            <span style={{ position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)", background: "#fff", padding: "0 12px", fontSize: 9, color: "#aaa", fontFamily: "Arial, sans-serif", letterSpacing: "2px", textTransform: "uppercase" }}>
              Page 2
            </span>
          </div>

          {/* Page 2 — Executive Summary */}
          <div style={{ padding: "48px 72px" }}>
            <div style={{ fontSize: 10, color: "#aaa", fontFamily: "Arial, sans-serif", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 4 }}>
              Section 1
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, paddingBottom: 8, borderBottom: "1px solid #ddd" }}>
              Executive Summary
            </h2>
            <p style={{ fontSize: 13, lineHeight: 1.9, marginBottom: 16, textAlign: "justify" }}>
              Maple Facility Services Inc. is pleased to submit this proposal for Janitorial and Facility Cleaning Services at RCMP Detachments across Saskatchewan (Solicitation No. EP732-242817). With extensive experience maintaining federal law enforcement facilities, we are well-positioned to deliver consistent, high-quality cleaning services that meet the security and operational requirements of active RCMP detachments.
            </p>
            <p style={{ fontSize: 13, lineHeight: 1.9, marginBottom: 16, textAlign: "justify" }}>
              Maple Facility Services Inc. has provided commercial janitorial and facility cleaning services across Saskatchewan for over 8 years. Our portfolio includes cleaning and maintaining secured government facilities, including multiple RCMP detachments in Regina, Saskatoon, and rural communities across the province.
            </p>
            <p style={{ fontSize: 13, lineHeight: 1.9, marginBottom: 16, textAlign: "justify" }}>
              We maintain WSIB equivalent certification, bonding up to $500,000, and carry $2,000,000 in commercial liability insurance. Our team is trained in RCMP-specific security protocols and holds valid RCMP security clearances for facility access. Key differentiators include our 24/7 on-call capability for emergency cleaning, dedicated site supervisors at major detachments, and a proprietary quality assurance inspection system.
            </p>

            <div style={{ fontSize: 10, color: "#aaa", fontFamily: "Arial, sans-serif", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 4, marginTop: 36 }}>
              Section 2
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, paddingBottom: 8, borderBottom: "1px solid #ddd" }}>
              Technical Approach
            </h2>
            <p style={{ fontSize: 13, lineHeight: 1.9, marginBottom: 12, textAlign: "justify" }}>
              Our service delivery methodology is designed specifically for secured law enforcement environments. All staff undergo RCMP security screening and are trained on evidence-handling protocols, restricted-area procedures, and chain-of-custody awareness for cleaning operations near sensitive materials.
            </p>

            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, marginTop: 20 }}>
              2.1 Daily Cleaning Services
            </h3>
            <ul style={{ fontSize: 13, lineHeight: 1.9, paddingLeft: 24, marginBottom: 16 }}>
              <li style={{ marginBottom: 4 }}>Office areas, reception, and public-facing spaces — vacuum, dust, sanitize</li>
              <li style={{ marginBottom: 4 }}>Interview rooms and holding cells — hospital-grade disinfection protocols</li>
              <li style={{ marginBottom: 4 }}>Washrooms — full sanitization, supply restocking</li>
              <li style={{ marginBottom: 4 }}>Kitchen and break areas — appliance cleaning, waste removal</li>
              <li style={{ marginBottom: 4 }}>Entrance and lobby — floor care, glass cleaning, mat service</li>
            </ul>

            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, marginTop: 20 }}>
              2.2 Periodic Deep Cleaning (Quarterly)
            </h3>
            <ul style={{ fontSize: 13, lineHeight: 1.9, paddingLeft: 24, marginBottom: 16 }}>
              <li style={{ marginBottom: 4 }}>HVAC vent and duct cleaning</li>
              <li style={{ marginBottom: 4 }}>Floor stripping, sealing, and waxing</li>
              <li style={{ marginBottom: 4 }}>Window cleaning (interior and exterior)</li>
              <li style={{ marginBottom: 4 }}>Upholstery and carpet deep extraction</li>
              <li style={{ marginBottom: 4 }}>Light fixture cleaning and high-surface dusting</li>
            </ul>
          </div>

          {/* Page break */}
          <div style={{ borderTop: "2px dashed #d1d5db", margin: "0 48px", position: "relative" }}>
            <span style={{ position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)", background: "#fff", padding: "0 12px", fontSize: 9, color: "#aaa", fontFamily: "Arial, sans-serif", letterSpacing: "2px", textTransform: "uppercase" }}>
              Page 3
            </span>
          </div>

          {/* Page 3 — Team, Pricing */}
          <div style={{ padding: "48px 72px" }}>
            <div style={{ fontSize: 10, color: "#aaa", fontFamily: "Arial, sans-serif", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 4 }}>
              Section 3
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, paddingBottom: 8, borderBottom: "1px solid #ddd" }}>
              Team &amp; Experience
            </h2>
            <p style={{ fontSize: 13, lineHeight: 1.9, marginBottom: 16, textAlign: "justify" }}>
              Maple Facility Services Inc. employs a dedicated team of 24 cleaning professionals across Saskatchewan, each holding valid RCMP security clearances. Our organizational structure ensures responsive, accountable service delivery:
            </p>
            <ul style={{ fontSize: 13, lineHeight: 1.9, paddingLeft: 24, marginBottom: 16 }}>
              <li style={{ marginBottom: 4 }}><strong>Operations Manager</strong> — Overall contract oversight, client liaison, quality assurance</li>
              <li style={{ marginBottom: 4 }}><strong>Site Supervisors (2)</strong> — Regina and Saskatoon hubs, daily scheduling and inspection</li>
              <li style={{ marginBottom: 4 }}><strong>Lead Cleaners (4)</strong> — Team leads at major detachments, training responsibility</li>
              <li style={{ marginBottom: 4 }}><strong>Cleaning Technicians (18)</strong> — Frontline service delivery, security-cleared staff</li>
            </ul>

            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, marginTop: 20 }}>
              3.1 Relevant Experience
            </h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 24 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #1a1a1a" }}>
                  <th style={{ textAlign: "left", padding: "8px 12px", fontFamily: "Arial, sans-serif", fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", color: "#666" }}>Client</th>
                  <th style={{ textAlign: "left", padding: "8px 12px", fontFamily: "Arial, sans-serif", fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", color: "#666" }}>Scope</th>
                  <th style={{ textAlign: "left", padding: "8px 12px", fontFamily: "Arial, sans-serif", fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", color: "#666" }}>Value</th>
                  <th style={{ textAlign: "left", padding: "8px 12px", fontFamily: "Arial, sans-serif", fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", color: "#666" }}>Period</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["RCMP 'F' Division", "4 Detachments, Regina", "$380K/yr", "2022–Present"],
                  ["Service Canada", "3 Offices, Saskatoon", "$210K/yr", "2021–Present"],
                  ["SK Ministry of Highways", "2 Regional Offices", "$145K/yr", "2020–2024"],
                  ["City of Regina", "Municipal Buildings (5)", "$290K/yr", "2019–2023"],
                ].map(([client, scope, value, period], i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "8px 12px", fontSize: 12 }}>{client}</td>
                    <td style={{ padding: "8px 12px", fontSize: 12 }}>{scope}</td>
                    <td style={{ padding: "8px 12px", fontSize: 12, fontFamily: "Arial, sans-serif" }}>{value}</td>
                    <td style={{ padding: "8px 12px", fontSize: 12 }}>{period}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ fontSize: 10, color: "#aaa", fontFamily: "Arial, sans-serif", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 4, marginTop: 36 }}>
              Section 4
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, paddingBottom: 8, borderBottom: "1px solid #ddd" }}>
              Pricing Schedule
            </h2>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 8 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #1a1a1a" }}>
                  <th style={{ textAlign: "left", padding: "8px 12px", fontFamily: "Arial, sans-serif", fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", color: "#666" }}>Description</th>
                  <th style={{ textAlign: "right", padding: "8px 12px", fontFamily: "Arial, sans-serif", fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", color: "#666" }}>Monthly</th>
                </tr>
              </thead>
              <tbody>
                {PDF_PRICING.map((item, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "8px 12px", fontSize: 12 }}>{item.desc}</td>
                    <td style={{ padding: "8px 12px", fontSize: 12, textAlign: "right", fontFamily: "Arial, sans-serif" }}>
                      ${item.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: "1px solid #ccc" }}>
                  <td style={{ padding: "8px 12px", fontSize: 12, color: "#666" }}>Monthly Subtotal</td>
                  <td style={{ padding: "8px 12px", fontSize: 12, textAlign: "right", fontFamily: "Arial, sans-serif" }}>
                    ${PDF_MONTHLY_TOTAL.toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 12px", fontSize: 12, fontWeight: 700 }}>Annual Total (12 months)</td>
                  <td style={{ padding: "8px 12px", fontSize: 12, textAlign: "right", fontFamily: "Arial, sans-serif", fontWeight: 700 }}>
                    ${PDF_ANNUAL_TOTAL.toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 12px", fontSize: 12, color: "#666" }}>GST (5%)</td>
                  <td style={{ padding: "8px 12px", fontSize: 12, textAlign: "right", fontFamily: "Arial, sans-serif" }}>
                    ${PDF_GST.toLocaleString()}
                  </td>
                </tr>
                <tr style={{ borderTop: "2px solid #1a1a1a" }}>
                  <td style={{ padding: "10px 12px", fontSize: 14, fontWeight: 700 }}>Grand Total (incl. GST)</td>
                  <td style={{ padding: "10px 12px", fontSize: 14, textAlign: "right", fontFamily: "Arial, sans-serif", fontWeight: 700 }}>
                    ${PDF_GRAND_TOTAL.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>

            <p style={{ fontSize: 10, color: "#999", fontFamily: "Arial, sans-serif", marginTop: 12, lineHeight: 1.6 }}>
              Note: Saskatchewan is a GST-only province (5%). Prices are firm for the initial 12-month contract period.
              Renewal pricing may be subject to CPI adjustment as outlined in the contract terms.
            </p>
          </div>

          {/* Page break */}
          <div style={{ borderTop: "2px dashed #d1d5db", margin: "0 48px", position: "relative" }}>
            <span style={{ position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)", background: "#fff", padding: "0 12px", fontSize: 9, color: "#aaa", fontFamily: "Arial, sans-serif", letterSpacing: "2px", textTransform: "uppercase" }}>
              Page 4
            </span>
          </div>

          {/* Page 4 — Safety, Certifications */}
          <div style={{ padding: "48px 72px 72px" }}>
            <div style={{ fontSize: 10, color: "#aaa", fontFamily: "Arial, sans-serif", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 4 }}>
              Section 5
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, paddingBottom: 8, borderBottom: "1px solid #ddd" }}>
              Safety Plan &amp; Compliance
            </h2>
            <p style={{ fontSize: 13, lineHeight: 1.9, marginBottom: 16, textAlign: "justify" }}>
              Maple Facility Services Inc. maintains a comprehensive Occupational Health and Safety program compliant with Saskatchewan Employment Act requirements. All employees receive initial safety orientation and ongoing annual training.
            </p>
            <ul style={{ fontSize: 13, lineHeight: 1.9, paddingLeft: 24, marginBottom: 24 }}>
              <li style={{ marginBottom: 4 }}>WHMIS 2015 certification for all cleaning staff</li>
              <li style={{ marginBottom: 4 }}>RCMP security clearance protocols and restricted-area procedures</li>
              <li style={{ marginBottom: 4 }}>Bloodborne pathogen and biohazard handling training</li>
              <li style={{ marginBottom: 4 }}>Slip, trip, and fall prevention — wet floor signage, proper footwear</li>
              <li style={{ marginBottom: 4 }}>Chemical safety — SDS binder maintained at each site</li>
              <li style={{ marginBottom: 4 }}>Incident reporting within 24 hours to site supervisor and contract authority</li>
            </ul>

            <div style={{ fontSize: 10, color: "#aaa", fontFamily: "Arial, sans-serif", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 4, marginTop: 36 }}>
              Section 6
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, paddingBottom: 8, borderBottom: "1px solid #ddd" }}>
              Certifications &amp; Attestations
            </h2>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 24 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #1a1a1a" }}>
                  <th style={{ textAlign: "left", padding: "8px 12px", fontFamily: "Arial, sans-serif", fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", color: "#666" }}>Document</th>
                  <th style={{ textAlign: "left", padding: "8px 12px", fontFamily: "Arial, sans-serif", fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", color: "#666" }}>Status</th>
                  <th style={{ textAlign: "left", padding: "8px 12px", fontFamily: "Arial, sans-serif", fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", color: "#666" }}>Expiry</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Commercial Liability Insurance ($2M)", "Active", "Dec 2026"],
                  ["Surety Bond ($500K)", "Active", "Oct 2026"],
                  ["WSIB Equivalent Clearance", "Active", "Ongoing"],
                  ["RCMP Security Clearance (Staff)", "Active", "Ongoing"],
                  ["Saskatchewan Business Registration", "Active", "Ongoing"],
                  ["WHMIS 2015 Training (All Staff)", "Current", "Annual"],
                ].map(([doc, status, expiry], i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "8px 12px", fontSize: 12 }}>{doc}</td>
                    <td style={{ padding: "8px 12px", fontSize: 12, color: "#16a34a" }}>{status}</td>
                    <td style={{ padding: "8px 12px", fontSize: 12 }}>{expiry}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Signature block */}
            <div style={{ marginTop: 48, borderTop: "1px solid #ddd", paddingTop: 24 }}>
              <div style={{ fontSize: 10, color: "#aaa", fontFamily: "Arial, sans-serif", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 16 }}>
                Authorization
              </div>
              <div style={{ display: "flex", gap: 48 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ borderBottom: "1px solid #1a1a1a", height: 40, marginBottom: 4 }} />
                  <div style={{ fontSize: 11, color: "#666", fontFamily: "Arial, sans-serif" }}>Authorized Signature</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ borderBottom: "1px solid #1a1a1a", height: 40, marginBottom: 4 }} />
                  <div style={{ fontSize: 11, color: "#666", fontFamily: "Arial, sans-serif" }}>Print Name &amp; Title</div>
                </div>
                <div style={{ width: 160 }}>
                  <div style={{ borderBottom: "1px solid #1a1a1a", height: 40, marginBottom: 4 }} />
                  <div style={{ fontSize: 11, color: "#666", fontFamily: "Arial, sans-serif" }}>Date</div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ marginTop: 36, textAlign: "center", fontSize: 9, color: "#bbb", fontFamily: "Arial, sans-serif" }}>
              Maple Facility Services Inc. — Confidential Bid Proposal — EP732-242817
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WriterView({ agent }: WriterViewProps) {
  const { sendMessage } = useChat("writer");
  const [activeSection, setActiveSection] = useState<SectionId>("exec_summary");
  const content = MOCK_CONTENT[activeSection];
  const sectionConfig = SECTIONS.find((s) => s.id === activeSection)!;

  const subtotal = content?.pricing?.items.reduce((a, i) => a + i.amount, 0) || 0;
  const gstRate = 0.05; // Saskatchewan GST
  const gst = Math.round(subtotal * gstRate);
  const total = subtotal + gst;

  const isPreview = activeSection === "preview";

  return (
    <div className="flex flex-1 overflow-hidden h-full">
      {/* Section Tabs */}
      <div
        className="w-[200px] border-r flex flex-col flex-shrink-0 overflow-y-auto"
        style={{ background: "var(--sidebar-bg)", borderColor: "var(--bidly-border)" }}
      >
        {(["sections", "forms", "export"] as const).map((group) => {
          const groupSections = SECTIONS.filter((s) => s.group === group);
          const groupLabels: Record<string, string> = { sections: "Bid Sections", forms: "Forms & Pricing", export: "Export" };

          return (
            <div key={group}>
              <div
                className="px-5 pt-5 pb-2 text-[10px] font-medium tracking-[2px] uppercase"
                style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
              >
                {groupLabels[group]}
              </div>
              {groupSections.map((section) => {
                const isActive = section.id === activeSection;
                const statusStyle = STATUS_ICONS[section.status];

                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className="w-full text-left px-5 py-2.5 flex items-center gap-2.5 text-[12px] transition-colors"
                    style={{
                      fontFamily: "var(--font-mono)",
                      background: isActive ? "var(--white)" : "transparent",
                      color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                      fontWeight: isActive ? 600 : 400,
                      cursor: "pointer",
                      borderLeft: isActive ? "3px solid var(--agent-writer)" : "3px solid transparent",
                    }}
                  >
                    <span className="text-[11px]" style={{ color: statusStyle.color }}>{statusStyle.icon}</span>
                    {section.label}
                  </button>
                );
              })}
              {group !== "export" && (
                <div className="mx-5 my-3 border-b" style={{ borderColor: "var(--bidly-border)" }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Editor / Preview Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {isPreview ? (
          /* PDF-style preview */
          <BidPreview />
        ) : (
          <>
            {/* Toolbar */}
            <div
              className="px-8 py-4 flex items-center justify-between border-b flex-shrink-0"
              style={{ background: "var(--white)", borderColor: "var(--bidly-border)" }}
            >
              <div
                className="text-[14px] font-semibold"
                style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}
              >
                {sectionConfig.label}
              </div>
              <div className="flex gap-2">
                <button
                  className="px-4 py-2 text-[10px] tracking-[1px] uppercase border"
                  style={{
                    fontFamily: "var(--font-mono)",
                    borderColor: "var(--agent-writer)",
                    background: "var(--white)",
                    color: "var(--agent-writer)",
                    cursor: "pointer",
                  }}
                >
                  Regenerate
                </button>
                <button
                  className="px-4 py-2 text-[10px] tracking-[1px] uppercase border"
                  style={{
                    fontFamily: "var(--font-mono)",
                    borderColor: "var(--bidly-border)",
                    background: "var(--white)",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  Copy
                </button>
                <button
                  className="px-4 py-2 text-[10px] tracking-[1px] uppercase"
                  style={{
                    fontFamily: "var(--font-mono)",
                    background: "var(--text-primary)",
                    color: "var(--white)",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Save Draft
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
              {content?.blocks.map((block, i) => (
                <div key={i} className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-[10px] font-medium tracking-[1.5px] uppercase"
                      style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
                    >
                      {block.label}
                    </span>
                    <span
                      className="text-[8px] tracking-[1px] uppercase px-2 py-0.5"
                      style={{
                        fontFamily: "var(--font-mono)",
                        background: "#f0ecff",
                        color: "var(--agent-writer)",
                      }}
                    >
                      AI Draft
                    </span>
                  </div>
                  <div
                    className="border p-5 text-[14px] leading-relaxed whitespace-pre-wrap"
                    style={{
                      background: "var(--white)",
                      borderColor: "var(--bidly-border)",
                      color: "var(--text-primary)",
                      minHeight: 80,
                    }}
                  >
                    {block.content}
                  </div>
                  {block.suggestion && (
                    <div
                      className="mt-2 border-l-2 pl-4 py-2"
                      style={{ borderColor: "var(--agent-writer)" }}
                    >
                      <div
                        className="text-[9px] tracking-[1.5px] uppercase mb-1"
                        style={{ fontFamily: "var(--font-mono)", color: "var(--agent-writer)" }}
                      >
                        Writer Suggestion
                      </div>
                      <div className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                        {block.suggestion}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Pricing Table */}
              {content?.pricing && (
                <div className="mt-4">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th
                          className="text-left px-4 py-2.5 border-b-2"
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 10,
                            letterSpacing: "1.5px",
                            textTransform: "uppercase",
                            color: "var(--text-muted)",
                            borderColor: "var(--bidly-border)",
                          }}
                        >
                          Item
                        </th>
                        <th
                          className="text-right px-4 py-2.5 border-b-2"
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 10,
                            letterSpacing: "1.5px",
                            textTransform: "uppercase",
                            color: "var(--text-muted)",
                            borderColor: "var(--bidly-border)",
                          }}
                        >
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {content.pricing.items.map((item, i) => (
                        <tr key={i}>
                          <td
                            className="px-4 py-2.5 text-[13px] border-b"
                            style={{ color: "var(--text-primary)", borderColor: "var(--border-light)" }}
                          >
                            {item.desc}
                          </td>
                          <td
                            className="px-4 py-2.5 text-right text-[13px] border-b"
                            style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)", borderColor: "var(--border-light)" }}
                          >
                            ${item.amount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td className="px-4 py-2.5 text-[13px]" style={{ color: "var(--text-muted)" }}>Subtotal</td>
                        <td className="px-4 py-2.5 text-right text-[13px]" style={{ fontFamily: "var(--font-mono)" }}>
                          ${subtotal.toLocaleString()}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 text-[13px]" style={{ color: "var(--text-muted)" }}>GST (5%)</td>
                        <td className="px-4 py-2.5 text-right text-[13px]" style={{ fontFamily: "var(--font-mono)" }}>
                          ${gst.toLocaleString()}
                        </td>
                      </tr>
                      <tr>
                        <td
                          className="px-4 py-2.5 text-[14px] font-semibold border-t-2"
                          style={{ color: "var(--text-primary)", borderColor: "var(--bidly-border)" }}
                        >
                          Total
                        </td>
                        <td
                          className="px-4 py-2.5 text-right text-[14px] font-semibold border-t-2"
                          style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)", borderColor: "var(--bidly-border)" }}
                        >
                          ${total.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Empty state */}
              {!content && (
                <div className="text-center py-16">
                  <div
                    className="text-[12px] tracking-[2px] uppercase mb-2"
                    style={{ fontFamily: "var(--font-mono)", color: "var(--text-hint)" }}
                  >
                    No content yet
                  </div>
                  <div className="text-[14px]" style={{ color: "var(--text-muted)" }}>
                    Click &ldquo;Regenerate&rdquo; to have the Writer agent draft this section
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="flex-shrink-0">
              <ChatInput agentId="writer" onSend={sendMessage} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
