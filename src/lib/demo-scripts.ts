import type { AgentId } from "./types";

export type DemoEntry = string | { action: "switch-to-preview" };

export const DEMO_SCRIPTS: Record<AgentId, DemoEntry[]> = {
  profile: [
    "Our company is Northpoint Digital Solutions.",
    "Ontario",
    "We provide IT consulting, systems integration, cybersecurity, cloud infrastructure, software maintenance, helpdesk support, data analytics, IT audit, change management, training delivery, and project management for the federal government.",
    "Yes, those NAICS codes look correct.",
    "We've been in business for 12 years. Our typical project size ranges from $50,000 for smaller consulting engagements up to $2,000,000 for large systems integration projects.",
    "We have WSIB coverage in good standing, a bonding limit of $1,000,000, and professional liability insurance of $5,000,000. We also hold ISO 27001 certification for information security management, and several of our team members have Secret-level Government of Canada security clearances.",
    "Yes, we've completed several government contracts. We did a software maintenance and support project for Shared Services Canada worth about $800,000, an information technology audit for the Canada Revenue Agency, and we currently have a standing offer for professional services and temporary help with Public Services and Procurement Canada. We've been on the ProServices supply arrangement for the past 4 years.",
    "Yes, that looks accurate. Please save the profile.",
  ],
  scout: [
  ],
  analyst: [
    "Please analyze this tender for us. We want to understand the full scope, key deadlines, mandatory requirements, evaluation criteria, and any risks we should be aware of given our company profile.",
  ],
  compliance: [
    "Yes, we are 100% Canadian-owned and operated.",
    "Yes, our Procurement Business Number is 12345-67890.",
    "Our professional liability insurance is $5,000,000, and we also carry $2,000,000 in commercial general liability.",
    "Our bonding limit is $1,000,000.",
    "We have several team members with Secret-level Government of Canada security clearances, and our facility has a Designated Organization Screening clearance.",
    "We hold ISO 27001 certification, WSIB coverage in good standing, and we're registered on the ProServices supply arrangement.",
    "Yes, we are an existing SA Holder under the TBIPS Supply Arrangement EN578-170432, and we're also registered on the ProServices Supply Arrangement.",
    "We don't plan to subcontract for this project. Our in-house team can handle all aspects.",
    "Yes, that summary is accurate. Please run the assessment.",
  ],
  writer: [
    "Draft the Executive Summary. Emphasize our 12 years of experience with federal IT projects and our current ProServices standing offer.",
    "That's good. Now draft the Technical Approach. We plan to use an Agile methodology with 2-week sprints, and we'll leverage our existing Azure Government cloud infrastructure.",
    "Looks solid. Now draft Team & Experience and Project Management. Our lead PM is William Chong with 15 years of GC project experience and PMP certification. We'll use a dedicated team of 6 — 2 senior developers, 2 intermediate, 1 QA lead, and William as PM.",
    "Great. Now draft the Safety Plan and Pricing Schedule. For pricing, our blended rate is $165/hour, estimate 2,400 hours over 12 months. Include a 10% contingency line item.",
    "Awesome. Now let's draft the Form Guidance.",
    { action: "switch-to-preview" },
  ],
};
