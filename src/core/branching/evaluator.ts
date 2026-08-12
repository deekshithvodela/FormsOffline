/**
 * Forms Offline — Section Branching Logic Evaluator
 * 
 * Pure TypeScript logic evaluator for dynamic form navigation.
 */

import { BranchingRule, FormSection } from '../types';

export function evaluateCondition(
  rule: BranchingRule,
  formData: Record<string, any>
): boolean {
  const { fieldId, operator, value } = rule.condition;
  const fieldValue = formData[fieldId];

  switch (operator) {
    case 'equals':
      return String(fieldValue ?? '').trim() === String(value ?? '').trim();

    case 'not_equals':
      return String(fieldValue ?? '').trim() !== String(value ?? '').trim();

    case 'contains':
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(value);
      }
      return String(fieldValue ?? '').toLowerCase().includes(String(value ?? '').toLowerCase());

    case 'greater_than':
      return Number(fieldValue) > Number(value);

    case 'less_than':
      return Number(fieldValue) < Number(value);

    case 'is_empty':
      return (
        fieldValue === undefined ||
        fieldValue === null ||
        String(fieldValue).trim() === '' ||
        (Array.isArray(fieldValue) && fieldValue.length === 0)
      );

    case 'is_not_empty':
      return (
        fieldValue !== undefined &&
        fieldValue !== null &&
        String(fieldValue).trim() !== '' &&
        (!Array.isArray(fieldValue) || fieldValue.length > 0)
      );

    default:
      return false;
  }
}

export function getNextSectionId(
  currentSection: FormSection,
  sections: FormSection[],
  formData: Record<string, any>
): string | 'SUBMIT' {
  // 1. Evaluate option-based branching first ("Go to section based on answer")
  for (const field of currentSection.fields) {
    if (['radio', 'select'].includes(field.type) && field.options && field.showSectionBranching) {
      const selectedValue = formData[field.id];
      if (selectedValue) {
        const matchedOpt = field.options.find(
          (o) => String(o.value).trim() === String(selectedValue).trim()
        );
        if (matchedOpt && matchedOpt.targetSectionId && matchedOpt.targetSectionId !== 'NEXT') {
          return matchedOpt.targetSectionId;
        }
      }
    }
  }

  // 2. Evaluate section-level rule conditions
  if (currentSection.branchingRules && currentSection.branchingRules.length > 0) {
    for (const rule of currentSection.branchingRules) {
      if (evaluateCondition(rule, formData)) {
        return rule.targetSectionId;
      }
    }
  }

  // 3. Default fall-through: return next section index or SUBMIT if last
  const currentIndex = sections.findIndex((s) => s.id === currentSection.id);
  if (currentIndex === -1 || currentIndex === sections.length - 1) {
    return 'SUBMIT';
  }

  return sections[currentIndex + 1].id;
}
