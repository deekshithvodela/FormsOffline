import { FormTemplate, FormSection, FormField, FieldType, FieldOption } from '../core/types';
import { generateTemplateFingerprint } from '../core/fingerprint/templateHasher';

export interface LinkParseResult {
  success: boolean;
  template?: FormTemplate;
  error?: string;
}

/**
 * Parses Google Forms FB_PUBLIC_LOAD_DATA_ payload or page HTML string into a native FormTemplate.
 */
export async function parseGoogleFormHtml(htmlContent: string, _url: string): Promise<LinkParseResult> {
  try {
    let title = 'Imported Google Form';
    let description = 'Converted from live Google Form responder page.';
    const sections: FormSection[] = [];

    let currentSectionTitle = 'Section 1: General';
    let currentSectionDesc = '';
    let currentFields: FormField[] = [];
    let sectionCount = 1;

    // Attempt 1: Extract FB_PUBLIC_LOAD_DATA_ array structure
    const match = htmlContent.match(/FB_PUBLIC_LOAD_DATA_\s*=\s*([\s\S]*?);</);
    if (match && match[1]) {
      try {
        const rawData = JSON.parse(match[1]);
        if (Array.isArray(rawData)) {
          if (rawData[1]) {
            if (rawData[1][8]) {
              title = rawData[1][8] || title;
            }
            if (rawData[1][0]) {
              description = rawData[1][0] || description;
              currentSectionDesc = description;
            }

            const items = rawData[1][1];
            if (Array.isArray(items)) {
              items.forEach((item: any, idx: number) => {
                if (!item || !Array.isArray(item)) return;
                const fieldTitle = item[1] || `Question ${idx + 1}`;
                const fieldTypeCode = item[3]; // 0: short text, 1: paragraph, 2: radio, 3: select, 4: checkbox, 5: scale, 8: PAGE BREAK / SECTION

                // Handle Google Forms Section Break (fieldTypeCode === 8)
                if (fieldTypeCode === 8) {
                  if (currentFields.length > 0 || sections.length === 0) {
                    sections.push({
                      id: `sec_gf_${Date.now()}_${sectionCount}`,
                      title: currentSectionTitle,
                      description: currentSectionDesc,
                      fields: [...currentFields],
                      branchingRules: []
                    });
                    sectionCount++;
                    currentFields = [];
                  }
                  currentSectionTitle = item[1] || `Section ${sectionCount}`;
                  currentSectionDesc = item[2] || '';
                  return;
                }

                const fieldPayload = item[4] && item[4][0];
                let type: FieldType = 'text';
                const options: FieldOption[] = [];

                if (fieldTypeCode === 0) type = 'text';
                else if (fieldTypeCode === 1) type = 'textarea';
                else if (fieldTypeCode === 2) type = 'radio';
                else if (fieldTypeCode === 3) type = 'select';
                else if (fieldTypeCode === 4) type = 'checkbox';
                else if (fieldTypeCode === 5) type = 'linear_scale';

                // Extract choice options if present
                if (fieldPayload && Array.isArray(fieldPayload[1])) {
                  fieldPayload[1].forEach((optArr: any) => {
                    if (optArr && optArr[0]) {
                      options.push({
                        label: String(optArr[0]),
                        value: String(optArr[0]),
                        targetSectionId: 'NEXT'
                      });
                    }
                  });
                }

                currentFields.push({
                  id: `f_gf_${Date.now()}_${idx}`,
                  type,
                  label: fieldTitle,
                  options: options.length > 0 ? options : undefined,
                  validation: {
                    required: false,
                    ...(type === 'linear_scale' ? { min: 1, max: 5, minLabel: 'Low', maxLabel: 'High' } : {})
                  }
                });
              });
            }
          }
        }
      } catch (e) {
        console.warn('FB_PUBLIC_LOAD_DATA_ parse fallback to DOM regex:', e);
      }
    }

    // Push the remaining active section
    if (currentFields.length > 0 || sections.length === 0) {
      sections.push({
        id: `sec_gf_${Date.now()}_${sectionCount}`,
        title: currentSectionTitle,
        description: currentSectionDesc,
        fields: currentFields,
        branchingRules: []
      });
    }

    // Fallback regex parsing if JSON array extraction didn't yield fields
    if (sections.reduce((acc, s) => acc + s.fields.length, 0) === 0) {
      const titleMatch = htmlContent.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) || htmlContent.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch) title = titleMatch[1].replace(' - Google Forms', '').trim();

      const fallbackFields: FormField[] = [];
      const questionMatches = htmlContent.match(/role="heading"[^>]*>([\s\S]*?)<\/div>/gi);
      if (questionMatches) {
        questionMatches.forEach((qHtml, i) => {
          const cleanText = qHtml.replace(/<[^>]+>/g, '').trim();
          if (cleanText && !cleanText.includes('Google Forms')) {
            fallbackFields.push({
              id: `f_gf_dom_${Date.now()}_${i}`,
              type: 'text',
              label: cleanText,
              validation: { required: false }
            });
          }
        });
      }

      if (fallbackFields.length === 0) {
        fallbackFields.push({
          id: `f_gf_def_${Date.now()}_1`,
          type: 'text',
          label: 'Respondent Full Name',
          validation: { required: true }
        });
      }

      sections[0] = {
        id: `sec_gf_${Date.now()}_1`,
        title: 'Section 1: General',
        description: description,
        fields: fallbackFields,
        branchingRules: []
      };
    }

    const draftTemplate = {
      id: `tpl_gf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title,
      description,
      version: 1,
      sections,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settings: {
        e2eeEnabled: false,
        allowDraftRecovery: true,
        showProgressBar: true,
        shuffleQuestions: false,
        confirmationMessage: 'Thank you! Your offline record has been recorded.'
      }
    };

    const canonicalFingerprint = await generateTemplateFingerprint(draftTemplate);
    const template: FormTemplate = {
      ...draftTemplate,
      canonicalFingerprint
    };

    return { success: true, template };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to parse form HTML structure.' };
  }
}

export function normalizeFormUrl(inputUrl: string): string {
  let url = inputUrl.trim();
  if (url.includes('docs.google.com/forms')) {
    // Convert /edit or /edit?usp=... to /viewform
    url = url.replace(/\/edit(\?[\s\S]*)?$/i, '/viewform');
    url = url.replace(/\/edit\/.*$/i, '/viewform');
    if (!url.endsWith('/viewform') && !url.includes('/viewform?')) {
      if (url.endsWith('/')) {
        url += 'viewform';
      } else if (!url.includes('/viewform')) {
        url += '/viewform';
      }
    }
  }
  return url;
}

/**
 * Main entrance to fetch and parse external form URL with automatic CORS proxy fallback cascade.
 */
export async function parseFormFromUrl(rawUrl: string, pageSourceFallback?: string): Promise<LinkParseResult> {
  const url = normalizeFormUrl(rawUrl);

  if (pageSourceFallback) {
    return parseGoogleFormHtml(pageSourceFallback, url);
  }

  // List of CORS bypass proxies to try sequentially
  const fetchEndpoints = [
    url, // Direct fetch attempt
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
  ];

  for (const endpoint of fetchEndpoints) {
    try {
      const res = await fetch(endpoint);
      if (res.ok) {
        const html = await res.text();
        if (html && (html.includes('FB_PUBLIC_LOAD_DATA_') || html.includes('<form') || html.includes('role="heading"'))) {
          const result = await parseGoogleFormHtml(html, url);
          if (result.success && result.template && result.template.sections[0].fields.length > 0) {
            return result;
          }
        }
      }
    } catch {
      // Continue to next proxy in cascade
    }
  }

  return {
    success: false,
    error: 'Could not automatically bypass CORS restrictions for this link. Please switch to the "Page Source / HTML" tab, press Ctrl+U on the Google Form page, and paste the HTML!'
  };
}
