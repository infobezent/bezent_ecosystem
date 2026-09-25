import { EmployeeRepository, type DbExecutor } from '../repository/employee.repository.js';
import { EmployeeProfileRepository, type Tx } from '../repository/employeeProfile.repository.js';
import {
  validateEmployeeRecordDetails,
  validateEmployeeRecordSection,
} from '../validation/employeeProfile.schema.js';
import {
  EMPLOYEE_RECORD_SECTIONS,
  type EmployeeProfile,
  type EmployeeRecordDetailsInput,
  type EmployeeRecordSection,
  type Proficiency,
  type SkillInput,
  type Weekday,
} from '../types/employeeProfile.types.js';
import { BadRequestError, NotFoundError } from '../../../../app/errors/AppError.js';

const SKILL_PEOPLE_FIELDS = [
  'examinerEmployeeId',
  'verifiedByEmployeeId',
  'mentorEmployeeId',
] as const satisfies readonly (keyof SkillInput)[];

/** Masks all but the last four characters of an account number. */
export function maskAccountNumber(accountNumber: string): string {
  return `••••${accountNumber.slice(-4)}`;
}

/**
 * The canonical Employee Profile: the employee's current HR record (core
 * employment data plus employee-owned details). Employment changes arrive
 * through Employee Administration; this service owns the detail sections.
 */
export class EmployeeProfileService {
  constructor(
    private readonly employeeRepo = new EmployeeRepository(),
    private readonly repo = new EmployeeProfileRepository(),
  ) {}

  async getProfile(
    tenantId: string,
    companyId: string,
    employeeId: string,
  ): Promise<EmployeeProfile> {
    const employee = await this.employeeRepo.getById(tenantId, companyId, employeeId);
    if (!employee) {
      throw new NotFoundError(`Employee with ID '${employeeId}' not found`);
    }

    const rows = await this.repo.getDetails({ tenantId, companyId, employeeId });
    const peopleIds = [
      ...new Set(
        rows.skills.flatMap((skill) =>
          SKILL_PEOPLE_FIELDS.map((field) => skill[field]).filter((id): id is string => !!id),
        ),
      ),
    ];
    const names = await this.repo.getEmployeeNames(tenantId, companyId, peopleIds);
    const nameOf = (id: string | null) => (id ? (names.get(id) ?? null) : null);

    const personal = rows.personal;
    const bank = rows.bankAccount;
    const work = rows.workSchedule;

    return {
      employee,
      personal: personal
        ? {
            middleName: personal.middleName,
            preferredName: personal.preferredName,
            gender: personal.gender,
            dateOfBirth: personal.dateOfBirth,
            maritalStatus: personal.maritalStatus,
            bloodGroup: personal.bloodGroup,
            nationality: personal.nationality,
            nativeLanguage: personal.nativeLanguage,
            fatherName: personal.fatherName,
            guardianName: personal.guardianName,
            personalEmail: personal.personalEmail,
            homePhone: personal.homePhone,
            businessPhone: personal.businessPhone,
            workPhone: personal.workPhone,
            addressStreet: personal.addressStreet,
            addressCity: personal.addressCity,
            addressDistrict: personal.addressDistrict,
            addressState: personal.addressState,
            addressPostalCode: personal.addressPostalCode,
            addressCountry: personal.addressCountry,
          }
        : null,
      familyMembers: rows.familyMembers.map((row) => ({
        id: row.id,
        name: row.name,
        relationship: row.relationship,
        dateOfBirth: row.dateOfBirth,
        phone: row.phone,
      })),
      nominees: rows.nominees.map((row) => ({
        id: row.id,
        name: row.name,
        relationship: row.relationship,
        sharePercentage: row.sharePercentage,
      })),
      emergencyContacts: rows.emergencyContacts.map((row) => ({
        id: row.id,
        priority: row.priority,
        name: row.name,
        relationship: row.relationship,
        phone: row.phone,
        email: row.email,
        address: row.address,
        isPrivate: row.isPrivate,
      })),
      bankAccount: bank
        ? {
            accountHolderName: bank.accountHolderName,
            accountNumberMasked: maskAccountNumber(bank.accountNumber),
            ifscCode: bank.ifscCode,
            bankName: bank.bankName,
            branchName: bank.branchName,
            bankLocation: bank.bankLocation,
          }
        : null,
      skills: rows.skills.map((row) => ({
        id: row.id,
        skillName: row.skillName,
        skillType: row.skillType,
        proficiency: row.proficiency as Proficiency,
        level: row.level,
        assessedOn: row.assessedOn,
        yearsOfExperience: row.yearsOfExperience,
        examinerEmployeeId: row.examinerEmployeeId,
        verifiedByEmployeeId: row.verifiedByEmployeeId,
        mentorEmployeeId: row.mentorEmployeeId,
        examinerName: nameOf(row.examinerEmployeeId),
        verifiedByName: nameOf(row.verifiedByEmployeeId),
        mentorName: nameOf(row.mentorEmployeeId),
      })),
      workSchedule: work
        ? {
            workingCalendar: work.workingCalendar,
            workSchedule: work.workSchedule,
            workingDays: work.workingDays as Weekday[],
            startTime: work.startTime,
            endTime: work.endTime,
            breakMinutes: work.breakMinutes,
            lunchMinutes: work.lunchMinutes,
            timeZone: work.timeZone,
          }
        : null,
    };
  }

  /** Replaces one detail section of an existing employee (PUT sub-resource). */
  async updateSection(
    tenantId: string,
    companyId: string,
    employeeId: string,
    section: string,
    input: unknown,
  ): Promise<EmployeeProfile> {
    if (!EMPLOYEE_RECORD_SECTIONS.includes(section as EmployeeRecordSection)) {
      throw new NotFoundError(`Unknown employee record section '${section}'`);
    }
    const employee = await this.employeeRepo.getById(tenantId, companyId, employeeId);
    if (!employee) {
      throw new NotFoundError(`Employee with ID '${employeeId}' not found`);
    }

    const key = section as EmployeeRecordSection;
    const details = {
      [key]: validateEmployeeRecordSection(key, input),
    } as EmployeeRecordDetailsInput;
    await this.assertReferences(tenantId, companyId, employeeId, details);

    await this.repo.transaction((tx) =>
      this.writeDetails(tx, { tenantId, companyId, employeeId }, details),
    );

    return this.getProfile(tenantId, companyId, employeeId);
  }

  /** Runs work in one database transaction (employee creation with details). */
  runInTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.repo.transaction(fn);
  }

  /** Validates a details payload (used by employee creation). */
  async prepareDetails(
    tenantId: string,
    companyId: string,
    input: unknown,
  ): Promise<EmployeeRecordDetailsInput> {
    const details = validateEmployeeRecordDetails(input);
    await this.assertReferences(tenantId, companyId, null, details);
    return details;
  }

  /** Writes the provided sections inside the caller's transaction. */
  async writeDetails(
    tx: DbExecutor,
    owner: { tenantId: string; companyId: string; employeeId: string },
    details: EmployeeRecordDetailsInput,
  ): Promise<void> {
    if (details.personal) await this.repo.upsertPersonal(tx, owner, details.personal);
    if (details.familyMembers)
      await this.repo.replaceFamilyMembers(tx, owner, details.familyMembers);
    if (details.nominees) await this.repo.replaceNominees(tx, owner, details.nominees);
    if (details.emergencyContacts) {
      await this.repo.replaceEmergencyContacts(tx, owner, details.emergencyContacts);
    }
    if (details.bankAccount) await this.repo.upsertBankAccount(tx, owner, details.bankAccount);
    if (details.skills) await this.repo.replaceSkills(tx, owner, details.skills);
    if (details.workSchedule) await this.repo.upsertWorkSchedule(tx, owner, details.workSchedule);
  }

  /** Skill examiner/verifier/mentor must be other employees of the same company. */
  private async assertReferences(
    tenantId: string,
    companyId: string,
    employeeId: string | null,
    details: EmployeeRecordDetailsInput,
  ): Promise<void> {
    const ids = new Set<string>();
    for (const skill of details.skills ?? []) {
      for (const field of SKILL_PEOPLE_FIELDS) {
        const id = skill[field];
        if (!id) continue;
        if (id === employeeId) {
          throw new BadRequestError(
            'An employee cannot examine, verify or mentor their own skill',
            'INVALID_SKILL_REFERENCE',
          );
        }
        ids.add(id);
      }
    }
    if (ids.size === 0) return;

    const found = await this.repo.getEmployeeNames(tenantId, companyId, [...ids]);
    const missing = [...ids].filter((id) => !found.has(id));
    if (missing.length > 0) {
      throw new BadRequestError(
        `Employee '${missing[0]}' does not exist or does not belong to this company`,
        'INVALID_SKILL_REFERENCE',
      );
    }
  }
}
