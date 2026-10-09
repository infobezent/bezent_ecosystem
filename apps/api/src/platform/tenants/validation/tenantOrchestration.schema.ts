import { ValidationError } from '../../../app/errors/AppError.js';

export interface Step1CompanyInfo {
  legalName: string;
  displayName: string;
  businessEmail: string;
  country: string;
  timeZone: string;
  logoUrl?: string | null;
  contactPhone?: string | null;
  website?: string | null;
  industry?: string | null;
  companySize?: string | null;
  state?: string | null;
  city?: string | null;
  postalCode?: string | null;
  address?: string | null;
  registrationNumber?: string | null;
  taxIdentifier?: string | null;
  code?: string | null;
}

export interface Step2PrimaryAdminInfo {
  fullName: string;
  workEmail: string;
  phone?: string | null;
  jobTitle?: string | null;
}

export interface Step3ModuleOverride {
  moduleCode: string;
  overrideType: 'enable' | 'disable' | 'limit';
  reason: string;
  overrideValue?: Record<string, unknown> | null;
}

export interface Step3SubscriptionItem {
  applicationCode: 'hrms' | 'crm' | 'project_management';
  planId: string;
  accessMode?: 'trial' | 'paid';
  licensedSeats?: number;
  billingCycle?: 'monthly' | 'quarterly' | 'annual';
  scheduledActivationAt?: string | null;
  commercialAgreementNotes?: string | null;
  selectedModules?: string[];
  moduleOverrides?: Step3ModuleOverride[];
}

export interface TenantOrchestrationDto {
  id?: string | null;
  tenantId?: string | null;
  company: Step1CompanyInfo;
  admin: Step2PrimaryAdminInfo;
  subscriptions: Step3SubscriptionItem[];
  idempotencyKey?: string | null;
}

export interface TenantOrchestrationPreflightResult {
  valid: boolean;
  tenantSetupPolicy: 'ready_to_create' | 'pending_setup';
  warnings: string[];
  summary: {
    companyName: string;
    tenantName: string;
    primaryCompanyName: string;
    adminEmail: string;
    selectedApplications: string[];
    applicationsCount: number;
    subscriptions: Array<{
      applicationCode: string;
      planId: string;
      accessMode: 'trial' | 'paid';
      seats: number;
      modulesCount?: number;
      selectedModules?: string[];
      overridesCount?: number;
    }>;
  };
}

function isValidIanaTimeZone(tz: string): boolean {
  if (!tz || typeof tz !== 'string') return false;
  try {
    if (typeof Intl !== 'undefined' && typeof Intl.supportedValuesOf === 'function') {
      const supported = Intl.supportedValuesOf('timeZone');
      if (supported.includes(tz)) return true;
    }
    // Fallback: format with Intl.DateTimeFormat
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateTenantOrchestration(data: unknown): TenantOrchestrationDto {
  if (!data || typeof data !== 'object') {
    throw new ValidationError('Request body must be a JSON object');
  }

  const raw = data as Record<string, any>;
  const errors: Record<string, string> = {};

  // 1. Company Information Validation
  if (!raw.company || typeof raw.company !== 'object') {
    errors['company'] = 'Company information is required';
  }

  const comp = raw.company || {};
  if (!comp.legalName || typeof comp.legalName !== 'string' || comp.legalName.trim().length < 2) {
    errors['company.legalName'] = 'Legal name must be at least 2 characters';
  }
  if (!comp.displayName || typeof comp.displayName !== 'string' || comp.displayName.trim().length < 2) {
    errors['company.displayName'] = 'Display name must be at least 2 characters';
  }
  if (!comp.businessEmail || typeof comp.businessEmail !== 'string' || !isValidEmail(comp.businessEmail.trim())) {
    errors['company.businessEmail'] = 'A valid business email is required';
  }
  if (!comp.country || typeof comp.country !== 'string' || comp.country.trim().length < 2) {
    errors['company.country'] = 'Country is required';
  }
  
  const rawTimeZone = comp.timeZone || comp.timezone;
  if (!rawTimeZone || typeof rawTimeZone !== 'string' || !isValidIanaTimeZone(rawTimeZone.trim())) {
    errors['company.timeZone'] = 'Invalid IANA timezone (e.g., America/New_York, UTC, Asia/Kolkata)';
  }

  // 2. Primary Administrator Validation
  const adm = raw.admin || raw.primaryAdmin || null;
  if (!adm || typeof adm !== 'object') {
    errors['admin'] = 'Primary administrator information is required';
  }

  const admObj = adm || {};
  const admFullName = admObj.fullName || admObj.name;
  if (!admFullName || typeof admFullName !== 'string' || admFullName.trim().length < 2) {
    errors['admin.fullName'] = 'Administrator full name must be at least 2 characters';
  }
  const admWorkEmail = admObj.workEmail || admObj.email;
  if (!admWorkEmail || typeof admWorkEmail !== 'string' || !isValidEmail(admWorkEmail.trim())) {
    errors['admin.workEmail'] = 'A valid work email is required for the administrator';
  }

  // 3. Subscriptions / Applications Validation
  const rawSubs = raw.subscriptions !== undefined ? raw.subscriptions : raw.applications;
  const subscriptions: Step3SubscriptionItem[] = [];
  if (rawSubs !== undefined) {
    if (!Array.isArray(rawSubs)) {
      errors['subscriptions'] = 'Subscriptions must be an array';
    } else {
      const seenApps = new Set<string>();
      for (let i = 0; i < rawSubs.length; i++) {
        const item = rawSubs[i];
        if (!item || typeof item !== 'object') {
          errors[`subscriptions[${i}]`] = 'Subscription item must be an object';
          continue;
        }

        const validApps = ['hrms', 'crm', 'project_management'];
        if (!item.applicationCode || !validApps.includes(item.applicationCode)) {
          errors[`subscriptions[${i}].applicationCode`] = `Application code must be one of: ${validApps.join(', ')}`;
        } else if (seenApps.has(item.applicationCode)) {
          errors[`subscriptions[${i}].applicationCode`] = `Duplicate application subscription for '${item.applicationCode}'`;
        } else {
          seenApps.add(item.applicationCode);
        }

        if (!item.planId || typeof item.planId !== 'string' || item.planId.trim().length === 0) {
          errors[`subscriptions[${i}].planId`] = 'Plan ID is required';
        }

        const accessMode = item.accessMode || (item.isTrial ? 'trial' : 'paid');
        if (accessMode && !['trial', 'paid'].includes(accessMode)) {
          errors[`subscriptions[${i}].accessMode`] = "Access mode must be 'trial' or 'paid'";
        }

        const seats = item.licensedSeats ?? item.seats;
        if (seats !== undefined && (!Number.isInteger(seats) || seats < 1)) {
          errors[`subscriptions[${i}].licensedSeats`] = 'Licensed seats must be a positive integer';
        }

        if (item.billingCycle && !['monthly', 'quarterly', 'annual'].includes(item.billingCycle)) {
          errors[`subscriptions[${i}].billingCycle`] = "Billing cycle must be 'monthly', 'quarterly', or 'annual'";
        }

        if (item.scheduledActivationAt) {
          const d = new Date(item.scheduledActivationAt);
          if (isNaN(d.getTime())) {
            errors[`subscriptions[${i}].scheduledActivationAt`] = 'Invalid scheduled activation date';
          }
        }

        let selectedModules: string[] | undefined;
        if (item.selectedModules !== undefined) {
          if (!Array.isArray(item.selectedModules)) {
            errors[`subscriptions[${i}].selectedModules`] = 'selectedModules must be an array of module keys';
          } else {
            const seenMods = new Set<string>();
            selectedModules = [];
            for (const m of item.selectedModules) {
              if (typeof m !== 'string' || !m.trim()) {
                errors[`subscriptions[${i}].selectedModules`] = 'Module key in selectedModules must be a non-empty string';
                break;
              }
              const trimmed = m.trim();
              if (seenMods.has(trimmed)) {
                errors[`subscriptions[${i}].selectedModules`] = `Duplicate module '${trimmed}' in selectedModules for '${item.applicationCode}'`;
                break;
              }
              seenMods.add(trimmed);
              selectedModules.push(trimmed);
            }
          }
        }

        let moduleOverrides: Step3ModuleOverride[] | undefined;
        if (item.moduleOverrides !== undefined) {
          if (!Array.isArray(item.moduleOverrides)) {
            errors[`subscriptions[${i}].moduleOverrides`] = 'moduleOverrides must be an array';
          } else {
            const seenOvrMods = new Set<string>();
            moduleOverrides = [];
            for (let j = 0; j < item.moduleOverrides.length; j++) {
              const ovr = item.moduleOverrides[j];
              if (!ovr || typeof ovr !== 'object') {
                errors[`subscriptions[${i}].moduleOverrides[${j}]`] = 'Override item must be an object';
                continue;
              }
              if (!ovr.moduleCode || typeof ovr.moduleCode !== 'string' || !ovr.moduleCode.trim()) {
                errors[`subscriptions[${i}].moduleOverrides[${j}].moduleCode`] = 'Module code is required for override';
              }
              const validTypes = ['enable', 'disable', 'limit'];
              if (!ovr.overrideType || !validTypes.includes(ovr.overrideType)) {
                errors[`subscriptions[${i}].moduleOverrides[${j}].overrideType`] = "Override type must be 'enable', 'disable', or 'limit'";
              }
              if (!ovr.reason || typeof ovr.reason !== 'string' || ovr.reason.trim().length < 3) {
                errors[`subscriptions[${i}].moduleOverrides[${j}].reason`] = 'Override reason is required (min 3 characters)';
              }
              if (ovr.moduleCode && seenOvrMods.has(ovr.moduleCode.trim())) {
                errors[`subscriptions[${i}].moduleOverrides[${j}].moduleCode`] = `Duplicate override for module '${ovr.moduleCode.trim()}'`;
              } else if (ovr.moduleCode) {
                seenOvrMods.add(ovr.moduleCode.trim());
              }

              moduleOverrides.push({
                moduleCode: String(ovr.moduleCode || '').trim(),
                overrideType: ovr.overrideType,
                reason: String(ovr.reason || '').trim(),
                overrideValue: ovr.overrideValue && typeof ovr.overrideValue === 'object' ? ovr.overrideValue : null,
              });
            }
          }
        }

        const commercialAgreementNotes =
          typeof item.commercialAgreementNotes === 'string' && item.commercialAgreementNotes.trim().length > 0
            ? item.commercialAgreementNotes.trim()
            : null;

        subscriptions.push({
          applicationCode: item.applicationCode,
          planId: String(item.planId).trim(),
          accessMode,
          licensedSeats: seats ? Number(seats) : undefined,
          billingCycle: item.billingCycle || 'monthly',
          scheduledActivationAt: item.scheduledActivationAt ? new Date(item.scheduledActivationAt).toISOString() : null,
          commercialAgreementNotes,
          selectedModules,
          moduleOverrides,
        });
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed for tenant orchestration request', errors);
  }

  return {
    id: raw.id ? String(raw.id).trim() : raw.tenantId ? String(raw.tenantId).trim() : null,
    company: {
      legalName: comp.legalName.trim(),
      displayName: comp.displayName.trim(),
      businessEmail: comp.businessEmail.trim().toLowerCase(),
      country: comp.country.trim(),
      timeZone: rawTimeZone.trim(),
      logoUrl: comp.logoUrl ? String(comp.logoUrl).trim() : null,
      contactPhone: (comp.contactPhone || comp.phone) ? String(comp.contactPhone || comp.phone).trim() : null,
      website: comp.website ? String(comp.website).trim() : null,
      industry: comp.industry ? String(comp.industry).trim() : null,
      companySize: comp.companySize ? String(comp.companySize).trim() : null,
      state: comp.state ? String(comp.state).trim() : null,
      city: comp.city ? String(comp.city).trim() : null,
      postalCode: comp.postalCode ? String(comp.postalCode).trim() : null,
      address: comp.address ? String(comp.address).trim() : null,
      registrationNumber: comp.registrationNumber ? String(comp.registrationNumber).trim() : null,
      taxIdentifier: comp.taxIdentifier ? String(comp.taxIdentifier).trim() : null,
      code: comp.code ? String(comp.code).trim().toUpperCase() : null,
    },
    admin: {
      fullName: admFullName.trim(),
      workEmail: admWorkEmail.trim().toLowerCase(),
      phone: admObj.phone ? String(admObj.phone).trim() : null,
      jobTitle: admObj.jobTitle ? String(admObj.jobTitle).trim() : null,
    },
    subscriptions,
    idempotencyKey: raw.idempotencyKey ? String(raw.idempotencyKey).trim() : null,
  };
}
