import { MasterResume } from '../engine/types';

export const INITIAL_MASTER_RESUME: MasterResume = {
  contact_block: {
    name: 'Alexander Akerele',
    email: 'alexakerele24@gmail.com',
    phone: '+234 906 066 5762',
    location: 'Lagos, Nigeria',
    linkedin: 'linkedin.com/in/alexander-akerele-663612141',
    github: 'linktr.ee/thebiochemist_ux',
  },
  summary:
    'Product Designer with 5+ years shipping end-to-end digital products across fintech, HealthTech, GovTech, Web3, and AI platforms. Proven track record of measurable outcomes: 35% order volume growth at Kukeat, 40% engagement lift, and a 20% improvement in government portal accessibility. Proficient in Figma, design systems, and cross-functional delivery.',
  skills_section: {
    languages: ['HTML5', 'CSS3', 'JavaScript basics'],
    frameworks: ['Tailwind CSS', 'React UI components'],
    tools_platforms: ['Figma', 'FigJam', 'Adobe XD', 'Sketch', 'Miro', 'Notion', 'Jira', 'Linear'],
    practices: [
      'UI/UX Design',
      'Product Design',
      'Design Systems',
      'Wireframing',
      'Interactive Prototyping',
      'User Research',
      'Usability Testing',
      'Information Architecture',
      'Journey Mapping',
      'User Flows',
      'WCAG Accessibility',
      'A/B Testing',
      'Design Strategy',
      'Cross-functional Delivery',
    ],
  },
  experience: [
    {
      id: 'exp-1',
      company: 'NexaPay',
      title: 'Lead Product Designer',
      dates: 'Jul 2024 – Present',
      location: 'Lagos, Nigeria (Remote)',
      bullets: [
        {
          id: 'b-101',
          text: 'Spearheaded end-to-end product design across NexaPay fintech ecosystem, including a live mobile app, merchant dashboard, and website redesign, improving transaction flow completion across 3 core user touchpoints.',
          skills: ['UI/UX Design', 'Fintech', 'Mobile App Design', 'Dashboard Design', 'User Flows'],
          metrics: ['3 core user touchpoints'],
          domains: ['Fintech'],
        },
        {
          id: 'b-102',
          text: 'Shipped the mobile app and merchant dashboard from wireframe through prototype validation, enforcing a Figma component library that reduced engineering rework and accelerated feature delivery.',
          skills: ['Figma', 'Wireframing', 'Prototyping', 'Design Systems', 'Component Library'],
          metrics: [],
          domains: ['Fintech'],
        },
        {
          id: 'b-103',
          text: 'Designed an intuitive KYC and onboarding flow in compliance with regional financial regulations, reducing customer drop-off during account verification.',
          skills: ['User Onboarding', 'KYC', 'Compliance-aware design', 'Usability Testing'],
          metrics: [],
          domains: ['Fintech'],
        },
      ],
    },
    {
      id: 'exp-2',
      company: 'Kukeat',
      title: 'Product Designer',
      dates: 'Nov 2023 – Jun 2024',
      location: 'Lagos, Nigeria',
      bullets: [
        {
          id: 'b-201',
          text: 'Transformed Kukeat from WhatsApp-only ordering to a full e-commerce platform, driving a 35% increase in order volume, 40% lift in user engagement, and a 20% improvement in customer loyalty.',
          skills: ['E-commerce', 'Product Strategy', 'UI/UX Design', 'E-commerce Marketplace'],
          metrics: ['35% order volume growth', '40% engagement lift', '20% customer loyalty'],
          domains: ['E-commerce'],
        },
        {
          id: 'b-202',
          text: 'Executed user research, MVP scoping, and checkout flow redesign alongside the Product Manager, delivering a prioritised backlog on schedule.',
          skills: ['User Research', 'MVP Scoping', 'Checkout Flows', 'Product Strategy'],
          metrics: [],
          domains: ['E-commerce'],
        },
      ],
    },
    {
      id: 'exp-3',
      company: 'Onamini',
      title: 'Lead Product Designer',
      dates: 'Dec 2023 – Apr 2024',
      location: 'Lagos, Nigeria (Remote)',
      bullets: [
        {
          id: 'b-301',
          text: 'Owned all product design across four user roles (Talents, Companies, Admins, Onboarding Managers), delivering journey maps, gig lifecycle and escrow state machines, and a complete developer-ready design system.',
          skills: ['Design Systems', 'State Machines', 'Marketplace Design', 'Journey Mapping', 'User Roles'],
          metrics: ['4 user roles'],
          domains: ['Web3', 'E-commerce'],
        },
      ],
    },
    {
      id: 'exp-4',
      company: 'Alma-Pario / Risigner Academy',
      title: 'Product Design Lead & Lead Instructor',
      dates: 'Sep 2022 – Oct 2023',
      location: 'Lagos, Nigeria',
      bullets: [
        {
          id: 'b-401',
          text: 'Mentored and trained 100+ aspiring designers in Figma, design systems, and design thinking, authoring a comprehensive 12-week UI/UX curriculum with practical portfolio deliverables.',
          skills: ['Figma', 'Design Systems', 'Mentorship', 'Curriculum Design', 'UI/UX Design'],
          metrics: ['100+ designers mentored', '12-week curriculum'],
          domains: ['EdTech'],
        },
      ],
    },
  ],
  education: [
    {
      institution: 'University of Ilorin',
      degree: 'Bachelor of Science (B.Sc.) in Biochemistry',
      dates: '2016 – 2021',
    },
  ],
  certifications: [
    'Certified ScrumMaster (CSM) — Scrum Alliance (In-progress)',
    'Enterprise Design Thinking Practitioner — IBM',
    'Google UX Design Professional Certificate — Coursera',
  ],
};
