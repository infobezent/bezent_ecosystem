import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { ReviewSection } from '../components/ReviewSection';
import {
  INITIAL_REGISTRATION_DATA,
  toReviewSectionData,
  buildCreateEmployeePayload,
  type RegistrationFormData,
} from '../types/registration.types';
import type { OrganizationMasters } from '../../api/organizationMastersApi';
import { createEmployee } from '../../employees/api/employeesApi';
import * as authPlatform from '../../../../platform/auth';

const mockMasters: OrganizationMasters = {
  company: { id: 'comp_01', name: 'BEZENT Demo Pvt Ltd', code: 'BEZENT_DEMO' },
  departments: [
    { id: 'dept_eng', name: 'Engineering', code: 'ENG' },
    { id: 'dept_hr', name: 'Human Resources', code: 'HR' },
  ],
  designations: [
    { id: 'desig_se', name: 'Software Engineer', code: 'SE' },
    { id: 'desig_pm', name: 'Product Manager', code: 'PM' },
  ],
  locations: [
    { id: 'loc_chn', name: 'Chennai - Main Office', code: 'CHN' },
    { id: 'loc_blr', name: 'Bengaluru Office', code: 'BLR' },
  ],
};

describe('Employee Registration Shared Foundation & Review Wiring', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Authoritative State & Elimination of Mock Review Data', () => {
    it('ReviewSection renders empty/incomplete indicators when chapters 03-09 are unwired/empty', () => {
      const reviewData = toReviewSectionData(INITIAL_REGISTRATION_DATA);
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <ReviewSection data={reviewData} onEditSection={() => {}} />
        </MemoryRouter>,
      );

      // Verify no hardcoded names exist from former mock template
      expect(html).not.toContain('Arun Kumar');
      expect(html).not.toContain('Sunita Kumar');
      expect(html).not.toContain('Rajesh Kumar');
      expect(html).not.toContain('Tech Mentors');
      expect(html).not.toContain('HDFC0001234');
      expect(html).not.toContain('HDFC Bank');
      expect(html).not.toContain('50100432198765');

      // Verify unwired chapters display incomplete or unconfigured states
      expect(html).toContain('No emergency contacts registered for this employee.');
      expect(html).toContain('Bank account and statutory details not configured.');
      expect(html).toContain('No skills or qualifications recorded for this registration.');
      expect(html).toContain('No onboarding tasks or assets configured for this registration.');
      expect(html).toContain('Online access and credentials not yet configured.');
      expect(html).toContain('No documents uploaded yet for this employee.');
      expect(html).toContain('Not Configured');
    });

    it('ReviewSection displays real entered state from RegistrationFormData', () => {
      const realState: RegistrationFormData = {
        ...INITIAL_REGISTRATION_DATA,
        general: {
          ...INITIAL_REGISTRATION_DATA.general,
          employeeId: 'EMP-REAL-001',
          department: 'Engineering',
          designation: 'Software Engineer',
          officeLocation: 'Chennai - Main Office',
          joiningDate: '2026-05-01',
        },
        personal: {
          ...INITIAL_REGISTRATION_DATA.personal,
          firstName: 'Ananya',
          lastName: 'Krishnan',
          personalEmail: 'ananya.k@example.com',
          mobilePhone: '+91 98401 23456',
          currentCity: 'Chennai',
          currentState: 'Tamil Nadu',
        },
        emergency: {
          primaryContact: {
            name: 'Karthik Krishnan',
            relationship: 'Spouse',
            phone: '+91 98409 87654',
            altPhone: '',
            email: 'karthik.k@example.com',
            address: 'Chennai',
            isPrivate: false,
          },
          secondaryContact: null,
        },
        accounts: {
          bankAccount: {
            bankName: 'State Bank of India',
            accountNumber: '112233445566',
            ifscCode: 'SBIN0001234',
            accountHolderName: 'Ananya Krishnan',
            branchName: 'T Nagar',
            bankLocation: 'Chennai',
          },
          salaryDetails: null,
          statutoryDetails: null,
        },
        skills: {
          skills: [
            {
              id: 'skill_1',
              skillName: 'TypeScript & React',
              skillType: 'Primary',
              proficiency: 'Expert',
              level: 'Advanced',
            },
          ],
        },
        workingHours: {
          workingCalendar: 'Standard 5-Day',
          workSchedule: 'General Shift',
          workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          startTime: '09:00',
          endTime: '18:00',
          breakMinutes: 15,
          lunchMinutes: 45,
          timeZone: 'Asia/Kolkata',
        },
      };

      const reviewData = toReviewSectionData(realState);
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <ReviewSection data={reviewData} onEditSection={() => {}} />
        </MemoryRouter>,
      );

      // Verify real data is displayed
      expect(html).toContain('EMP-REAL-001');
      expect(html).toContain('Ananya Krishnan');
      expect(html).toContain('ananya.k@example.com');
      expect(html).toContain('+91 98401 23456');
      expect(html).toContain('Karthik Krishnan');
      expect(html).toContain('State Bank of India');
      // Bank account number is masked for privacy
      expect(html).toContain('•••• •••• 5566');
      expect(html).toContain('SBIN0001234');
      expect(html).toContain('TypeScript &amp; React');
      expect(html).toContain('General Shift');
    });
  });

  describe('2. Backend Supported Domain Mapping & Exclusion of Unsupported Domains', () => {
    it('buildCreateEmployeePayload accurately maps supported fields and ignores unsupported domains', () => {
      const realState: RegistrationFormData = {
        ...INITIAL_REGISTRATION_DATA,
        general: {
          ...INITIAL_REGISTRATION_DATA.general,
          employeeId: 'EMP-900',
          department: 'Engineering',
          designation: 'Software Engineer',
          officeLocation: 'Chennai - Main Office',
          joiningDate: '2026-06-01',
          employmentType: 'full_time',
        },
        personal: {
          ...INITIAL_REGISTRATION_DATA.personal,
          firstName: 'Ramesh',
          lastName: 'Subramanian',
          personalEmail: 'ramesh.s@example.com',
          mobilePhone: '9988776655',
          gender: 'Male',
          dob: '1992-08-15',
          currentCity: 'Chennai',
          currentState: 'Tamil Nadu',
        },
        emergency: {
          primaryContact: {
            name: 'Priya Subramanian',
            relationship: 'Sister',
            phone: '9888877777',
            altPhone: '',
            email: 'priya@example.com',
            address: 'Chennai',
            isPrivate: false,
          },
          secondaryContact: null,
        },
        accounts: {
          bankAccount: {
            bankName: 'ICICI Bank',
            accountNumber: '001122334455',
            ifscCode: 'ICIC0000001',
            accountHolderName: 'Ramesh Subramanian',
            branchName: 'Nungambakkam',
            bankLocation: 'Chennai',
          },
          salaryDetails: {
            // Unsupported payroll CTC calculations
            annualCtc: 1200000,
            monthlyBasic: 50000,
            hra: 25000,
          },
          statutoryDetails: null,
        },
        skills: {
          skills: [
            {
              id: 'sk_1',
              skillName: 'Node.js',
              skillType: 'Primary',
              proficiency: 'Advanced',
            },
          ],
        },
        workingHours: {
          workingCalendar: 'Standard 5-Day',
          workSchedule: 'Shift A',
          workingDays: ['Monday', 'Tuesday', 'Wednesday'],
          startTime: '09:00',
          endTime: '17:30',
          breakMinutes: 15,
          lunchMinutes: 45,
          timeZone: 'Asia/Kolkata',
        },
      };

      const payload = buildCreateEmployeePayload(realState, mockMasters);

      // Core fields mapped
      expect(payload.employeeNumber).toBe('EMP-900');
      expect(payload.firstName).toBe('Ramesh');
      expect(payload.lastName).toBe('Subramanian');
      expect(payload.email).toBe('ramesh.s@example.com');
      expect(payload.phone).toBe('9988776655');
      expect(payload.joiningDate).toBe('2026-06-01');
      expect(payload.departmentId).toBe('dept_eng');
      expect(payload.designationId).toBe('desig_se');
      expect(payload.locationId).toBe('loc_chn');
      expect(payload.employmentType).toBe('full_time');

      // Supported details populated
      expect(payload.details?.personal).toBeDefined();
      expect(payload.details?.personal?.gender).toBe('Male');
      expect(payload.details?.personal?.dateOfBirth).toBe('1992-08-15');
      expect(payload.details?.emergencyContacts).toHaveLength(1);
      expect(payload.details?.emergencyContacts?.[0]?.name).toBe('Priya Subramanian');
      expect(payload.details?.bankAccount?.bankName).toBe('ICICI Bank');
      expect(payload.details?.skills?.[0]?.skillName).toBe('Node.js');
      expect(payload.details?.workSchedule?.startTime).toBe('09:00');

      // Unsupported domains intentionally excluded from payload
      expect(
        (payload.details as Record<string, unknown> | undefined)?.salaryDetails,
      ).toBeUndefined();
      expect((payload as unknown as Record<string, unknown>).annualCtc).toBeUndefined();
      expect((payload as unknown as Record<string, unknown>).assets).toBeUndefined();
      expect((payload as unknown as Record<string, unknown>).portalPermissions).toBeUndefined();
      expect((payload as unknown as Record<string, unknown>).documents).toBeUndefined();
    });
  });

  describe('3. Employee Creation API Call & Safety Guarantees', () => {
    it('createEmployee issues an authorized POST request to /hrms/employees', async () => {
      const mockEmployee = {
        id: 'emp_new_001',
        employeeNumber: 'EMP-900',
        firstName: 'Ramesh',
        lastName: 'Subramanian',
        workEmail: 'ramesh.s@example.com',
        employmentType: 'full_time',
        employmentStatus: 'pending_activation',
        joiningDate: '2026-06-01',
        createdAt: '2026-04-01T00:00:00.000Z',
        updatedAt: '2026-04-01T00:00:00.000Z',
      };

      const spyAuthFetch = vi.spyOn(authPlatform, 'authorizedFetch').mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          data: mockEmployee,
        }),
      } as Response);

      const result = await createEmployee({
        firstName: 'Ramesh',
        lastName: 'Subramanian',
        email: 'ramesh.s@example.com',
        joiningDate: '2026-06-01',
        employmentType: 'full_time',
      });

      expect(spyAuthFetch).toHaveBeenCalledTimes(1);
      const callArgs = spyAuthFetch.mock.calls[0];
      expect(callArgs).toBeDefined();
      const [url, options] = callArgs!;
      expect(url).toContain('/hrms/employees');
      expect(options?.method).toBe('POST');
      expect(result.id).toBe('emp_new_001');
    });

    it('createEmployee throws EmployeesApiError when API responds with error status', async () => {
      vi.spyOn(authPlatform, 'authorizedFetch').mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: 'VALIDATION_FAILED',
            message: 'An employee with this Employee ID already exists.',
          },
        }),
      } as Response);

      await expect(
        createEmployee({
          firstName: 'Ramesh',
          email: 'ramesh.s@example.com',
          joiningDate: '2026-06-01',
          employmentType: 'full_time',
        }),
      ).rejects.toThrow('An employee with this Employee ID already exists.');
    });
  });

  describe('4. Review Submission Lifecycle UI States', () => {
    const validReviewData = toReviewSectionData({
      ...INITIAL_REGISTRATION_DATA,
      general: {
        ...INITIAL_REGISTRATION_DATA.general,
        employeeId: 'EMP-001',
        department: 'Engineering',
        joiningDate: '2026-06-01',
      },
      personal: {
        ...INITIAL_REGISTRATION_DATA.personal,
        firstName: 'Jane',
        personalEmail: 'jane@example.com',
        mobilePhone: '9876543210',
      },
    });

    it('displays submitting state and disables submit button when isSubmitting is true', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <ReviewSection data={validReviewData} onEditSection={() => {}} isSubmitting={true} />
        </MemoryRouter>,
      );

      expect(html).toContain('Creating Employee...');
      // Confirm disabled state is present on button
      expect(html).toContain('disabled=""');
    });

    it('displays actionable error message when submitError is provided and does not show success modal', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <ReviewSection
            data={validReviewData}
            onEditSection={() => {}}
            submitError="Employee ID EMP-001 already in use. Please choose another ID."
          />
        </MemoryRouter>,
      );

      // Error banner rendered
      expect(html).toContain('Creation Failed');
      expect(html).toContain('Employee ID EMP-001 already in use. Please choose another ID.');
      // Success modal NOT rendered
      expect(html).not.toContain('Employee Registration Complete!');
    });

    it('displays success modal ONLY when createdEmployee confirmation is provided from backend', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <ReviewSection
            data={validReviewData}
            onEditSection={() => {}}
            createdEmployee={{
              id: 'emp_server_created_99',
              employeeNumber: 'EMP-001',
              name: 'Jane Doe',
            }}
          />
        </MemoryRouter>,
      );

      expect(html).toContain('Employee Registration Complete!');
      expect(html).toContain('Jane Doe');
      expect(html).toContain('EMP-001');
    });
  });
});
