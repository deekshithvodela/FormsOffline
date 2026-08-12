import { describe, it, expect } from 'vitest';
import { evaluateCondition, getNextSectionId } from '../../src/core/branching/evaluator';
import { BranchingRule, FormSection } from '../../src/core/types';

describe('Section Branching Logic Evaluator', () => {
  it('should evaluate equals and not_equals operators', () => {
    const ruleEquals: BranchingRule = {
      id: 'r1',
      condition: { fieldId: 'symptom', operator: 'equals', value: 'Fever' },
      targetSectionId: 'sec_fever'
    };

    expect(evaluateCondition(ruleEquals, { symptom: 'Fever' })).toBe(true);
    expect(evaluateCondition(ruleEquals, { symptom: 'Cough' })).toBe(false);
  });

  it('should evaluate contains operator for string and array', () => {
    const ruleContains: BranchingRule = {
      id: 'r2',
      condition: { fieldId: 'allergies', operator: 'contains', value: 'Penicillin' },
      targetSectionId: 'sec_allergy'
    };

    expect(evaluateCondition(ruleContains, { allergies: ['Peanuts', 'Penicillin'] })).toBe(true);
    expect(evaluateCondition(ruleContains, { allergies: ['Dust'] })).toBe(false);
    expect(evaluateCondition(ruleContains, { allergies: 'Severe Penicillin Reaction' })).toBe(true);
  });

  it('should evaluate numeric comparison operators', () => {
    const ruleGt: BranchingRule = {
      id: 'r3',
      condition: { fieldId: 'age', operator: 'greater_than', value: 18 },
      targetSectionId: 'sec_adult'
    };

    expect(evaluateCondition(ruleGt, { age: 25 })).toBe(true);
    expect(evaluateCondition(ruleGt, { age: 16 })).toBe(false);
  });

  it('should determine next section or SUBMIT correctly', () => {
    const section1: FormSection = {
      id: 'sec_1',
      title: 'Intro',
      fields: [],
      branchingRules: [
        {
          id: 'rule_skip',
          condition: { fieldId: 'consent', operator: 'equals', value: 'No' },
          targetSectionId: 'SUBMIT'
        }
      ]
    };

    const section2: FormSection = {
      id: 'sec_2',
      title: 'Details',
      fields: []
    };

    const sections = [section1, section2];

    expect(getNextSectionId(section1, sections, { consent: 'No' })).toBe('SUBMIT');
    expect(getNextSectionId(section1, sections, { consent: 'Yes' })).toBe('sec_2');
    expect(getNextSectionId(section2, sections, {})).toBe('SUBMIT');
  });
});
