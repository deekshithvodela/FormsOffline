/**
 * Forms Offline — Default Template & Demo Dataset Seeder
 * 
 * Pre-populates clean, professional sample form templates upon first launch.
 */

import { FormTemplate, FormSubmission } from '../core/types';
import { generateTemplateFingerprint } from '../core/fingerprint/templateHasher';
import { db } from './database';

export async function seedDefaultTemplates(): Promise<void> {
  try {
    const templateCount = await db.templates.count();
    if (templateCount > 0) return; // Database already populated

    const now = new Date().toISOString();

    // 1. Facility Safety & Operations Inspection
    const inspectionRaw = {
      id: 'tpl_facility_inspection',
      title: 'Facility Safety & Operations Inspection',
      description: 'Standard field audit form for physical safety, compliance, and infrastructure reporting.',
      version: 1,
      createdAt: now,
      updatedAt: now,
      settings: {
        e2eeEnabled: false,
        collectGeoLocation: true,
        showProgressBar: true,
        enableAutosave: true,
        confirmationMessage: 'Inspection report successfully logged to local database!'
      },
      sections: [
        {
          id: 'sec_meta',
          title: 'Section 1 of 3: Inspector & Location Meta',
          description: 'Record facility location and inspector details.',
          order: 0,
          fields: [
            {
              id: 'f_inspector_name',
              type: 'text' as const,
              label: 'Inspector Full Name',
              placeholder: 'e.g. John Doe',
              validation: { required: true }
            },
            {
              id: 'f_inspection_date',
              type: 'date' as const,
              label: 'Inspection Date',
              validation: { required: true }
            },
            {
              id: 'f_location',
              type: 'location' as const,
              label: 'Facility Location / Site Name',
              placeholder: 'e.g. Building A - Main Hall'
            }
          ]
        },
        {
          id: 'sec_safety',
          title: 'Section 2 of 3: Safety Checklist & Infrastructure',
          description: 'Assess physical safety measures and structural integrity.',
          order: 1,
          fields: [
            {
              id: 'f_fire_extinguishers',
              type: 'radio' as const,
              label: 'Fire Extinguishers Inspection Verified?',
              options: [
                { label: 'Yes - Fully Charged & Serviced', value: 'yes' },
                { label: 'No - Needs Immediate Service', value: 'no' },
                { label: 'Not Applicable', value: 'na' }
              ],
              validation: { required: true }
            },
            {
              id: 'f_exits_clear',
              type: 'radio' as const,
              label: 'Emergency Exits Clear & Unobstructed?',
              options: [
                { label: 'Yes - All Clear', value: 'yes' },
                { label: 'No - Obstructed', value: 'no' }
              ],
              validation: { required: true }
            },
            {
              id: 'f_safety_features',
              type: 'checkbox' as const,
              label: 'Active Safety Equipment Present',
              options: [
                { label: 'Smoke Detectors', value: 'smoke_detectors' },
                { label: 'First Aid Kit', value: 'first_aid' },
                { label: 'Emergency Lighting', value: 'emergency_lighting' },
                { label: 'PPE Available', value: 'ppe' }
              ]
            },
            {
              id: 'f_infra_rating',
              type: 'linear_scale' as const,
              label: 'Infrastructure Condition Score (1–5)',
              validation: { min: 1, max: 5, minLabel: 'Poor / Damaged', maxLabel: 'Excellent' }
            }
          ]
        },
        {
          id: 'sec_signoff',
          title: 'Section 3 of 3: Rating & Digital Sign-off',
          description: 'Provide overall rating and inspector signature.',
          order: 2,
          fields: [
            {
              id: 'f_overall_star_rating',
              type: 'rating' as const,
              label: 'Overall Facility Compliance Rating',
              description: 'Assign a 1-to-5 star quality score for this facility audit.'
            },
            {
              id: 'f_comments',
              type: 'textarea' as const,
              label: 'Inspector Notes & Corrective Actions',
              placeholder: 'Document any hazards or recommendations...'
            },
            {
              id: 'f_signature',
              type: 'signature' as const,
              label: 'Inspector Digital Signature',
              validation: { required: true }
            }
          ]
        }
      ]
    };

    // 2. Patient Health Triage & Screening
    const triageRaw = {
      id: 'tpl_health_triage',
      title: 'Patient Health Triage & Clinical Intake',
      description: 'Offline emergency health triage form for rapid symptom assessment and risk scoring.',
      version: 1,
      createdAt: now,
      updatedAt: now,
      settings: {
        e2eeEnabled: false,
        collectGeoLocation: false,
        showProgressBar: true,
        enableAutosave: true
      },
      sections: [
        {
          id: 'sec_patient',
          title: 'Section 1 of 2: Patient Registration',
          description: 'Basic intake details and primary symptoms.',
          order: 0,
          fields: [
            {
              id: 'f_patient_name',
              type: 'text' as const,
              label: 'Patient Full Name',
              validation: { required: true }
            },
            {
              id: 'f_dob',
              type: 'date' as const,
              label: 'Date of Birth',
              validation: { required: true }
            },
            {
              id: 'f_symptoms',
              type: 'checkbox' as const,
              label: 'Primary Presenting Symptoms',
              options: [
                { label: 'Fever', value: 'fever' },
                { label: 'Cough', value: 'cough' },
                { label: 'Shortness of Breath', value: 'shortness_of_breath' },
                { label: 'Chest Pain', value: 'chest_pain' },
                { label: 'Fatigue / Dizziness', value: 'fatigue' }
              ]
            }
          ]
        },
        {
          id: 'sec_vitals',
          title: 'Section 2 of 2: Clinical Vitals & Priority Score',
          description: 'Measure vitals and assign priority tier.',
          order: 1,
          fields: [
            {
              id: 'f_temp',
              type: 'number' as const,
              label: 'Body Temperature (°C)',
              placeholder: 'e.g. 37.2'
            },
            {
              id: 'f_discomfort_level',
              type: 'rating' as const,
              label: 'Patient Discomfort Severity Rating (1–5 Stars)'
            },
            {
              id: 'f_priority',
              type: 'select' as const,
              label: 'Triage Priority Category',
              options: [
                { label: 'Green - Low Priority / Routine', value: 'green' },
                { label: 'Yellow - Moderate / Urgent', value: 'yellow' },
                { label: 'Red - High Priority / Emergency', value: 'red' }
              ],
              validation: { required: true }
            }
          ]
        }
      ]
    };

    // 3. Customer Experience & NPS Survey
    const feedbackRaw = {
      id: 'tpl_customer_nps',
      title: 'Customer Experience & NPS Survey',
      description: 'Field customer feedback questionnaire evaluating service quality and Net Promoter Score.',
      version: 1,
      createdAt: now,
      updatedAt: now,
      settings: {
        e2eeEnabled: false,
        collectGeoLocation: false,
        showProgressBar: true,
        enableAutosave: true
      },
      sections: [
        {
          id: 'sec_feedback',
          title: 'Section 1 of 1: Customer Evaluation',
          description: 'Rate your recent experience.',
          order: 0,
          fields: [
            {
              id: 'f_cust_category',
              type: 'radio' as const,
              label: 'Customer Account Category',
              options: [
                { label: 'Standard Customer', value: 'standard' },
                { label: 'Enterprise Client', value: 'enterprise' },
                { label: 'Field Operator / Partner', value: 'partner' }
              ]
            },
            {
              id: 'f_star_exp',
              type: 'rating' as const,
              label: 'Overall Service Experience Rating'
            },
            {
              id: 'f_nps_scale',
              type: 'linear_scale' as const,
              label: 'Likelihood to Recommend (NPS 0–10)',
              validation: { min: 0, max: 10, minLabel: 'Not Likely', maxLabel: 'Extremely Likely' }
            },
            {
              id: 'f_feedback_text',
              type: 'textarea' as const,
              label: 'Detailed Feedback & Suggestions',
              placeholder: 'Share what we did well or areas to improve...'
            }
          ]
        }
      ]
    };

    // Generate SHA-256 fingerprints
    const inspectionFingerprint = await generateTemplateFingerprint(inspectionRaw);
    const triageFingerprint = await generateTemplateFingerprint(triageRaw);
    const feedbackFingerprint = await generateTemplateFingerprint(feedbackRaw);

    const templatesToInsert: FormTemplate[] = [
      { ...inspectionRaw, canonicalFingerprint: inspectionFingerprint },
      { ...triageRaw, canonicalFingerprint: triageFingerprint },
      { ...feedbackRaw, canonicalFingerprint: feedbackFingerprint }
    ];

    await db.templates.bulkPut(templatesToInsert);

    // Seed 1 sample submission for Inspection form so Dataset CMS displays immediate data
    const sampleSubId = `sub_${inspectionRaw.id}_demo01`;
    const sampleSub: FormSubmission = {
      id: sampleSubId,
      templateId: inspectionRaw.id,
      templateFingerprint: inspectionFingerprint,
      templateVersion: 1,
      createdAt: now,
      updatedAt: now,
      status: 'completed',
      deviceId: 'local_device',
      data: {
        f_inspector_name: 'Operator 1',
        f_inspection_date: now.split('T')[0],
        f_location: 'Main Headquarters - Sector 4',
        f_fire_extinguishers: 'yes',
        f_exits_clear: 'yes',
        f_safety_features: ['smoke_detectors', 'first_aid', 'emergency_lighting'],
        f_infra_rating: 5,
        f_overall_star_rating: 5,
        f_comments: 'All safety parameters verified. Facility meets 100% compliance standards.'
      },
      provenance: [
        {
          id: `prov_${sampleSubId}_1`,
          timestamp: now,
          action: 'created',
          deviceId: 'local_device',
          authorAlias: 'Operator 1',
          hash: 'a7c9f82d3e4b1a5e9f82d3e4b1a5e9f8'
        }
      ]
    };

    await db.submissions.put(sampleSub);
    if (import.meta.env.DEV) console.log('[Seeder] Default templates and sample records successfully initialized!');
  } catch (err) {
    console.error('[Seeder] Error seeding default templates:', err);
  }
}
