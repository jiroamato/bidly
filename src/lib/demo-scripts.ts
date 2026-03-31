import type { AgentId } from "./types";

export const DEMO_SCRIPTS: Record<AgentId, string[]> = {
  profile: [
    "Our company is Northpoint Digital Solutions.",
    "We specialize in professional services for the Government of Canada. Our core capabilities include software maintenance and support, IT systems management and helpdesk support, data processing and analytics, information technology audit services, change management consulting, training and professional development delivery, equipment supply and maintenance, and construction project management. We also provide temporary help services, supply arrangement management, and system replacement project support.",
    "Yes, those NAICS codes look correct.",
    "We've been in business for 12 years. Our typical project size ranges from $50,000 for smaller consulting engagements up to $2,000,000 for large systems integration projects.",
    "We have WSIB coverage in good standing, a bonding limit of $1,000,000, and professional liability insurance of $5,000,000. We also hold ISO 27001 certification for information security management, and several of our team members have Secret-level Government of Canada security clearances.",
    "Yes, we've completed several government contracts. We did a software maintenance and support project for Shared Services Canada worth about $800,000, an information technology audit for the Canada Revenue Agency, and we currently have a standing offer for professional services and temporary help with Public Services and Procurement Canada. We've been on the ProServices supply arrangement for the past 4 years.",
    "Yes, that looks accurate. Please save the profile.",
  ],
  scout: [
    "Find us tenders that match our IT consulting and systems integration capabilities, especially anything related to cybersecurity, cloud infrastructure, or IT audit services in the NCR or Ontario region.",
    "That looks like a great fit for us. Let's go with that one.",
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
    "Yes, we are an existing SA Holder under the Government of Canada SaaS Supply Arrangement EN578-191593, and we're also registered on the ProServices Supply Arrangement.",
    "We don't plan to subcontract for this project. Our in-house team can handle all aspects.",
    "Yes, that summary is accurate. Please run the assessment.",
  ],
  writer: [
    "Please draft the bid proposal. Start with the Executive Summary and Technical Approach sections.",
  ],
};
