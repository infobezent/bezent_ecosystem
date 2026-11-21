import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import {
  RequiredDocumentsManagement,
  DEFAULT_DOCUMENT_CATEGORIES,
  DEFAULT_DOCUMENT_REQUIREMENTS,
} from '../tabs/required-documents/RequiredDocumentsManagement';
import { AddEditDocumentModal } from '../tabs/required-documents/AddEditDocumentModal';
import { ApplicabilityRulesModal } from '../tabs/required-documents/ApplicabilityRulesModal';
import { ManageCategoriesModal } from '../tabs/required-documents/ManageCategoriesModal';
import { FormsOnboardingTab } from '../tabs/FormsOnboardingTab';

// Mock API calls
vi.mock('../../../api/documentRequirementApi', () => ({
  fetchDocumentCategories: vi.fn().mockResolvedValue(DEFAULT_DOCUMENT_CATEGORIES),
  createDocumentCategory: vi.fn(),
  updateDocumentCategory: vi.fn(),
  deleteDocumentCategory: vi.fn(),
  reorderDocumentCategories: vi.fn(),
  fetchDocumentRequirements: vi.fn().mockResolvedValue(DEFAULT_DOCUMENT_REQUIREMENTS),
  getDocumentRequirement: vi.fn(),
  createDocumentRequirement: vi.fn(),
  updateDocumentRequirement: vi.fn(),
  duplicateDocumentRequirement: vi.fn(),
  deleteDocumentRequirement: vi.fn(),
  saveDocumentApplicability: vi.fn(),
  resolveApplicableDocuments: vi.fn(),
  fetchCandidateDocuments: vi.fn(),
  generateCandidateDocuments: vi.fn(),
  uploadCandidateDocument: vi.fn(),
  verifyCandidateDocument: vi.fn(),
  requestCandidateReupload: vi.fn(),
}));

describe('Required Documents Settings & Management UI Components', () => {
  describe('1. Main Page UI & Default Categories', () => {
    it('renders the Required Documents main page with title, primary actions, and compact toolbar', () => {
      const html = renderToStaticMarkup(<RequiredDocumentsManagement />);

      expect(html).toContain('Required Documents');
      expect(html).toContain('Add Document');
      expect(html).toContain('Manage Categories');
      expect(html).toContain('All Categories');
      expect(html).toContain('Search document requirements...');
    });

    it('renders all default configurable categories as compact section cards', () => {
      const html = renderToStaticMarkup(<RequiredDocumentsManagement />);

      expect(html).toContain('Identity Proof');
      expect(html).toContain('Address Proof');
      expect(html).toContain('Educational Certificates');
      expect(html).toContain('Employment Documents');
      expect(html).toContain('Bank Documents');
      expect(html).toContain('Other Documents');
    });

    it('renders document items with Required/Optional, Active/Inactive, and meta chips', () => {
      const html = renderToStaticMarkup(<RequiredDocumentsManagement />);

      expect(html).toContain('Aadhaar Card / National ID');
      expect(html).toContain('Passport');
      expect(html).toContain('Permanent Address Proof');
      expect(html).toContain('Degree Certificate / Diploma');
      expect(html).toContain('Required');
      expect(html).toContain('Active');
      expect(html).toContain('Configure');
    });
  });

  describe('2. Add / Edit Document Popup', () => {
    it('renders Add Document popup with basic details, upload, and verification fields', () => {
      const html = renderToStaticMarkup(
        <AddEditDocumentModal
          isOpen={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
          editingDocument={null}
          categories={DEFAULT_DOCUMENT_CATEGORIES}
        />,
      );

      expect(html).toContain('Add Document Requirement');
      expect(html).toContain('Document Name');
      expect(html).toContain('Basic Details');
      expect(html).toContain('Upload Configuration');
      expect(html).toContain('Allowed File Formats');
      expect(html).toContain('.PDF');
      expect(html).toContain('.JPG');
      expect(html).toContain('Maximum File Size');
      expect(html).toContain('Allow Multiple Files');
      expect(html).toContain('Expiry Date Applicable');
      expect(html).toContain('Verification Configuration');
      expect(html).toContain('Verification Required');
      expect(html).toContain('Create Document');
    });

    it('renders Edit Document popup with populated values for editing', () => {
      const doc = DEFAULT_DOCUMENT_REQUIREMENTS[0]!;
      const html = renderToStaticMarkup(
        <AddEditDocumentModal
          isOpen={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
          editingDocument={doc}
          categories={DEFAULT_DOCUMENT_CATEGORIES}
        />,
      );

      expect(html).toContain('Edit Document Requirement');
      expect(html).toContain(doc.name);
      expect(html).toContain('Save Changes');
    });
  });

  describe('3. Applicability Rules Popup', () => {
    it('renders large applicability popup with employment types, departments, locations, and pipelines', () => {
      const doc = DEFAULT_DOCUMENT_REQUIREMENTS[0]!;
      const html = renderToStaticMarkup(
        <ApplicabilityRulesModal
          isOpen={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
          document={doc}
        />,
      );

      expect(html).toContain('Configure Applicability Rules');
      expect(html).toContain(doc.name);
      expect(html).toContain('Applicability Scope');
      expect(html).toContain('Pipeline &amp; Stage Assignment');
      expect(html).toContain('Apply Rules');
    });
  });

  describe('4. Manage Document Categories Popup', () => {
    it('renders category management modal with existing categories list and add form', () => {
      const html = renderToStaticMarkup(
        <ManageCategoriesModal
          isOpen={true}
          onClose={vi.fn()}
          categories={DEFAULT_DOCUMENT_CATEGORIES}
          documents={DEFAULT_DOCUMENT_REQUIREMENTS}
          onCreateCategory={vi.fn()}
          onUpdateCategory={vi.fn()}
          onDeleteCategory={vi.fn()}
          onReorderCategories={vi.fn()}
        />,
      );

      expect(html).toContain('Manage Document Categories');
      expect(html).toContain('Add New Category');
      expect(html).toContain('Existing Categories');
      expect(html).toContain('Identity Proof');
      expect(html).toContain('Address Proof');
      expect(html).toContain('Done');
    });
  });

  describe('5. Forms & Onboarding Tab Integration', () => {
    it('renders RequiredDocumentsManagement cleanly embedded in Forms & Onboarding tab', () => {
      const html = renderToStaticMarkup(<FormsOnboardingTab />);

      expect(html).toContain('Forms &amp; Onboarding');
      expect(html).toContain('Required Documents');
      expect(html).toContain('Identity Proof');
      expect(html).toContain('Aadhaar Card / National ID');
    });
  });
});
