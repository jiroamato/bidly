import type { AgentId } from "./types";

export const DEMO_SCRIPTS: Record<AgentId, string[]> = {
  profile: [
    "Our company is Northpoint Digital Solutions, and we're based in Ottawa, Ontario.",
    "We specialize in IT consulting and systems integration for enterprise environments. Our core services include cloud migration and infrastructure modernization, cybersecurity assessments and compliance auditing, custom software development using .NET, Java, and Python, network architecture design and implementation, and IT service management and helpdesk solutions. We also do data analytics and business intelligence reporting.",
    "Yes, those NAICS codes look correct.",
    "We've been in business for 12 years. Our typical project size ranges from $50,000 for smaller consulting engagements up to $2,000,000 for large systems integration projects.",
    "We have WSIB coverage in good standing, a bonding limit of $1,000,000, and professional liability insurance of $5,000,000. We also hold ISO 27001 certification for information security management, and several of our team members have Secret-level Government of Canada security clearances.",
    "Yes, we've completed several government contracts. We did a cloud migration project for Shared Services Canada worth about $800,000, a cybersecurity audit for the Canada Revenue Agency, and we currently have a standing offer for IT helpdesk support with Public Services and Procurement Canada. We've been on the ProServices supply arrangement for the past 4 years.",
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
    "We don't plan to subcontract for this project. Our in-house team can handle all aspects.",
    "Yes, that summary is accurate. Please run the assessment.",
  ],
  writer: [
    "Please draft the bid proposal. Start with the Executive Summary and Technical Approach sections.",
  ],
};
