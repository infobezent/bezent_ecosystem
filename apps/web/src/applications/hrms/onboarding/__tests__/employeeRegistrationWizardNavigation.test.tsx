import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import {
  EmployeeRegistration,
  REGISTRATION_CHAPTERS,
  REGISTRATION_SECTIONS,
} from '../components/EmployeeRegistration';
import { RegistrationConfigProvider } from '../registration/registrationConfig';
import { defaultRegistrationConfiguration } from './registrationConfigFixture';
import type { EmployeeRegistrationDraft } from '../components/DraftsModal';
import { INITIAL_REGISTRATION_DATA, toReviewSectionData } from '../types/registration.types';

function renderWizard(props?: {
  initialEntries?: string[];
  initialDraft?: EmployeeRegistrationDraft | null;
  onCancel?: () => void;
}) {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={props?.initialEntries ?? ['/hrms/administration/onboarding/registration']}>
      <RegistrationConfigProvider configuration={defaultRegistrationConfiguration}>
        <EmployeeRegistration
          onCancel={props?.onCancel ?? (() => {})}
          initialDraft={props?.initialDraft ?? null}
        />
      </RegistrationConfigProvider>
    </MemoryRouter>,
  );
}

describe('Employee Registration Wizard — Navigation & Identity Context', () => {
  describe('1. Canonical Step Sequence & Ordering', () => {
    it('defines Personal Information as Chapter 01 and General as Chapter 02', () => {
      expect(REGISTRATION_CHAPTERS[0]?.id).toBe('personal');
      expect(REGISTRATION_CHAPTERS[0]?.stepNumber).toBe('01');
      expect(REGISTRATION_CHAPTERS[0]?.label).toBe('Personal Information');

      expect(REGISTRATION_CHAPTERS[1]?.id).toBe('general');
      expect(REGISTRATION_CHAPTERS[1]?.stepNumber).toBe('02');
      expect(REGISTRATION_CHAPTERS[1]?.label).toBe('General');

      expect(REGISTRATION_CHAPTERS[2]?.id).toBe('onboarding');
      expect(REGISTRATION_CHAPTERS[2]?.stepNumber).toBe('03');
      expect(REGISTRATION_CHAPTERS[2]?.label).toBe('Administration');

      expect(REGISTRATION_CHAPTERS[3]?.id).toBe('skills');
      expect(REGISTRATION_CHAPTERS[4]?.id).toBe('emergency');
      expect(REGISTRATION_CHAPTERS[5]?.id).toBe('accounts');
      expect(REGISTRATION_CHAPTERS[6]?.id).toBe('online_access');
      expect(REGISTRATION_CHAPTERS[7]?.id).toBe('working_hours');
      expect(REGISTRATION_CHAPTERS[8]?.id).toBe('documents');
      expect(REGISTRATION_CHAPTERS[9]?.id).toBe('review');
      expect(REGISTRATION_CHAPTERS[9]?.stepNumber).toBe('10');
    });

    it('orders REGISTRATION_SECTIONS canonically matching the 10-step journey', () => {
      const sectionIds = REGISTRATION_SECTIONS.map((s) => s.id);
      expect(sectionIds).toEqual([
        'personal',
        'general',
        'onboarding',
        'skills',
        'emergency',
        'accounts',
        'online_access',
        'working_hours',
        'documents',
        'review',
      ]);
    });
  });

  describe('2. Initial Step Mount & Back Button Status', () => {
    it('defaults to Personal Information (Step 01) on new registration with Back button disabled', () => {
      const html = renderWizard();

      // Heading shows Chapter 01 Personal Information
      expect(html).toContain('PERSONAL INFORMATION');
      expect(html).toContain('Legal identity, demographics, contact details');

      // First step is selected in carousel
      expect(html).toContain('id="focus-chapter-personal"');
      expect(html).toMatch(/id="focus-chapter-personal"[^>]*aria-selected="true"/);

      // Back button is disabled on the first step
      expect(html).toMatch(/<button[^>]*disabled=""[^>]*>[\s\S]*?← Back/);
    });

    it('renders Back button enabled on subsequent steps (General, Administration, Review)', () => {
      // General step (Step 02)
      const generalHtml = renderWizard({
        initialEntries: ['/hrms/administration/onboarding/registration?chapter=general'],
      });
      expect(generalHtml).toContain('GENERAL');
      expect(generalHtml).not.toMatch(/<button[^>]*disabled=""[^>]*>\s*← Back/);

      // Administration step (Step 03)
      const adminHtml = renderWizard({
        initialEntries: ['/hrms/administration/onboarding/registration?chapter=onboarding'],
      });
      expect(adminHtml).toContain('ADMINISTRATION');
      expect(adminHtml).not.toMatch(/<button[^>]*disabled=""[^>]*>\s*← Back/);

      // Review step (Step 10)
      const reviewHtml = renderWizard({
        initialEntries: ['/hrms/administration/onboarding/registration?chapter=review'],
      });
      expect(reviewHtml).toContain('REVIEW');
      expect(reviewHtml).not.toMatch(/<button[^>]*disabled=""[^>]*>\s*← Back/);
    });
  });

  describe('3. Direct Navigation to Every Step', () => {
    const steps = [
      { id: 'personal', title: 'PERSONAL INFORMATION' },
      { id: 'general', title: 'GENERAL' },
      { id: 'onboarding', title: 'ADMINISTRATION' },
      { id: 'skills', title: 'SKILLS' },
      { id: 'emergency', title: 'EMERGENCY CONTACT' },
      { id: 'accounts', title: 'ACCOUNTS' },
      { id: 'online_access', title: 'ONLINE ACCESS' },
      { id: 'working_hours', title: 'WORKING HOURS' },
      { id: 'documents', title: 'DOCUMENTS' },
      { id: 'review', title: 'REVIEW' },
    ];

    for (const step of steps) {
      it(`renders step "${step.id}" correctly when targeted via route chapter param`, () => {
        const html = renderWizard({
          initialEntries: [`/hrms/administration/onboarding/registration?chapter=${step.id}`],
        });
        expect(html).toContain(step.title);
        expect(html).toMatch(new RegExp(`id="focus-chapter-${step.id}"[^>]*aria-selected="true"`));
      });
    }
  });

  describe('4. Employee Identity Context Display', () => {
    it('omits subtitle when no employee name exists yet and never displays placeholder text', () => {
      const html = renderWizard();
      expect(html).not.toContain('undefined');
      expect(html).not.toContain('null');
      expect(html).not.toContain('Draft Employee');
    });

    it('renders employee identity context in header but omits employee name from stepper labels', () => {
      const draftData = JSON.parse(JSON.stringify(INITIAL_REGISTRATION_DATA));
      draftData.personal.firstName = 'Kavya';
      draftData.personal.lastName = 'Iyer';
      draftData.general.employeeId = 'EMP-0005';

      const draft: EmployeeRegistrationDraft = {
        id: 'draft-test-1',
        employeeId: 'EMP-0005',
        employeeName: 'Kavya Iyer',
        activeSection: 'general',
        completedSectionsCount: 2,
        pendingSectionLabels: ['Skills'],
        lastUpdated: 'Today',
        reviewData: toReviewSectionData(draftData),
        formData: draftData,
      };

      const html = renderWizard({
        initialEntries: ['/hrms/administration/onboarding/registration?chapter=general'],
        initialDraft: draft,
      });

      // Header shows canonical context: "Kavya Iyer • EMP-0005"
      expect(html).toContain('Kavya Iyer • EMP-0005');

      // Stepper tabs do NOT include employee name suffixes: "(Kavya Iyer)" or "(Arun)"
      expect(html).not.toContain('bezent-focus-card__name-suffix');
      expect(html).not.toContain('(Kavya Iyer)');
      expect(html).not.toContain('(Arun)');

      // Stepper labels remain exactly canonical step names
      expect(html).toContain('Personal Information');
      expect(html).toContain('General');
      expect(html).toContain('Administration');
      expect(html).toContain('Skills');
      expect(html).toContain('Emergency Contact');
      expect(html).toContain('Accounts');
      expect(html).toContain('Online Access');
      expect(html).toContain('Working Hours');
      expect(html).toContain('Documents');
      expect(html).toContain('Review');
    });
  });

  describe('5. Data Persistence & Review Section Reflection', () => {
    it('preserves entered personal and general information and reflects it in the Review step', () => {
      const draftData = JSON.parse(JSON.stringify(INITIAL_REGISTRATION_DATA));
      draftData.personal.firstName = 'Arun';
      draftData.personal.lastName = 'Kumar';
      draftData.personal.bloodGroup = 'O+';
      draftData.general.employeeId = 'EMP-2026-99';
      draftData.general.department = 'Engineering';
      draftData.general.designation = 'Staff Engineer';

      const draft: EmployeeRegistrationDraft = {
        id: 'draft-review-test',
        employeeId: 'EMP-2026-99',
        employeeName: 'Arun Kumar',
        activeSection: 'review',
        completedSectionsCount: 9,
        pendingSectionLabels: [],
        lastUpdated: 'Just now',
        reviewData: toReviewSectionData(draftData),
        formData: draftData,
      };

      const reviewHtml = renderWizard({
        initialEntries: ['/hrms/administration/onboarding/registration?chapter=review'],
        initialDraft: draft,
      });

      // Review displays full personal and general details
      expect(reviewHtml).toContain('Arun Kumar');
      expect(reviewHtml).toContain('EMP-2026-99');
      expect(reviewHtml).toContain('O+');
      expect(reviewHtml).toContain('Engineering');
      expect(reviewHtml).toContain('Staff Engineer');
    });
  });

  describe('6. Clean Baseline & Unsaved Changes Guard Invariants', () => {
    it('does not display Unsaved Changes modal on fresh registration mount', () => {
      const html = renderWizard();
      expect(html).not.toContain('Unsaved Changes');
      expect(html).not.toContain('You have unsaved changes');
    });

    it('does not display Unsaved Changes modal when loaded with a saved draft', () => {
      const draftData = JSON.parse(JSON.stringify(INITIAL_REGISTRATION_DATA));
      draftData.personal.firstName = 'Arun';
      draftData.personal.lastName = 'Kumar';
      draftData.general.employeeId = 'EMP-0005';

      const draft: EmployeeRegistrationDraft = {
        id: 'draft-clean-test',
        employeeId: 'EMP-0005',
        employeeName: 'Arun Kumar',
        activeSection: 'personal',
        completedSectionsCount: 1,
        pendingSectionLabels: ['General'],
        lastUpdated: 'Today',
        reviewData: toReviewSectionData(draftData),
        formData: draftData,
      };

      const html = renderWizard({
        initialEntries: ['/hrms/administration/onboarding/registration?chapter=personal'],
        initialDraft: draft,
      });

      expect(html).not.toContain('Unsaved Changes');
      expect(html).not.toContain('You have unsaved changes');
    });

    it('does not display Unsaved Changes modal on General step with loaded data', () => {
      const draftData = JSON.parse(JSON.stringify(INITIAL_REGISTRATION_DATA));
      draftData.personal.firstName = 'Arun';
      draftData.personal.lastName = 'Kumar';
      draftData.general.employeeId = 'EMP-0005';
      draftData.general.department = 'Engineering';

      const draft: EmployeeRegistrationDraft = {
        id: 'draft-clean-general',
        employeeId: 'EMP-0005',
        employeeName: 'Arun Kumar',
        activeSection: 'general',
        completedSectionsCount: 2,
        pendingSectionLabels: ['Skills'],
        lastUpdated: 'Today',
        reviewData: toReviewSectionData(draftData),
        formData: draftData,
      };

      const html = renderWizard({
        initialEntries: ['/hrms/administration/onboarding/registration?chapter=general'],
        initialDraft: draft,
      });

      expect(html).not.toContain('Unsaved Changes');
      expect(html).not.toContain('You have unsaved changes');
    });
  });
});

