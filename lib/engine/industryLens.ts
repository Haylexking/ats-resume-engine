import { IndustryLens, TargetIndustry, MasterResume, MasterExperience, MasterBullet } from './types';

export const INDUSTRY_LENSES: Record<TargetIndustry, IndustryLens> = {
  Fintech: {
    id: 'Fintech',
    name: 'Fintech & Financial Systems',
    description: 'Emphasizes transactional throughput, PCI compliance, low latency, fraud prevention, and auditability.',
    priority_skills: ['PCI-DSS', 'Payment Gateways', 'Low Latency', 'PostgreSQL', 'System Architecture', 'Security Compliance', 'Kafka'],
    vocabulary_register: {
      'user experience': 'frictionless merchant flow',
      'API design': 'PCI-compliant REST/GraphQL APIs',
      'data processing': 'high-throughput ledger processing',
      'performance': 'p99 sub-100ms transactional latency',
    },
  },
  EdTech: {
    id: 'EdTech',
    name: 'EdTech & Learning Platforms',
    description: 'Emphasizes learner engagement, content delivery, accessible UI, and progress tracking analytics.',
    priority_skills: ['React', 'TypeScript', 'Content Delivery', 'Accessibility', 'Analytics', 'Web Performance'],
    vocabulary_register: {
      'user experience': 'learner-centric engagement workflow',
      'analytics': 'student outcome tracking metrics',
      'API design': 'SCORM & LTI compatible APIs',
    },
  },
  GovTech: {
    id: 'GovTech',
    name: 'GovTech & Public Sector',
    description: 'Emphasizes security compliance (FedRAMP/NIST), high reliability, accessibility (Section 508), and audit trails.',
    priority_skills: ['Security Compliance', 'FedRAMP', 'Audit Trails', 'Section 508', 'PostgreSQL', 'Docker'],
    vocabulary_register: {
      'user experience': 'Section 508 compliant accessibility workflow',
      'security': 'FedRAMP-ready zero-trust security controls',
      'testing': 'automated compliance auditing',
    },
  },
  HealthTech: {
    id: 'HealthTech',
    name: 'HealthTech & BioInformatics',
    description: 'Emphasizes HIPAA compliance, EHR integrations (HL7/FHIR), data privacy, and clinical workflow reliability.',
    priority_skills: ['HIPAA', 'HL7/FHIR', 'Data Privacy', 'PostgreSQL', 'Security Compliance', 'Python'],
    vocabulary_register: {
      'security': 'HIPAA-compliant encrypted data pipeline',
      'user experience': 'clinical workflow interface',
      'data processing': 'FHIR health record synchronization',
    },
  },
  Web3: {
    id: 'Web3',
    name: 'Web3 & Decentralized Tech',
    description: 'Emphasizes blockchain RPC nodes, smart contract subgraphs, wallet integrations, and decentralized storage.',
    priority_skills: ['GraphQL', 'Web3', 'Ethers.js', 'TypeScript', 'React', 'Decentralized Architecture'],
    vocabulary_register: {
      'user experience': 'frictionless wallet onboarding flow',
      'database': 'decentralized GraphQL subgraphs',
      'security': 'smart contract security auditing',
    },
  },
  'AI Platforms': {
    id: 'AI Platforms',
    name: 'AI Platforms & MLOps',
    description: 'Emphasizes LLM orchestration, vector search (RAG), prompt engineering, model evaluation, and latency optimization.',
    priority_skills: ['LLMs', 'FastAPI', 'Python', 'Vector Search', 'RAG', 'TypeScript', 'Redis', 'PyTorch'],
    vocabulary_register: {
      'data processing': 'vector embedding & indexing pipeline',
      'API design': 'streaming LLM tool-calling endpoints',
      'performance': 'token latency & throughput optimization',
    },
  },
  'E-commerce': {
    id: 'E-commerce',
    name: 'E-commerce & Retail Tech',
    description: 'Emphasizes conversion rate optimization, catalog search, checkout funnel velocity, and inventory scaling.',
    priority_skills: ['React', 'Next.js', 'Tailwind CSS', 'A/B Testing', 'Web Performance', 'Microservices'],
    vocabulary_register: {
      'user experience': 'high-converting checkout funnel',
      'performance': 'Core Web Vitals & page load velocity',
      'analytics': 'A/B tested conversion analytics',
    },
  },
  TravelTech: {
    id: 'TravelTech',
    name: 'TravelTech & Hospitality',
    description: 'Emphasizes booking engine availability, dynamic pricing pipelines, inventory synchronization, and multi-currency scaling.',
    priority_skills: ['Kafka', 'System Architecture', 'Node.js', 'Microservices', 'API Integration', 'React'],
    vocabulary_register: {
      'data processing': 'real-time inventory synchronization engine',
      'API design': 'high-concurrency booking engine APIs',
      'performance': 'p95 search availability under peak load',
    },
  },
};

/**
 * Selects and reweights bullets from the master data layer through the chosen industry lens.
 * Adjusts vocabulary register to target industry without fabricating unevidenced experience.
 */
export function applyIndustryLens(master: MasterResume, industry: TargetIndustry): MasterResume {
  const lens = INDUSTRY_LENSES[industry] || INDUSTRY_LENSES['AI Platforms'];

  const lensedExperience: MasterExperience[] = master.experience.map((exp) => {
    // Sort and re-weight bullets based on industry relevance
    // FIX #8: Do NOT rewrite existing bullet text with vocabulary register.
    // Vocabulary register is metadata for summary/headline generation only.
    // Existing accomplishment bullets must remain factually accurate.
    const lensedBullets = exp.bullets
      .map((b) => {
        // Determine relevance score based on domain tag match and skill overlap
        const domainMatch = b.domains.includes(industry) ? 10 : 0;
        const skillMatch = b.skills.filter((s) => lens.priority_skills.includes(s)).length * 5;
        const priorityScore = domainMatch + skillMatch;

        return {
          ...b,
          // Preserve original text — never mutate factual accomplishments
          priorityScore,
        };
      })
      .sort((a, b) => b.priorityScore - a.priorityScore);

    return {
      ...exp,
      bullets: lensedBullets,
    };
  });

  return {
    ...master,
    experience: lensedExperience,
  };
}
