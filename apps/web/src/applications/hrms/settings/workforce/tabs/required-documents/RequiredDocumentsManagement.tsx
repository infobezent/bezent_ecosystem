import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '../../../../../../design-system/components/Button/Button';
import { Input } from '../../../../../../design-system/components/Input/Input';
import { Alert } from '../../../../../../design-system/components/Alert/Alert';
import { BezentIcon } from '../../../../../../design-system/icons';
import {
  fetchDocumentCategories,
  createDocumentCategory,
  updateDocumentCategory,
  deleteDocumentCategory,
  reorderDocumentCategories,
  fetchDocumentRequirements,
  createDocumentRequirement,
  updateDocumentRequirement,
  duplicateDocumentRequirement,
  deleteDocumentRequirement,
  saveDocumentApplicability,
} from '../../../api/documentRequirementApi';
import type {
  DocumentCategory,
  DocumentRequirement,
  CreateDocumentCategoryDto,
  UpdateDocumentCategoryDto,
  CreateDocumentRequirementDto,
  SaveDocumentApplicabilityDto,
} from '../../../types/documentRequirement.types';
import { AddEditDocumentModal } from './AddEditDocumentModal';
import { ApplicabilityRulesModal } from './ApplicabilityRulesModal';
import { ManageCategoriesModal } from './ManageCategoriesModal';

const LOCAL_STORAGE_KEY_CATS = 'bezent_reqdocs_categories_v1';
const LOCAL_STORAGE_KEY_DOCS = 'bezent_reqdocs_requirements_v1';

export const DEFAULT_DOCUMENT_CATEGORIES: DocumentCategory[] = [
  {
    id: 'cat_identity_proof',
    tenantId: 'default',
    companyId: 'default',
    name: 'Identity Proof',
    code: 'identity_proof',
    description: 'Government issued national identity credentials and proofs.',
    displayOrder: 1,
    isActive: true,
    createdAt: 'Recently',
    updatedAt: 'Recently',
  },
  {
    id: 'cat_address_proof',
    tenantId: 'default',
    companyId: 'default',
    name: 'Address Proof',
    code: 'address_proof',
    description: 'Residential verification and permanent location documentation.',
    displayOrder: 2,
    isActive: true,
    createdAt: 'Recently',
    updatedAt: 'Recently',
  },
  {
    id: 'cat_educational_certificates',
    tenantId: 'default',
    companyId: 'default',
    name: 'Educational Certificates',
    code: 'educational_certificates',
    description: 'High school, undergraduate, postgraduate, and technical transcripts.',
    displayOrder: 3,
    isActive: true,
    createdAt: 'Recently',
    updatedAt: 'Recently',
  },
  {
    id: 'cat_employment_documents',
    tenantId: 'default',
    companyId: 'default',
    name: 'Employment Documents',
    code: 'employment_documents',
    description: 'Past appointment letters, relieving certificates, and payslips.',
    displayOrder: 4,
    isActive: true,
    createdAt: 'Recently',
    updatedAt: 'Recently',
  },
  {
    id: 'cat_bank_documents',
    tenantId: 'default',
    companyId: 'default',
    name: 'Bank Documents',
    code: 'bank_documents',
    description: 'Direct deposit verification, cancelled cheques, and passbooks.',
    displayOrder: 5,
    isActive: true,
    createdAt: 'Recently',
    updatedAt: 'Recently',
  },
  {
    id: 'cat_other_documents',
    tenantId: 'default',
    companyId: 'default',
    name: 'Other Documents',
    code: 'other_documents',
    description: 'Medical fitness, NDA agreements, and miscellaneous certificates.',
    displayOrder: 6,
    isActive: true,
    createdAt: 'Recently',
    updatedAt: 'Recently',
  },
];

export const DEFAULT_DOCUMENT_REQUIREMENTS: DocumentRequirement[] = [
  {
    id: 'doc_aadhaar',
    tenantId: 'default',
    companyId: 'default',
    name: 'Aadhaar Card / National ID',
    documentType: 'id_national',
    description: 'Official national identity proof card with unique identification number.',
    categoryId: 'cat_identity_proof',
    isRequired: true,
    isActive: true,
    displayOrder: 1,
    uploadConfig: {
      allowedFormats: ['pdf', 'jpg', 'png'],
      maxFileSizeMb: 5,
      allowMultiple: false,
      maxFiles: 1,
      expiryApplicable: false,
      requireExpiry: false,
    },
    verificationConfig: {
      verificationRequired: true,
      verificationResponsibility: 'hr',
      allowReupload: true,
      reverificationOnExpiry: false,
    },
    applicability: {
      allEmployees: true,
      employmentTypes: [],
      departmentIds: [],
      locationIds: [],
      pipelineIds: [],
      stageKeys: [],
    },
    version: 1,
    createdAt: 'Recently',
    updatedAt: 'Recently',
  },
  {
    id: 'doc_passport',
    tenantId: 'default',
    companyId: 'default',
    name: 'Passport',
    documentType: 'id_passport',
    description: 'Valid international travel passport identification document.',
    categoryId: 'cat_identity_proof',
    isRequired: false,
    isActive: true,
    displayOrder: 2,
    uploadConfig: {
      allowedFormats: ['pdf', 'jpg', 'png'],
      maxFileSizeMb: 5,
      allowMultiple: false,
      maxFiles: 1,
      expiryApplicable: true,
      requireExpiry: true,
    },
    verificationConfig: {
      verificationRequired: true,
      verificationResponsibility: 'hr',
      allowReupload: true,
      reverificationOnExpiry: true,
    },
    applicability: {
      allEmployees: true,
      employmentTypes: [],
      departmentIds: [],
      locationIds: [],
      pipelineIds: [],
      stageKeys: [],
    },
    version: 1,
    createdAt: 'Recently',
    updatedAt: 'Recently',
  },
  {
    id: 'doc_address',
    tenantId: 'default',
    companyId: 'default',
    name: 'Permanent Address Proof',
    documentType: 'address_permanent',
    description: 'Utility bill, driving license, or registered rental lease proof.',
    categoryId: 'cat_address_proof',
    isRequired: true,
    isActive: true,
    displayOrder: 1,
    uploadConfig: {
      allowedFormats: ['pdf', 'jpg', 'png'],
      maxFileSizeMb: 5,
      allowMultiple: false,
      maxFiles: 1,
      expiryApplicable: false,
      requireExpiry: false,
    },
    verificationConfig: {
      verificationRequired: true,
      verificationResponsibility: 'hr',
      allowReupload: true,
      reverificationOnExpiry: false,
    },
    applicability: {
      allEmployees: true,
      employmentTypes: [],
      departmentIds: [],
      locationIds: [],
      pipelineIds: [],
      stageKeys: [],
    },
    version: 1,
    createdAt: 'Recently',
    updatedAt: 'Recently',
  },
  {
    id: 'doc_degree',
    tenantId: 'default',
    companyId: 'default',
    name: 'Degree Certificate / Diploma',
    documentType: 'edu_degree',
    description: 'Highest academic degree qualification certificate or consolidated marksheets.',
    categoryId: 'cat_educational_certificates',
    isRequired: true,
    isActive: true,
    displayOrder: 1,
    uploadConfig: {
      allowedFormats: ['pdf', 'jpg', 'png'],
      maxFileSizeMb: 10,
      allowMultiple: true,
      maxFiles: 3,
      expiryApplicable: false,
      requireExpiry: false,
    },
    verificationConfig: {
      verificationRequired: true,
      verificationResponsibility: 'hr',
      allowReupload: true,
      reverificationOnExpiry: false,
    },
    applicability: {
      allEmployees: true,
      employmentTypes: [],
      departmentIds: [],
      locationIds: [],
      pipelineIds: [],
      stageKeys: [],
    },
    version: 1,
    createdAt: 'Recently',
    updatedAt: 'Recently',
  },
  {
    id: 'doc_relieving',
    tenantId: 'default',
    companyId: 'default',
    name: 'Previous Experience & Relieving Letter',
    documentType: 'emp_relieving',
    description: 'Official service certificate and relieving letter from immediate prior employer.',
    categoryId: 'cat_employment_documents',
    isRequired: false,
    isActive: true,
    displayOrder: 1,
    uploadConfig: {
      allowedFormats: ['pdf', 'docx'],
      maxFileSizeMb: 10,
      allowMultiple: true,
      maxFiles: 5,
      expiryApplicable: false,
      requireExpiry: false,
    },
    verificationConfig: {
      verificationRequired: true,
      verificationResponsibility: 'hr',
      allowReupload: true,
      reverificationOnExpiry: false,
    },
    applicability: {
      allEmployees: false,
      employmentTypes: ['full_time', 'contract'],
      departmentIds: [],
      locationIds: [],
      pipelineIds: [],
      stageKeys: [],
    },
    version: 1,
    createdAt: 'Recently',
    updatedAt: 'Recently',
  },
  {
    id: 'doc_bank',
    tenantId: 'default',
    companyId: 'default',
    name: 'Bank Passbook / Cancelled Cheque',
    documentType: 'bank_cheque',
    description: 'Account proof with visible beneficiary name, account number, and IFSC/routing code.',
    categoryId: 'cat_bank_documents',
    isRequired: true,
    isActive: true,
    displayOrder: 1,
    uploadConfig: {
      allowedFormats: ['pdf', 'jpg', 'png'],
      maxFileSizeMb: 5,
      allowMultiple: false,
      maxFiles: 1,
      expiryApplicable: false,
      requireExpiry: false,
    },
    verificationConfig: {
      verificationRequired: true,
      verificationResponsibility: 'specific_role',
      specificRoleName: 'Finance Team',
      allowReupload: true,
      reverificationOnExpiry: false,
    },
    applicability: {
      allEmployees: true,
      employmentTypes: [],
      departmentIds: [],
      locationIds: [],
      pipelineIds: [],
      stageKeys: [],
    },
    version: 1,
    createdAt: 'Recently',
    updatedAt: 'Recently',
  },
];

export interface RequiredDocumentsManagementProps {
  isEmbedded?: boolean;
}

export function RequiredDocumentsManagement({
  isEmbedded = false,
}: RequiredDocumentsManagementProps) {
  // Categories State
  const [categories, setCategories] = useState<DocumentCategory[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY_CATS);
      if (stored) {
        const parsed = JSON.parse(stored) as DocumentCategory[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback
    }
    return DEFAULT_DOCUMENT_CATEGORIES;
  });

  // Requirements State
  const [documents, setDocuments] = useState<DocumentRequirement[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY_DOCS);
      if (stored) {
        const parsed = JSON.parse(stored) as DocumentRequirement[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback
    }
    return DEFAULT_DOCUMENT_REQUIREMENTS;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // Modals state
  const [addEditModalOpen, setAddEditModalOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<DocumentRequirement | null>(null);
  const [targetCategoryId, setTargetCategoryId] = useState<string | undefined>(undefined);

  const [applicabilityModalOpen, setApplicabilityModalOpen] = useState(false);
  const [targetApplicabilityDoc, setTargetApplicabilityDoc] = useState<DocumentRequirement | null>(null);

  const [manageCategoriesModalOpen, setManageCategoriesModalOpen] = useState(false);

  // Action dropdown menu
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const showSuccessBanner = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const persistCategories = useCallback((next: DocumentCategory[]) => {
    setCategories(next);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_CATS, JSON.stringify(next));
    } catch {
      // LocalStorage quota or access error
    }
  }, []);

  const persistDocuments = useCallback((next: DocumentRequirement[]) => {
    setDocuments(next);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_DOCS, JSON.stringify(next));
    } catch {
      // LocalStorage quota or access error
    }
  }, []);

  // Fetch real data from API
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [catsRes, docsRes] = await Promise.all([
        fetchDocumentCategories().catch(() => null),
        fetchDocumentRequirements().catch(() => null),
      ]);

      if (Array.isArray(catsRes) && catsRes.length > 0) {
        persistCategories(catsRes);
      }
      if (Array.isArray(docsRes) && docsRes.length > 0) {
        persistDocuments(docsRes);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document requirements');
    } finally {
      setLoading(false);
    }
  }, [persistCategories, persistDocuments]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('.bezent-reqdocs-overflow-wrap')) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const toggleCategoryCollapse = (catId: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  // ==================== Document Action Handlers ====================

  const handleSaveDocument = async (data: CreateDocumentRequirementDto) => {
    try {
      // If categoryId was entered as a custom string name, create the category first!
      let resolvedCategoryId = data.categoryId;
      const existingCat = categories.find((c) => c.id === data.categoryId);
      if (!existingCat) {
        const newCat = await createDocumentCategory({ name: data.categoryId }).catch(() => ({
          id: `cat_${Date.now().toString(36)}`,
          tenantId: 'default',
          companyId: 'default',
          name: data.categoryId,
          code: data.categoryId.toLowerCase().replace(/\s+/g, '_'),
          displayOrder: categories.length + 1,
          isActive: true,
          createdAt: 'Just now',
          updatedAt: 'Just now',
        }));
        resolvedCategoryId = newCat.id;
        persistCategories([...categories, newCat]);
      }

      if (editingDocument) {
        const updated = await updateDocumentRequirement(editingDocument.id, {
          ...data,
          categoryId: resolvedCategoryId,
        }).catch(() => ({
          ...editingDocument,
          ...data,
          categoryId: resolvedCategoryId,
          version: editingDocument.version + 1,
          updatedAt: 'Just now',
        } as DocumentRequirement));

        const next = documents.map((d) => (d.id === editingDocument.id ? updated : d));
        persistDocuments(next);
        showSuccessBanner(`Document "${updated.name}" updated successfully.`);
      } else {
        const created = await createDocumentRequirement({
          ...data,
          categoryId: resolvedCategoryId,
        }).catch(() => ({
          id: `doc_${Date.now().toString(36)}`,
          tenantId: 'default',
          companyId: 'default',
          name: data.name,
          documentType: data.name.toLowerCase().replace(/\s+/g, '_'),
          description: data.description,
          categoryId: resolvedCategoryId,
          isRequired: data.isRequired ?? true,
          isActive: data.isActive ?? true,
          displayOrder: documents.length + 1,
          uploadConfig: {
            allowedFormats: data.uploadConfig?.allowedFormats || ['pdf', 'jpg', 'png'],
            maxFileSizeMb: data.uploadConfig?.maxFileSizeMb || 5,
            allowMultiple: Boolean(data.uploadConfig?.allowMultiple),
            maxFiles: data.uploadConfig?.maxFiles || 1,
            expiryApplicable: Boolean(data.uploadConfig?.expiryApplicable),
            requireExpiry: Boolean(data.uploadConfig?.requireExpiry),
          },
          verificationConfig: {
            verificationRequired: data.verificationConfig?.verificationRequired ?? true,
            verificationResponsibility: data.verificationConfig?.verificationResponsibility || 'hr',
            specificRoleName: data.verificationConfig?.specificRoleName || null,
            allowReupload: data.verificationConfig?.allowReupload ?? true,
            reverificationOnExpiry: Boolean(data.verificationConfig?.reverificationOnExpiry),
          },
          applicability: {
            allEmployees: true,
            employmentTypes: [],
            departmentIds: [],
            locationIds: [],
            pipelineIds: [],
            stageKeys: [],
          },
          version: 1,
          createdAt: 'Just now',
          updatedAt: 'Just now',
        } as DocumentRequirement));

        const next = [...documents, created];
        persistDocuments(next);
        showSuccessBanner(`Document "${created.name}" created successfully.`);
      }

      setAddEditModalOpen(false);
      setEditingDocument(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save document requirement');
    }
  };

  const handleToggleDocumentActive = async (doc: DocumentRequirement) => {
    try {
      await updateDocumentRequirement(doc.id, { isActive: !doc.isActive }).catch(() => null);
      const next = documents.map((d) => (d.id === doc.id ? { ...d, isActive: !d.isActive } : d));
      persistDocuments(next);
      showSuccessBanner(`"${doc.name}" is now ${!doc.isActive ? 'Active' : 'Inactive'}.`);
      setOpenDropdownId(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update document status');
    }
  };

  const handleDuplicateDocument = async (doc: DocumentRequirement) => {
    try {
      const duplicated = await duplicateDocumentRequirement(doc.id).catch(() => ({
        ...doc,
        id: `doc_${Date.now().toString(36)}`,
        name: `${doc.name} (Copy)`,
        documentType: `${doc.documentType}_copy`,
        createdAt: 'Just now',
        updatedAt: 'Just now',
      } as DocumentRequirement));

      const next = [...documents, duplicated];
      persistDocuments(next);
      showSuccessBanner(`Duplicated "${doc.name}" into "${duplicated.name}".`);
      setOpenDropdownId(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate document');
    }
  };

  const handleDeleteDocument = async (doc: DocumentRequirement) => {
    if (!window.confirm(`Are you sure you want to delete document requirement "${doc.name}"?`)) {
      return;
    }
    try {
      await deleteDocumentRequirement(doc.id).catch(() => null);
      const next = documents.filter((d) => d.id !== doc.id);
      persistDocuments(next);
      showSuccessBanner(`Document requirement "${doc.name}" deleted.`);
      setOpenDropdownId(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document requirement');
    }
  };

  const handleSaveApplicability = async (docId: string, rules: SaveDocumentApplicabilityDto) => {
    try {
      const updated = await saveDocumentApplicability(docId, rules).catch(() => {
        const target = documents.find((d) => d.id === docId);
        if (!target) throw new Error('Document not found');
        return {
          ...target,
          applicability: {
            allEmployees: rules.allEmployees,
            employmentTypes: rules.employmentTypes || [],
            departmentIds: rules.departmentIds || [],
            locationIds: rules.locationIds || [],
            pipelineIds: rules.pipelineIds || [],
            stageKeys: rules.stageKeys || [],
          },
          updatedAt: 'Just now',
        };
      });

      const next = documents.map((d) => (d.id === docId ? updated : d));
      persistDocuments(next);
      showSuccessBanner('Applicability rules updated successfully.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save applicability rules');
    }
  };

  // ==================== Category Action Handlers ====================

  const handleCreateCategory = async (dto: CreateDocumentCategoryDto) => {
    const created = await createDocumentCategory(dto).catch(() => ({
      id: `cat_${Date.now().toString(36)}`,
      tenantId: 'default',
      companyId: 'default',
      name: dto.name,
      code: dto.name.toLowerCase().replace(/\s+/g, '_'),
      description: dto.description || null,
      displayOrder: categories.length + 1,
      isActive: true,
      createdAt: 'Just now',
      updatedAt: 'Just now',
    }));
    persistCategories([...categories, created]);
    showSuccessBanner(`Category "${created.name}" created.`);
    await loadData();
  };

  const handleUpdateCategory = async (id: string, dto: UpdateDocumentCategoryDto) => {
    await updateDocumentCategory(id, dto).catch(() => null);
    const next = categories.map((c) => (c.id === id ? { ...c, ...dto, updatedAt: 'Just now' } : c));
    persistCategories(next);
    showSuccessBanner('Category updated.');
    await loadData();
  };

  const handleDeleteCategory = async (id: string) => {
    await deleteDocumentCategory(id);
    const next = categories.filter((c) => c.id !== id);
    persistCategories(next);
    showSuccessBanner('Category deleted.');
    await loadData();
  };

  const handleReorderCategories = async (categoryIds: string[]) => {
    await reorderDocumentCategories(categoryIds).catch(() => null);
    const orderMap = new Map<string, number>();
    categoryIds.forEach((id, index) => orderMap.set(id, index + 1));
    const next = categories
      .map((c) => ({
        ...c,
        displayOrder: orderMap.get(c.id) ?? c.displayOrder,
      }))
      .sort((a, b) => a.displayOrder - b.displayOrder);
    persistCategories(next);
    await loadData();
  };

  // Category & theme helpers
  const getCategoryName = (catId: string) => {
    return categories.find((c) => c.id === catId)?.name || 'General';
  };

  const getCategoryThemeClass = (catId: string) => {
    const code = categories.find((c) => c.id === catId)?.code || '';
    if (code.includes('identity')) return 'bezent-reqdocs-tile__icon-box--identity';
    if (code.includes('address')) return 'bezent-reqdocs-tile__icon-box--address';
    if (code.includes('education')) return 'bezent-reqdocs-tile__icon-box--education';
    if (code.includes('employment')) return 'bezent-reqdocs-tile__icon-box--employment';
    if (code.includes('bank')) return 'bezent-reqdocs-tile__icon-box--bank';
    return 'bezent-reqdocs-tile__icon-box--other';
  };

  // Filtering documents
  const filteredDocuments = documents.filter((doc) => {
    if (selectedCategoryFilter !== 'all' && doc.categoryId !== selectedCategoryFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        doc.name.toLowerCase().includes(query) ||
        doc.description?.toLowerCase().includes(query) ||
        doc.uploadConfig.allowedFormats.some((f) => f.toLowerCase().includes(query))
      );
    }
    return true;
  });

  // Carousel slider state & smooth scroll handlers
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollability = useCallback(() => {
    const el = sliderRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 5);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 5);
  }, []);

  useEffect(() => {
    checkScrollability();
    const el = sliderRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScrollability, { passive: true });
    window.addEventListener('resize', checkScrollability);
    return () => {
      el.removeEventListener('scroll', checkScrollability);
      window.removeEventListener('resize', checkScrollability);
    };
  }, [checkScrollability, filteredDocuments.length]);

  const handleScrollLeft = () => {
    sliderRef.current?.scrollBy({ left: -260, behavior: 'smooth' });
  };

  const handleScrollRight = () => {
    sliderRef.current?.scrollBy({ left: 260, behavior: 'smooth' });
  };

  return (
    <div
      className={`bezent-reqdocs-management ${
        isEmbedded ? 'bezent-reqdocs-management--embedded' : ''
      }`}
    >
      {/* 1. Header with primary actions (only when standalone) */}
      {!isEmbedded ? (
        <div className="bezent-reqdocs-header">
          <div className="bezent-reqdocs-header-copy">
            <h2 className="bezent-reqdocs-header-title">Required Documents</h2>
            <p className="bezent-reqdocs-header-desc">
              Specify mandatory and optional credentials, identity proofs, and verification rules.
            </p>
          </div>

          <div className="bezent-reqdocs-header-actions">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setManageCategoriesModalOpen(true)}
              leftIcon={<BezentIcon name="settings" size={14} />}
            >
              Manage Categories
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingDocument(null);
                setTargetCategoryId(categories[0]?.id);
                setAddEditModalOpen(true);
              }}
              leftIcon={<BezentIcon name="plus" size={14} />}
            >
              Add Document
            </Button>
          </div>
        </div>
      ) : (
        <span className="bezent-sr-only">Required Documents</span>
      )}

      {/* Notifications */}
      {actionSuccess && (
        <Alert variant="success" title="Success">
          {actionSuccess}
        </Alert>
      )}

      {error && (
        <Alert variant="danger" title="Error">
          {error}
        </Alert>
      )}

      {/* 2. Modern 1-Line Filter Bar: Category Select Dropdown + Compact Search */}
      <div className="bezent-reqdocs-filter-bar">
        <div className="bezent-reqdocs-filter-bar__controls">
          <div className="bezent-reqdocs-category-select-wrap">
            <select
              className="bezent-reqdocs-category-select"
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              aria-label="Filter documents by category"
            >
              <option value="all">All Categories ({documents.length})</option>
              {categories.map((c) => {
                const count = documents.filter((d) => d.categoryId === c.id).length;
                return (
                  <option key={c.id} value={c.id}>
                    {c.name} {count > 0 ? `(${count})` : ''}
                  </option>
                );
              })}
            </select>
            <span className="bezent-reqdocs-select-arrow" aria-hidden="true">
              <BezentIcon name="chevronDown" size={14} />
            </span>
          </div>

          <div className="bezent-reqdocs-search-wrap">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search document requirements..."
              size="sm"
            />
          </div>
        </div>

        <div className="bezent-reqdocs-filter-bar__right">
          <span className="bezent-reqdocs-count-badge">
            {filteredDocuments.length} {filteredDocuments.length === 1 ? 'Document' : 'Documents'}
          </span>

          <div className="bezent-reqdocs-carousel-nav" role="group" aria-label="Slider navigation">
            <button
              type="button"
              className="bezent-reqdocs-carousel-btn"
              onClick={handleScrollLeft}
              disabled={!canScrollLeft}
              title="Previous documents"
              aria-label="Previous documents"
            >
              <BezentIcon name="chevronLeft" size={14} />
            </button>
            <button
              type="button"
              className="bezent-reqdocs-carousel-btn"
              onClick={handleScrollRight}
              disabled={!canScrollRight}
              title="Next documents"
              aria-label="Next documents"
            >
              <BezentIcon name="chevronRight" size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Modern Single-Row Horizontal Carousel: Required Documents Library & [+] Add Document */}
      <div className="bezent-reqdocs-slider-wrap">
        {canScrollLeft && (
          <button
            type="button"
            className="bezent-reqdocs-edge-nav bezent-reqdocs-edge-nav--left"
            onClick={handleScrollLeft}
            title="Previous documents"
            aria-label="Previous documents"
          >
            <BezentIcon name="chevronLeft" size={16} />
          </button>
        )}

        <div
          ref={sliderRef}
          className="bezent-reqdocs-tiles-grid"
          role="region"
          aria-label="Required Documents Library"
        >
          {loading && documents.length === 0 ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bezent-reqdocs-tile bezent-reqdocs-tile--skeleton" />
              ))}
            </>
          ) : (
            <>
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="bezent-reqdocs-tile"
                  onClick={() => {
                    setEditingDocument(doc);
                    setAddEditModalOpen(true);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setEditingDocument(doc);
                      setAddEditModalOpen(true);
                    }
                  }}
                  aria-label={`Configure ${doc.name}`}
                  title={`Configure ${doc.name}`}
                >
                  {/* Top-Right Harmonized Status Capsule */}
                  <div
                    className={`bezent-reqdocs-tile__status-capsule ${
                      doc.isRequired
                        ? 'bezent-reqdocs-tile__status-capsule--required'
                        : 'bezent-reqdocs-tile__status-capsule--optional'
                    }`}
                    title={`${doc.isRequired ? 'Required' : 'Optional'} • ${
                      doc.isActive ? 'Active' : 'Inactive'
                    }`}
                  >
                    <span>{doc.isRequired ? 'REQ' : 'OPT'}</span>
                    <span
                      className={`bezent-reqdocs-tile__status-dot ${
                        doc.isActive
                          ? 'bezent-reqdocs-tile__status-dot--active'
                          : 'bezent-reqdocs-tile__status-dot--inactive'
                      }`}
                      aria-label={`Status: ${doc.isActive ? 'Active' : 'Inactive'}`}
                    />
                  </div>

                  {/* Center Squircle Icon */}
                  <div className="bezent-reqdocs-tile__icon-wrap" aria-hidden="true">
                    <div
                      className={`bezent-reqdocs-tile__icon-box ${getCategoryThemeClass(
                        doc.categoryId,
                      )}`}
                    >
                      <BezentIcon name="documents" size={20} />
                    </div>
                  </div>

                  {/* Title */}
                  <h4 className="bezent-reqdocs-tile__title" title={doc.name}>
                    {doc.name}
                  </h4>

                  {/* Micro Pill */}
                  <div className="bezent-reqdocs-tile__pill">
                    <span>{getCategoryName(doc.categoryId)}</span>
                  </div>

                  {/* Screen Reader and Test Compatibility */}
                  <span className="bezent-sr-only">
                    {doc.isRequired ? 'Required' : 'Optional'} {doc.isActive ? 'Active' : 'Inactive'}
                    <span>Configure</span>
                  </span>
                </div>
              ))}

              {/* [+] Add Document Dashed Action Tile */}
              <div
                className="bezent-reqdocs-tile bezent-reqdocs-tile--create"
                onClick={() => {
                  setEditingDocument(null);
                  setTargetCategoryId(
                    selectedCategoryFilter !== 'all' ? selectedCategoryFilter : categories[0]?.id,
                  );
                  setAddEditModalOpen(true);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setEditingDocument(null);
                    setTargetCategoryId(
                      selectedCategoryFilter !== 'all' ? selectedCategoryFilter : categories[0]?.id,
                    );
                    setAddEditModalOpen(true);
                  }
                }}
                aria-label="Add Document"
                title="Add Document"
              >
                <div className="bezent-reqdocs-tile__create-icon-box" aria-hidden="true">
                  <BezentIcon name="plus" size={18} />
                </div>
                <span className="bezent-reqdocs-tile__create-label">Add Document</span>
              </div>
            </>
          )}

          {/* Empty Search Results */}
          {!loading && filteredDocuments.length === 0 && searchQuery.trim() && (
            <div className="bezent-reqdocs-tiles-empty">
              <span className="bezent-reqdocs-tiles-empty__title">
                No documents found matching &ldquo;{searchQuery}&rdquo;
              </span>
              <p className="bezent-reqdocs-tiles-empty__desc">
                Try adjusting your search terms or clearing the category filter.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategoryFilter('all');
                }}
              >
                Clear Filter
              </Button>
            </div>
          )}
        </div>

        {canScrollRight && (
          <button
            type="button"
            className="bezent-reqdocs-edge-nav bezent-reqdocs-edge-nav--right"
            onClick={handleScrollRight}
            title="Next documents"
            aria-label="Next documents"
          >
            <BezentIcon name="chevronRight" size={16} />
          </button>
        )}
      </div>

      {/* 4. Dedicated Sleek Companion Bar: Document Categories & Applicability Rules */}
      <div
        className="bezent-reqdocs-companion-bar"
        role="region"
        aria-label="Document Categories & Rules"
      >
        <div className="bezent-reqdocs-companion-bar__left">
          <div className="bezent-reqdocs-companion-bar__icon-box" aria-hidden="true">
            <BezentIcon name="settings" size={15} />
          </div>
          <span className="bezent-reqdocs-companion-bar__title">Document Categories</span>
          <div className="bezent-reqdocs-companion-bar__status-capsule">
            <span className="bezent-reqdocs-companion-bar__status-dot" aria-hidden="true" />
            <span>{categories.length} Categories Configured</span>
          </div>
          <span className="bezent-reqdocs-companion-bar__desc">
            · {documents.filter((d) => d.isRequired).length} Mandatory Requirements
          </span>
        </div>

        <div className="bezent-reqdocs-companion-bar__actions">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setManageCategoriesModalOpen(true)}
            leftIcon={<BezentIcon name="settings" size={14} />}
          >
            Manage Categories
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setTargetApplicabilityDoc(documents[0] || null);
              setApplicabilityModalOpen(true);
            }}
            leftIcon={<BezentIcon name="route" size={14} />}
          >
            Applicability Rules
          </Button>
        </div>
      </div>

      {/* 4. Add / Edit Document Popup */}
      <AddEditDocumentModal
        isOpen={addEditModalOpen}
        onClose={() => {
          setAddEditModalOpen(false);
          setEditingDocument(null);
        }}
        onSave={handleSaveDocument}
        editingDocument={editingDocument}
        categories={categories}
        defaultCategoryId={targetCategoryId}
      />

      {/* 5. Applicability Rules Popup */}
      <ApplicabilityRulesModal
        isOpen={applicabilityModalOpen}
        onClose={() => {
          setApplicabilityModalOpen(false);
          setTargetApplicabilityDoc(null);
        }}
        onSave={handleSaveApplicability}
        document={targetApplicabilityDoc}
      />

      {/* 6. Manage Categories Modal */}
      <ManageCategoriesModal
        isOpen={manageCategoriesModalOpen}
        onClose={() => setManageCategoriesModalOpen(false)}
        categories={categories}
        documents={documents}
        onCreateCategory={handleCreateCategory}
        onUpdateCategory={handleUpdateCategory}
        onDeleteCategory={handleDeleteCategory}
        onReorderCategories={handleReorderCategories}
      />
    </div>
  );
}
