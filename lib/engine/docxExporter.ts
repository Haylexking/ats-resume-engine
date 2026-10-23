import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  ShadingType,
} from 'docx';
import { MasterResume, TieredSuggestion, TailoredResume, ResumeTemplateId } from './types';

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
        properties: {
          page: {
            margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 },
          },
        },
        children,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

/**
 * Generates an ATS-optimized, high-craft DOCX file from a TailoredResume with 3 professional presets:
 * - 'classic-harvard': Single-column, 0.75" margins, clean line rules, bold uppercase headings, 10.5pt Calibri, navy accent (#1A365D).
 * - 'modern-executive': Executive summary feature block, Garamond/Calibri typography, subtle dark-slate dividers (#2D3748), refined bullet indentation.
 * - 'tech-linear': Technical skills featured immediately beneath summary, high-density impact layout, monospaced tech tags, crisp bullet spacing.
 */
export async function generateTailoredDocx(
  tailoredResume: TailoredResume,
  templateId?: ResumeTemplateId
): Promise<Buffer> {
  const activeTemplate: ResumeTemplateId = templateId || tailoredResume.template_id || 'classic-harvard';
  const children: Paragraph[] = [];
  const contact = tailoredResume.contact_block || {
    name: 'Candidate Name',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    github: '',
  };

  if (activeTemplate === 'modern-executive') {
    // ══════════════════════════════════════════════════════════════════════
    // TEMPLATE: MODERN EXECUTIVE
    // ══════════════════════════════════════════════════════════════════════
    const headingFont = 'Garamond';
    const bodyFont = 'Calibri';
    const slateAccent = '2D3748';
    const darkPrimary = '0F172A';
    const textMuted = '475569';

    // Header Block
    children.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 0, after: 40 },
        children: [
          new TextRun({
            text: contact.name,
            bold: true,
            size: 36, // 18pt
            font: headingFont,
            color: darkPrimary,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 0, after: 80 },
        children: [
          new TextRun({
            text: tailoredResume.target_role ? `${tailoredResume.target_role.toUpperCase()}` : 'EXECUTIVE CANDIDATE',
            bold: true,
            size: 21, // 10.5pt
            font: headingFont,
            color: slateAccent,
          }),
          ...(tailoredResume.target_company
            ? [
                new TextRun({
                  text: `  |  Targeted for ${tailoredResume.target_company}`,
                  italics: true,
                  size: 20,
                  font: bodyFont,
                  color: textMuted,
                }),
              ]
            : []),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 0, after: 140 },
        children: [
          new TextRun({
            text: [contact.email, contact.phone, contact.location].filter(Boolean).join('   •   '),
            size: 19,
            font: bodyFont,
            color: textMuted,
          }),
          ...(contact.linkedin || contact.github
            ? [
                new TextRun({
                  text: `   •   ${[contact.linkedin, contact.github].filter(Boolean).join('   •   ')}`,
                  size: 19,
                  font: bodyFont,
                  color: textMuted,
                }),
              ]
            : []),
        ],
      })
    );

    // Section Heading Helper
    const addExecHeading = (title: string) => {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 180, after: 60 },
          border: {
            bottom: {
              color: slateAccent,
              space: 3,
              style: BorderStyle.SINGLE,
              size: 6,
            },
          },
          children: [
            new TextRun({
              text: title.toUpperCase(),
              bold: true,
              size: 23, // 11.5pt
              font: headingFont,
              color: darkPrimary,
            }),
          ],
        })
      );
    };

    // 1. Executive Summary Feature Block
    if (tailoredResume.summary) {
      addExecHeading('Executive Profile & Strategic Value');
      children.push(
        new Paragraph({
          shading: {
            fill: 'F8FAFC',
            type: ShadingType.CLEAR,
          },
          border: {
            left: {
              color: slateAccent,
              space: 8,
              style: BorderStyle.SINGLE,
              size: 18,
            },
          },
          spacing: { before: 80, after: 120, line: 260 },
          children: [
            new TextRun({
              text: tailoredResume.summary,
              size: 21, // 10.5pt
              font: bodyFont,
              color: '1E293B',
            }),
          ],
        })
      );
    }

    // 2. Core Competencies & Skills
    const skillCats: Array<{ label: string; skills: string[] }> = [
      { label: 'Leadership & Methodologies', skills: tailoredResume.skills_section?.practices || [] },
      { label: 'Core Technical Stack', skills: tailoredResume.skills_section?.languages || [] },
      { label: 'Frameworks & Systems', skills: tailoredResume.skills_section?.frameworks || [] },
      { label: 'Cloud & Infrastructure', skills: tailoredResume.skills_section?.tools_platforms || [] },
    ].filter((c) => c.skills.length > 0);

    if (skillCats.length > 0) {
      addExecHeading('Core Competencies & Technical Expertise');
      for (const cat of skillCats) {
        children.push(
          new Paragraph({
            spacing: { before: 20, after: 20 },
            children: [
              new TextRun({
                text: `${cat.label}: `,
                bold: true,
                size: 21,
                font: bodyFont,
                color: darkPrimary,
              }),
              new TextRun({
                text: cat.skills.join(', '),
                size: 21,
                font: bodyFont,
                color: '334155',
              }),
            ],
          })
        );
      }
    }

    // 3. Executive Experience
    if (tailoredResume.experience && tailoredResume.experience.length > 0) {
      addExecHeading('Professional Experience');
      tailoredResume.experience.forEach((exp) => {
        children.push(
          new Paragraph({
            spacing: { before: 120, after: 30 },
            children: [
              new TextRun({
                text: exp.title,
                bold: true,
                size: 22, // 11pt
                font: headingFont,
                color: darkPrimary,
              }),
              new TextRun({
                text: ` — ${exp.company}`,
                bold: true,
                size: 21,
                font: bodyFont,
                color: slateAccent,
              }),
              new TextRun({
                text: `   (${exp.dates}${exp.location ? ` | ${exp.location}` : ''})`,
                italics: true,
                size: 19,
                font: bodyFont,
                color: textMuted,
              }),
            ],
          })
        );

        for (const bullet of exp.bullets) {
          const bulletContent = bullet.tailored_text || bullet.original_text;
          children.push(
            new Paragraph({
              bullet: { level: 0 },
              indent: { left: 360, hanging: 240 },
              spacing: { before: 25, after: 25, line: 240 },
              children: [
                new TextRun({
                  text: bulletContent,
                  size: 21, // 10.5pt
                  font: bodyFont,
                  color: '1E293B',
                }),
              ],
            })
          );
        }
      });
    }

    // 4. Education
    if (tailoredResume.education && tailoredResume.education.length > 0) {
      addExecHeading('Education & Credentials');
      for (const edu of tailoredResume.education) {
        children.push(
          new Paragraph({
            spacing: { before: 40, after: 40 },
            children: [
              new TextRun({
                text: edu.degree,
                bold: true,
                size: 21,
                font: bodyFont,
                color: darkPrimary,
              }),
              new TextRun({
                text: ` — ${edu.institution} (${edu.dates})`,
                size: 21,
                font: bodyFont,
                color: '334155',
              }),
            ],
          })
        );
      }
    }

    // 5. Certifications
    if (tailoredResume.certifications && tailoredResume.certifications.length > 0) {
      addExecHeading('Certifications & Honors');
      for (const cert of tailoredResume.certifications) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { before: 20, after: 20 },
            children: [
              new TextRun({
                text: cert,
                size: 21,
                font: bodyFont,
                color: '334155',
              }),
            ],
          })
        );
      }
    }
  } else if (activeTemplate === 'tech-linear') {
    // ══════════════════════════════════════════════════════════════════════
    // TEMPLATE: TECH LINEAR
    // ══════════════════════════════════════════════════════════════════════
    const techFont = 'Calibri';
    const techAccent = '0284C7'; // Cyan/Sky blue
    const darkPrimary = '0F172A';
    const textMuted = '64748B';

    // Header Block (High density, crisp)
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 30 },
        children: [
          new TextRun({
            text: contact.name,
            bold: true,
            size: 34, // 17pt
            font: techFont,
            color: darkPrimary,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 50 },
        children: [
          new TextRun({
            text: tailoredResume.target_role ? tailoredResume.target_role.toUpperCase() : 'SOFTWARE ENGINEER',
            bold: true,
            size: 20,
            font: techFont,
            color: techAccent,
          }),
          ...(tailoredResume.target_company
            ? [
                new TextRun({
                  text: ` | Target: ${tailoredResume.target_company}`,
                  size: 20,
                  font: techFont,
                  color: textMuted,
                }),
              ]
            : []),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 100 },
        children: [
          new TextRun({
            text: [contact.email, contact.phone, contact.location, contact.linkedin, contact.github]
              .filter(Boolean)
              .join('  |  '),
            size: 19, // 9.5pt
            font: techFont,
            color: textMuted,
          }),
        ],
      })
    );

    const addTechHeading = (title: string) => {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 140, after: 40 },
          border: {
            bottom: {
              color: techAccent,
              space: 2,
              style: BorderStyle.SINGLE,
              size: 6,
            },
          },
          children: [
            new TextRun({
              text: title.toUpperCase(),
              bold: true,
              size: 22, // 11pt
              font: techFont,
              color: techAccent,
            }),
          ],
        })
      );
    };

    // 1. Summary
    if (tailoredResume.summary) {
      addTechHeading('Summary');
      children.push(
        new Paragraph({
          spacing: { before: 40, after: 60, line: 230 },
          children: [
            new TextRun({
              text: tailoredResume.summary,
              size: 21,
              font: techFont,
              color: '1E293B',
            }),
          ],
        })
      );
    }

    // 2. Technical Skills FEATURED IMMEDIATELY BENEATH SUMMARY
    const skillCats: Array<{ label: string; skills: string[] }> = [
      { label: 'Languages', skills: tailoredResume.skills_section?.languages || [] },
      { label: 'Frameworks & Libraries', skills: tailoredResume.skills_section?.frameworks || [] },
      { label: 'Cloud, Infrastructure & DBs', skills: tailoredResume.skills_section?.tools_platforms || [] },
      { label: 'Architecture & Practices', skills: tailoredResume.skills_section?.practices || [] },
    ].filter((c) => c.skills.length > 0);

    if (skillCats.length > 0) {
      addTechHeading('Technical Skills');
      for (const cat of skillCats) {
        children.push(
          new Paragraph({
            spacing: { before: 15, after: 15 },
            children: [
              new TextRun({
                text: `${cat.label.toUpperCase()}: `,
                bold: true,
                size: 20,
                font: techFont,
                color: darkPrimary,
              }),
              new TextRun({
                text: cat.skills.join('  •  '),
                size: 20,
                font: techFont,
                color: '334155',
              }),
            ],
          })
        );
      }
    }

    // 3. Technical Experience
    if (tailoredResume.experience && tailoredResume.experience.length > 0) {
      addTechHeading('Engineering Experience');
      tailoredResume.experience.forEach((exp) => {
        children.push(
          new Paragraph({
            spacing: { before: 100, after: 20 },
            children: [
              new TextRun({
                text: exp.title,
                bold: true,
                size: 21,
                font: techFont,
                color: darkPrimary,
              }),
              new TextRun({
                text: ` @ ${exp.company}`,
                bold: true,
                size: 21,
                font: techFont,
                color: techAccent,
              }),
              new TextRun({
                text: `  [${exp.dates}${exp.location ? ` | ${exp.location}` : ''}]`,
                size: 19,
                font: techFont,
                color: textMuted,
              }),
            ],
          })
        );

        for (const bullet of exp.bullets) {
          const bulletContent = bullet.tailored_text || bullet.original_text;
          children.push(
            new Paragraph({
              bullet: { level: 0 },
              spacing: { before: 15, after: 15, line: 220 },
              children: [
                new TextRun({
                  text: bulletContent,
                  size: 21,
                  font: techFont,
                  color: '1E293B',
                }),
              ],
            })
          );
        }
      });
    }

    // 4. Education
    if (tailoredResume.education && tailoredResume.education.length > 0) {
      addTechHeading('Education');
      for (const edu of tailoredResume.education) {
        children.push(
          new Paragraph({
            spacing: { before: 30, after: 30 },
            children: [
              new TextRun({
                text: `${edu.degree} — ${edu.institution}`,
                bold: true,
                size: 21,
                font: techFont,
                color: darkPrimary,
              }),
              new TextRun({
                text: ` (${edu.dates})`,
                size: 19,
                font: techFont,
                color: textMuted,
              }),
            ],
          })
        );
      }
    }

    // 5. Certifications
    if (tailoredResume.certifications && tailoredResume.certifications.length > 0) {
      addTechHeading('Certifications');
      for (const cert of tailoredResume.certifications) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { before: 15, after: 15 },
            children: [
              new TextRun({
                text: cert,
                size: 21,
                font: techFont,
                color: '334155',
              }),
            ],
          })
        );
      }
    }
  } else {
    // ══════════════════════════════════════════════════════════════════════
    // TEMPLATE: CLASSIC HARVARD (Default)
    // ══════════════════════════════════════════════════════════════════════
    const font = 'Calibri';
    const navyAccent = '1A365D';
    const darkPrimary = '111827';
    const textMuted = '4B5563';

    // Header & Contact Block
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 40 },
        children: [
          new TextRun({
            text: contact.name.toUpperCase(),
            bold: true,
            size: 32, // 16pt
            font,
            color: navyAccent,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 30 },
        children: [
          new TextRun({
            text: [contact.email, contact.phone, contact.location].filter(Boolean).join('   |   '),
            size: 20, // 10pt
            font,
            color: textMuted,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 100 },
        children: [
          new TextRun({
            text: [contact.linkedin, contact.github].filter(Boolean).join('   |   '),
            size: 19,
            font,
            color: textMuted,
          }),
        ],
      })
    );

    // Section Heading Helper
    const addHarvardHeading = (title: string) => {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 160, after: 40 },
          border: {
            bottom: {
              color: navyAccent,
              space: 2,
              style: BorderStyle.SINGLE,
              size: 8,
            },
          },
          children: [
            new TextRun({
              text: title.toUpperCase(),
              bold: true,
              size: 23, // 11.5pt
              font,
              color: navyAccent,
            }),
          ],
        })
      );
    };

    // 1. Professional Summary
    if (tailoredResume.summary) {
      addHarvardHeading('Professional Summary');
      children.push(
        new Paragraph({
          spacing: { before: 40, after: 60, line: 240 },
          children: [
            new TextRun({
              text: tailoredResume.summary,
              size: 21, // 10.5pt
              font,
              color: darkPrimary,
            }),
          ],
        })
      );
    }

    // 2. Technical Skills
    const skillCats: Array<{ label: string; skills: string[] }> = [
      { label: 'Languages', skills: tailoredResume.skills_section?.languages || [] },
      { label: 'Frameworks & Libraries', skills: tailoredResume.skills_section?.frameworks || [] },
      { label: 'Tools & Platforms', skills: tailoredResume.skills_section?.tools_platforms || [] },
      { label: 'Practices & Methodologies', skills: tailoredResume.skills_section?.practices || [] },
    ].filter((c) => c.skills.length > 0);

    if (skillCats.length > 0) {
      addHarvardHeading('Technical Skills');
      for (const cat of skillCats) {
        children.push(
          new Paragraph({
            spacing: { before: 20, after: 20 },
            children: [
              new TextRun({
                text: `${cat.label}: `,
                bold: true,
                size: 21,
                font,
                color: navyAccent,
              }),
              new TextRun({
                text: cat.skills.join(', '),
                size: 21,
                font,
                color: darkPrimary,
              }),
            ],
          })
        );
      }
    }

    // 3. Professional Experience
    if (tailoredResume.experience && tailoredResume.experience.length > 0) {
      addHarvardHeading('Professional Experience');
      tailoredResume.experience.forEach((exp) => {
        children.push(
          new Paragraph({
            spacing: { before: 100, after: 20 },
            children: [
              new TextRun({
                text: exp.title,
                bold: true,
                size: 22,
                font,
                color: darkPrimary,
              }),
              new TextRun({
                text: ` — ${exp.company}`,
                bold: true,
                size: 21,
                font,
                color: navyAccent,
              }),
              new TextRun({
                text: ` (${exp.dates}${exp.location ? ` | ${exp.location}` : ''})`,
                italics: true,
                size: 20,
                font,
                color: textMuted,
              }),
            ],
          })
        );

        for (const bullet of exp.bullets) {
          const bulletContent = bullet.tailored_text || bullet.original_text;
          children.push(
            new Paragraph({
              bullet: { level: 0 },
              spacing: { before: 20, after: 20, line: 240 },
              children: [
                new TextRun({
                  text: bulletContent,
                  size: 21, // 10.5pt
                  font,
                  color: darkPrimary,
                }),
              ],
            })
          );
        }
      });
    }

    // 4. Education
    if (tailoredResume.education && tailoredResume.education.length > 0) {
      addHarvardHeading('Education');
      for (const edu of tailoredResume.education) {
        children.push(
          new Paragraph({
            spacing: { before: 30, after: 30 },
            children: [
              new TextRun({
                text: edu.degree,
                bold: true,
                size: 21,
                font,
                color: darkPrimary,
              }),
              new TextRun({
                text: ` — ${edu.institution} (${edu.dates})`,
                size: 21,
                font,
                color: darkPrimary,
              }),
            ],
          })
        );
      }
    }

    // 5. Certifications
    if (tailoredResume.certifications && tailoredResume.certifications.length > 0) {
      addHarvardHeading('Certifications');
      for (const cert of tailoredResume.certifications) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { before: 20, after: 20 },
            children: [
              new TextRun({
                text: cert,
                size: 21,
                font,
                color: darkPrimary,
              }),
            ],
          })
        );
      }
    }
  }

  // Construct document with 0.75" (1080 twips) standard margins
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 },
          },
        },
        children,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
