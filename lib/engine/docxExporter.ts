import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { MasterResume, TieredSuggestion } from './types';

function cleanBullet(text?: string): string {
  if (!text) return '';
  return text
    .replace(/^[-•*+–—\s]+/, '')
    .replace(/["'“”]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function isBulletMatch(originalBullet?: string, masterBulletText?: string): boolean {
  const cleanOrig = cleanBullet(originalBullet);
  const cleanMaster = cleanBullet(masterBulletText);
  if (!cleanOrig || !cleanMaster) return false;
  if (cleanOrig === cleanMaster) return true;
  if (cleanOrig.includes(cleanMaster) || cleanMaster.includes(cleanOrig)) return true;
  if (cleanOrig.slice(0, 30) === cleanMaster.slice(0, 30)) return true;

  const origWords = cleanOrig.split(' ').filter((w) => w.length > 3);
  const masterWords = new Set(cleanMaster.split(' ').filter((w) => w.length > 3));
  if (origWords.length > 0) {
    const matchedCount = origWords.filter((w) => masterWords.has(w)).length;
    if (matchedCount / origWords.length >= 0.45) return true;
  }
  return false;
}

export async function generateATSCompliantDocx(
  resume: MasterResume,
  acceptedSuggestions: TieredSuggestion[] = []
): Promise<Buffer> {
  const children: Paragraph[] = [];

  // 1. Header & Contact Block
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: resume.contact_block.name,
          bold: true,
          size: 32, // 16pt
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `${resume.contact_block.email} | ${resume.contact_block.phone} | ${resume.contact_block.location}`,
          size: 20, // 10pt
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `${resume.contact_block.linkedin} | ${resume.contact_block.github || ''}`.replace(/\s*\|\s*$/, ''),
          size: 20,
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({ text: '' })
  );

  // Helper for section headings
  const addSectionHeading = (title: string) => {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [
          new TextRun({
            text: title.toUpperCase(),
            bold: true,
            size: 24, // 12pt
            color: '1E3A8A',
            font: 'Calibri',
          }),
        ],
      }),
      new Paragraph({ text: '' })
    );
  };

  // 2. Summary
  if (resume.summary) {
    addSectionHeading('Professional Summary');
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: resume.summary,
            size: 22, // 11pt
            font: 'Calibri',
          }),
        ],
      }),
      new Paragraph({ text: '' })
    );
  }

  // 3. Technical Skills
  addSectionHeading('Technical Skills');

  const skillCategories: Array<{ label: string; skills: string[] }> = [
    { label: 'Languages', skills: resume.skills_section.languages || [] },
    { label: 'Frameworks', skills: resume.skills_section.frameworks || [] },
    { label: 'Tools & Cloud', skills: resume.skills_section.tools_platforms || [] },
    { label: 'Practices', skills: resume.skills_section.practices || [] },
  ];

  for (const category of skillCategories) {
    if (category.skills.length > 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${category.label}: `,
              bold: true,
              size: 22,
              font: 'Calibri',
            }),
            new TextRun({
              text: category.skills.join(', '),
              size: 22,
              font: 'Calibri',
            }),
          ],
        })
      );
    }
  }
  children.push(new Paragraph({ text: '' }));

  // 4. Experience (With Tier 1 rewrites and Tier 2 additions applied)
  addSectionHeading('Professional Experience');
  const appliedSuggestionIds = new Set<string>();

  const activeAccepted = acceptedSuggestions.filter(
    (s) => (s.status === 'accepted' || s.status === 'confirmed') && s.suggested_text
  );

  resume.experience.forEach((exp, expIdx) => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${exp.title} — ${exp.company}`,
            bold: true,
            size: 22,
            font: 'Calibri',
          }),
          new TextRun({
            text: ` (${exp.dates})`,
            italics: true,
            size: 20,
            font: 'Calibri',
          }),
        ],
      })
    );

    // Render existing bullets (with Tier 1 rewrites applied)
    for (const b of exp.bullets) {
      let bulletText = b.text;

      // Check for accepted Tier 1 suggestion matching this bullet
      const t1Match = activeAccepted.find(
        (s) =>
          !appliedSuggestionIds.has(s.id) &&
          s.tier === 1 &&
          (isBulletMatch(s.original_bullet, b.text) || (s.target_experience_id && s.target_experience_id === exp.id))
      );

      if (t1Match && t1Match.suggested_text) {
        bulletText = t1Match.suggested_text;
        appliedSuggestionIds.add(t1Match.id);
      }

      children.push(
        new Paragraph({
          bullet: { level: 0 },
          children: [
            new TextRun({
              text: bulletText,
              size: 22,
              font: 'Calibri',
            }),
          ],
        })
      );
    }

    // Append confirmed Tier 2 bullets assigned to this experience
    const t2Targeted = activeAccepted.filter(
      (s) =>
        s.tier === 2 &&
        s.target_experience_id === exp.id &&
        !appliedSuggestionIds.has(s.id)
    );

    for (const t2 of t2Targeted) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          children: [
            new TextRun({
              text: t2.suggested_text!,
              size: 22,
              font: 'Calibri',
            }),
          ],
        })
      );
      appliedSuggestionIds.add(t2.id);
    }

    // If first experience, also append any unassigned Tier 2 additions
    if (expIdx === 0) {
      const t2Unassigned = activeAccepted.filter(
        (s) => s.tier === 2 && !appliedSuggestionIds.has(s.id)
      );

      for (const t2 of t2Unassigned) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            children: [
              new TextRun({
                text: t2.suggested_text!,
                size: 22,
                font: 'Calibri',
              }),
            ],
          })
        );
        appliedSuggestionIds.add(t2.id);
      }
    }

    children.push(new Paragraph({ text: '' }));
  });

  // 5. Education
  if (resume.education && resume.education.length > 0) {
    addSectionHeading('Education');
    for (const edu of resume.education) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${edu.degree} — ${edu.institution} (${edu.dates})`,
              size: 22,
              font: 'Calibri',
            }),
          ],
        })
      );
    }
    children.push(new Paragraph({ text: '' }));
  }

  // 6. Certifications
  if (resume.certifications && resume.certifications.length > 0) {
    addSectionHeading('Certifications');
    for (const cert of resume.certifications) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          children: [
            new TextRun({
              text: cert,
              size: 22,
              font: 'Calibri',
            }),
          ],
        })
      );
    }
    children.push(new Paragraph({ text: '' }));
  }

  // Build document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
