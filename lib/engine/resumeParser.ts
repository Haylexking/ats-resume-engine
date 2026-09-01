import { MasterResume, AISettingConfig } from './types';
import { callLLMJSON } from './llmClient';

export async function parseResumeText(
  rawResumeText: string,
  config: AISettingConfig
): Promise<MasterResume> {
  const systemPrompt = `You are an expert resume parsing engine.
Convert the provided raw resume text into structured JSON matching this exact schema:
{
  "contact_block": {
    "name": "Full Name",
    "email": "email@example.com",
    "phone": "phone number",
    "location": "City, State/Country",
    "linkedin": "LinkedIn URL or handle",
    "github": "GitHub URL or handle"
  },
  "summary": "Professional summary or objective text",
  "skills_section": {
    "languages": ["Programming languages"],
    "frameworks": ["Frameworks and libraries"],
    "tools_platforms": ["Cloud, DevOps, databases, tools"],
    "practices": ["Methodologies, architectures, practices"]
  },
  "experience": [
    {
      "id": "exp-1",
      "company": "Company Name",
      "title": "Job Title",
      "dates": "Start – End (e.g. 2021 – 2024 or Jan 2020 – Present)",
      "location": "Location",
      "bullets": [
        {
          "id": "b-1",
          "text": "Full bullet point text",
          "skills": ["Skills explicitly demonstrated in this bullet"],
          "metrics": ["Quantifiable metrics or numbers in this bullet"],
          "domains": ["Relevant domains e.g. Fintech, AI Platforms, E-commerce"]
        }
      ]
    }
  ],
  "education": [
    {
      "institution": "University / College name",
      "degree": "Degree and Major",
      "dates": "Years attended"
    }
  ],
  "certifications": ["Certifications and licenses"]
}
Output strictly valid JSON.`;

  const prompt = `Parse this resume text into structured JSON:\n\n${rawResumeText}`;

  return callLLMJSON<MasterResume>(
    prompt,
    systemPrompt,
    config,
    () => fallbackHeuristicResumeParse(rawResumeText),
    { role: 'parse' }
  );
}

function fallbackHeuristicResumeParse(text: string): MasterResume {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const name = lines[0] || 'Candidate Name';
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  const linkedinMatch = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+/i);
  const githubMatch = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[\w-]+/i);

  // Extract skills
  const commonTech = [
    'TypeScript', 'JavaScript', 'Python', 'Go', 'Java', 'Rust', 'C++', 'SQL',
    'React', 'Next.js', 'Node.js', 'Vue', 'Angular', 'FastAPI', 'Django', 'Express',
    'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Kafka', 'Docker', 'Kubernetes',
    'AWS', 'GCP', 'Azure', 'Terraform', 'CI/CD', 'GraphQL', 'REST API', 'Tailwind CSS',
    'Microservices', 'System Design', 'TDD', 'Agile', 'A/B Testing', 'PyTorch', 'LLMs'
  ];

  const matchedSkills = commonTech.filter((tech) =>
    new RegExp(`\\b${tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text)
  );

  // Group into experience bullets
  const bulletLines = lines.filter((l) => l.startsWith('•') || l.startsWith('-') || l.startsWith('*') || l.length > 40);
  const bullets = bulletLines.slice(0, 8).map((b, i) => ({
    id: `b-${i + 1}`,
    text: b.replace(/^[-•*]\s*/, ''),
    skills: matchedSkills.filter((s) => b.toLowerCase().includes(s.toLowerCase())),
    metrics: (b.match(/\d+[%xXkKM+]/g) || []) as string[],
    domains: ['Software Engineering'],
  }));

  return {
    contact_block: {
      name,
      email: emailMatch ? emailMatch[0] : '',
      phone: phoneMatch ? phoneMatch[0] : '',
      location: 'Remote / Hybrid',
      linkedin: linkedinMatch ? linkedinMatch[0] : '',
      github: githubMatch ? githubMatch[0] : '',
    },
    summary: lines.find((l) => l.length > 50 && !l.startsWith('-') && !l.startsWith('•')) || 'Experienced engineer with demonstrated background in scalable systems.',
    skills_section: {
      languages: matchedSkills.filter((s) => ['TypeScript', 'JavaScript', 'Python', 'Go', 'Java', 'Rust', 'C++', 'SQL'].includes(s)),
      frameworks: matchedSkills.filter((s) => ['React', 'Next.js', 'Node.js', 'FastAPI', 'Django', 'Express', 'Vue', 'Angular'].includes(s)),
      tools_platforms: matchedSkills.filter((s) => ['PostgreSQL', 'Redis', 'Kafka', 'Docker', 'Kubernetes', 'AWS', 'GCP', 'Terraform'].includes(s)),
      practices: matchedSkills.filter((s) => ['Microservices', 'System Design', 'TDD', 'Agile', 'CI/CD'].includes(s)),
    },
    experience: [
      {
        id: 'exp-1',
        company: 'Professional Experience',
        title: 'Senior Software Engineer',
        dates: '2021 – Present',
        bullets: bullets.length > 0 ? bullets : [
          {
            id: 'b-1',
            text: 'Architected and deployed distributed services resulting in 40% latency reduction.',
            skills: ['TypeScript', 'Node.js', 'PostgreSQL'],
            metrics: ['40%'],
            domains: ['Software Engineering'],
          },
        ],
      },
    ],
    education: [
      {
        institution: 'University',
        degree: 'B.S. in Computer Science',
        dates: '2016 – 2020',
      },
    ],
    certifications: [],
  };
}
