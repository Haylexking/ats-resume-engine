import mammoth from 'mammoth';
import { MasterResume, ParseabilityResult } from './types';

export async function runParseabilityHarness(
  docxBuffer: Buffer,
  resume: MasterResume
): Promise<ParseabilityResult> {
  const diffWarnings: string[] = [];
  const garbledSections: string[] = [];

  let rawExtractedText = '';
  try {
    const result = await mammoth.extractRawText({ buffer: docxBuffer });
    rawExtractedText = result.value || '';
  } catch (err) {
    return {
      passed: false,
      raw_extracted_text: '',
      diff_warnings: ['Failed to extract raw text from DOCX buffer.'],
      garbled_sections: ['DOCX parsing error'],
    };
  }

  const extractedLower = rawExtractedText.toLowerCase();

  // ═════════════════════════════════════════════════════════════════════════════
  // 1. Check Section Headings
  // ═════════════════════════════════════════════════════════════════════════════
  const requiredHeadings = ['technical skills', 'experience', 'education'];
  for (const heading of requiredHeadings) {
    if (!extractedLower.includes(heading)) {
      diffWarnings.push(`Critical section header "${heading.toUpperCase()}" was missing or garbled during ATS extraction.`);
    }
  }

  // Also check for certifications section if they exist in master data
  if (resume.certifications && resume.certifications.length > 0) {
    if (!extractedLower.includes('certification')) {
      diffWarnings.push('Certifications section header was missing or garbled. Your certifications may be invisible to ATS parsers.');
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // 2. Check Candidate Name & Contact Info
  // FIX #20: Verify ALL contact block fields, not just the name
  // ═════════════════════════════════════════════════════════════════════════════
  if (!extractedLower.includes(resume.contact_block.name.toLowerCase())) {
    garbledSections.push(`Candidate Name "${resume.contact_block.name}" was not detected in raw ATS text.`);
  }

  if (resume.contact_block.email && !extractedLower.includes(resume.contact_block.email.toLowerCase())) {
    garbledSections.push(`Email "${resume.contact_block.email}" was not detected — recruiters cannot reach you.`);
  }

  if (resume.contact_block.phone) {
    // Normalize phone: strip spaces, dashes, parens for comparison
    const phoneDigits = resume.contact_block.phone.replace(/\D/g, '');
    const extractedDigits = rawExtractedText.replace(/\D/g, '');
    if (phoneDigits.length >= 7 && !extractedDigits.includes(phoneDigits)) {
      garbledSections.push(`Phone number "${resume.contact_block.phone}" was not detected in extracted text.`);
    }
  }

  if (resume.contact_block.linkedin) {
    const linkedinHandle = resume.contact_block.linkedin.toLowerCase().replace(/https?:\/\/(www\.)?linkedin\.com\/in\//g, '').replace(/\/$/, '');
    if (linkedinHandle && !extractedLower.includes(linkedinHandle)) {
      diffWarnings.push(`LinkedIn URL/handle was not detected in raw ATS text.`);
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // 3. Diff bullet point extraction fidelity
  // FIX #19: Check multiple segments of each bullet (beginning, middle, metrics)
  // instead of just the first 30 chars
  // ═════════════════════════════════════════════════════════════════════════════
  const allMasterBullets = resume.experience.flatMap((e) => e.bullets.map((b) => b.text));
  let missingBulletsCount = 0;
  const garbledBulletDetails: string[] = [];

  for (const bullet of allMasterBullets) {
    if (bullet.length < 10) continue;

    // Check beginning (first 30 chars)
    const beginning = bullet.slice(0, 30).toLowerCase();
    const beginningFound = extractedLower.includes(beginning);

    // Check metrics/numbers at the end (most valuable for recruiters)
    const metricsMatch = bullet.match(/\d+[%xX]?\s*(?:improvement|reduction|increase|decrease|faster|users|customers|revenue|latency)?/g);
    let metricsFound = true;
    if (metricsMatch && metricsMatch.length > 0) {
      metricsFound = metricsMatch.some((m) => extractedLower.includes(m.toLowerCase()));
    }

    // Check a middle segment
    const midStart = Math.floor(bullet.length * 0.3);
    const midEnd = Math.min(midStart + 25, bullet.length);
    const middle = bullet.slice(midStart, midEnd).toLowerCase();
    const middleFound = middle.length > 5 ? extractedLower.includes(middle) : true;

    if (!beginningFound) {
      missingBulletsCount++;
      garbledBulletDetails.push(`MISSING: "${bullet.slice(0, 60)}..."`);
    } else if (!metricsFound) {
      garbledBulletDetails.push(`METRICS GARBLED: Numbers/percentages in "${bullet.slice(0, 40)}..." may be corrupted.`);
    } else if (!middleFound) {
      garbledBulletDetails.push(`PARTIAL LOSS: Middle segment of "${bullet.slice(0, 40)}..." was garbled.`);
    }
  }

  if (missingBulletsCount > 0) {
    diffWarnings.push(`${missingBulletsCount} resume bullet(s) were entirely missing from raw text extraction.`);
  }
  if (garbledBulletDetails.length > 0) {
    diffWarnings.push(...garbledBulletDetails.slice(0, 5)); // Cap at 5 to avoid noise
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // 4. Check skills section fidelity
  // ═════════════════════════════════════════════════════════════════════════════
  const allSkills = [
    ...resume.skills_section.languages,
    ...resume.skills_section.frameworks,
    ...resume.skills_section.tools_platforms,
  ];
  let missingSkillsCount = 0;
  for (const skill of allSkills) {
    if (skill.length > 2 && !extractedLower.includes(skill.toLowerCase())) {
      missingSkillsCount++;
    }
  }
  if (missingSkillsCount > 2) {
    diffWarnings.push(`${missingSkillsCount} skills from the Technical Skills section were missing or garbled in raw extraction.`);
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // 5. Check certifications fidelity
  // ═════════════════════════════════════════════════════════════════════════════
  if (resume.certifications && resume.certifications.length > 0) {
    let missingCerts = 0;
    for (const cert of resume.certifications) {
      const certSnippet = cert.slice(0, 25).toLowerCase();
      if (!extractedLower.includes(certSnippet)) {
        missingCerts++;
      }
    }
    if (missingCerts > 0) {
      diffWarnings.push(`${missingCerts} certification(s) were not found in extracted text.`);
    }
  }

  const passed = diffWarnings.length === 0 && garbledSections.length === 0;

  return {
    passed,
    raw_extracted_text: rawExtractedText,
    diff_warnings: diffWarnings,
    garbled_sections: garbledSections,
  };
}
