import { randomUUID } from 'node:crypto';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { getDb } from '../../../../db/connection.js';
import {
  employeeBankAccounts,
  employeeEmergencyContacts,
  employeeFamilyMembers,
  employeeNominees,
  employeePersonalDetails,
  employees,
  employeeSkills,
  employeeWorkSchedules,
  type EmployeeBankAccount,
  type EmployeeEmergencyContact,
  type EmployeeFamilyMember,
  type EmployeeNominee,
  type EmployeePersonalDetails,
  type EmployeeSkill,
  type EmployeeWorkSchedule,
} from '../../../../db/schema.js';
import type { DbExecutor } from './employee.repository.js';
import type {
  BankAccountInput,
  EmergencyContactInput,
  FamilyMemberInput,
  NomineeInput,
  PersonalDetailsInput,
  SkillInput,
  WorkScheduleInput,
} from '../types/employeeProfile.types.js';

type Db = ReturnType<typeof getDb>;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

export interface EmployeeRecordDetailRows {
  personal: EmployeePersonalDetails | null;
  familyMembers: EmployeeFamilyMember[];
  nominees: EmployeeNominee[];
  emergencyContacts: EmployeeEmergencyContact[];
  bankAccount: EmployeeBankAccount | null;
  skills: EmployeeSkill[];
  workSchedule: EmployeeWorkSchedule | null;
}

type OwnedTable =
  | typeof employeePersonalDetails
  | typeof employeeFamilyMembers
  | typeof employeeNominees
  | typeof employeeEmergencyContacts
  | typeof employeeBankAccounts
  | typeof employeeSkills
  | typeof employeeWorkSchedules;

interface Owner {
  tenantId: string;
  companyId: string;
  employeeId: string;
}

/**
 * Data access for employee-owned record details. Every read and write is
 * constrained to one employee within one tenant/company.
 */
export class EmployeeProfileRepository {
  transaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    return getDb().transaction(fn);
  }

  async getDetails(
    owner: Owner,
    executor: DbExecutor = getDb(),
  ): Promise<EmployeeRecordDetailRows> {
    const scope = (table: OwnedTable) => this.ownerScope(table, owner);

    const [
      personal,
      familyMembers,
      nominees,
      emergencyContacts,
      bankAccount,
      skills,
      workSchedule,
    ] = await Promise.all([
      executor
        .select()
        .from(employeePersonalDetails)
        .where(scope(employeePersonalDetails))
        .limit(1),
      executor
        .select()
        .from(employeeFamilyMembers)
        .where(scope(employeeFamilyMembers))
        .orderBy(asc(employeeFamilyMembers.sortOrder)),
      executor
        .select()
        .from(employeeNominees)
        .where(scope(employeeNominees))
        .orderBy(asc(employeeNominees.sortOrder)),
      executor
        .select()
        .from(employeeEmergencyContacts)
        .where(scope(employeeEmergencyContacts))
        .orderBy(asc(employeeEmergencyContacts.priority)),
      executor.select().from(employeeBankAccounts).where(scope(employeeBankAccounts)).limit(1),
      executor
        .select()
        .from(employeeSkills)
        .where(scope(employeeSkills))
        .orderBy(asc(employeeSkills.sortOrder)),
      executor.select().from(employeeWorkSchedules).where(scope(employeeWorkSchedules)).limit(1),
    ]);

    return {
      personal: personal[0] ?? null,
      familyMembers,
      nominees,
      emergencyContacts,
      bankAccount: bankAccount[0] ?? null,
      skills,
      workSchedule: workSchedule[0] ?? null,
    };
  }

  /** Display names for employees referenced by skills, scoped to the company. */
  async getEmployeeNames(
    tenantId: string,
    companyId: string,
    ids: string[],
  ): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();
    const rows = await getDb()
      .select({ id: employees.id, firstName: employees.firstName, lastName: employees.lastName })
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, tenantId),
          eq(employees.companyId, companyId),
          inArray(employees.id, ids),
        ),
      );
    return new Map(
      rows.map((row) => [
        row.id,
        row.lastName ? `${row.firstName} ${row.lastName}` : row.firstName,
      ]),
    );
  }

  async upsertPersonal(tx: DbExecutor, owner: Owner, values: PersonalDetailsInput): Promise<void> {
    await tx
      .insert(employeePersonalDetails)
      .values({ ...owner, ...values, updatedAt: new Date() })
      .onDuplicateKeyUpdate({ set: { ...values, updatedAt: new Date() } });
  }

  async upsertBankAccount(tx: DbExecutor, owner: Owner, values: BankAccountInput): Promise<void> {
    await tx
      .insert(employeeBankAccounts)
      .values({ ...owner, ...values, updatedAt: new Date() })
      .onDuplicateKeyUpdate({ set: { ...values, updatedAt: new Date() } });
  }

  async upsertWorkSchedule(tx: DbExecutor, owner: Owner, values: WorkScheduleInput): Promise<void> {
    await tx
      .insert(employeeWorkSchedules)
      .values({ ...owner, ...values, updatedAt: new Date() })
      .onDuplicateKeyUpdate({ set: { ...values, updatedAt: new Date() } });
  }

  async replaceFamilyMembers(tx: DbExecutor, owner: Owner, items: FamilyMemberInput[]) {
    await tx.delete(employeeFamilyMembers).where(this.ownerScope(employeeFamilyMembers, owner));
    if (items.length === 0) return;
    await tx.insert(employeeFamilyMembers).values(
      items.map((item, index) => ({
        id: `efm_${randomUUID()}`,
        ...owner,
        ...item,
        sortOrder: index,
      })),
    );
  }

  async replaceNominees(tx: DbExecutor, owner: Owner, items: NomineeInput[]) {
    await tx.delete(employeeNominees).where(this.ownerScope(employeeNominees, owner));
    if (items.length === 0) return;
    await tx.insert(employeeNominees).values(
      items.map((item, index) => ({
        id: `enm_${randomUUID()}`,
        ...owner,
        ...item,
        sortOrder: index,
      })),
    );
  }

  async replaceEmergencyContacts(tx: DbExecutor, owner: Owner, items: EmergencyContactInput[]) {
    await tx
      .delete(employeeEmergencyContacts)
      .where(this.ownerScope(employeeEmergencyContacts, owner));
    if (items.length === 0) return;
    await tx
      .insert(employeeEmergencyContacts)
      .values(items.map((item) => ({ id: `eec_${randomUUID()}`, ...owner, ...item })));
  }

  async replaceSkills(tx: DbExecutor, owner: Owner, items: SkillInput[]) {
    await tx.delete(employeeSkills).where(this.ownerScope(employeeSkills, owner));
    if (items.length === 0) return;
    await tx.insert(employeeSkills).values(
      items.map((item, index) => ({
        id: `esk_${randomUUID()}`,
        ...owner,
        ...item,
        sortOrder: index,
      })),
    );
  }

  private ownerScope(table: OwnedTable, owner: Owner) {
    return and(
      eq(table.tenantId, owner.tenantId),
      eq(table.companyId, owner.companyId),
      eq(table.employeeId, owner.employeeId),
    );
  }
}
