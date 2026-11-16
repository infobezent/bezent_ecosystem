import { createDocument, type DocumentCategory } from '../../documents/api/documentsApi';
import type { RegistrationFormData } from '../types/registration.types';

/** Maps the registration form's document groups onto the Records document categories. */
export function toRecordCategory(group: string, name: string): DocumentCategory {
  switch (group) {
    case 'Identity & Government Documents':
      return 'personal_identity';
    case 'Address Proof Documents':
      return 'address_proof';
    case 'Educational Records':
      return 'education';
    case 'Professional History':
      return 'previous_employment';
    default:
      return /tax|pan|form\s*16|tds/i.test(name) ? 'tax_other' : 'bank_payroll';
  }
}

/**
 * After an employee is created during onboarding, files the documents that were
 * actually uploaded in the registration form into that employee's Records folder.
 * Returns how many could not be saved (the employee itself is already created).
 */
export async function syncRegistrationDocuments(
  employeeId: string,
  formData: RegistrationFormData,
): Promise<number> {
  const uploaded = formData.documents.items.filter((item) => (item as { file?: File | null }).file);
  const results = await Promise.allSettled(
    uploaded.map((item) =>
      createDocument({
        employeeId,
        category: toRecordCategory(item.category, item.name),
        documentName: item.name,
        documentNumber: item.docNumber.trim() || null,
      }),
    ),
  );
  return results.filter((r) => r.status === 'rejected').length;
}
