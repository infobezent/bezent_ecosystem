/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkingHoursService } from '../service/workingHours.service.js';
import { MilestoneService } from '../service/milestone.service.js';
import type { MilestoneRepository } from '../repository/milestone.repository.js';
import type { EmployeeAttendance, MilestoneConfig, EmployeeMilestoneAchievement } from '../../../../db/schema.js';

describe('Employee Lifetime Working Hours & Milestone Recognition System', () => {
  const tenantId = 't_test';
  const companyId = 'c_test';
  const employeeId = 'emp_1001';

  let mockRepo: Partial<MilestoneRepository>;
  let workingHoursService: WorkingHoursService;
  let milestoneService: MilestoneService;
  let achievementsStore: EmployeeMilestoneAchievement[];

  beforeEach(() => {
    achievementsStore = [];
    mockRepo = {
      getEmployeeAttendanceRecords: vi.fn(),
      getEmployeeApprovedTimesheets: vi.fn(),
      getEmployeeWithContext: vi.fn().mockResolvedValue({
        employee: {
          id: employeeId,
          employeeNumber: 'EMP1001',
          firstName: 'Sarah',
          lastName: 'Connor',
          email: 'sarah.connor@bezent.com',
          departmentId: 'dept_ops',
          designationId: 'des_staff',
          employmentStatus: 'active',
          joiningDate: '2016-01-01',
        },
        company: {
          id: companyId,
          name: 'Bezent Global Technologies',
          code: 'BGT',
        },
        designationTitle: 'Staff Engineer',
        departmentName: 'Operations',
        profilePhotoUrl: 'https://example.com/avatar.jpg',
      }),
      getMilestoneConfigs: vi.fn().mockResolvedValue([
        {
          id: 'cfg_1',
          tenantId,
          companyId,
          milestoneKey: '100k_hours',
          title: 'Century Pioneer (100,000 Verified Hours)',
          description: 'Recognizing over a decade of verified professional service.',
          requiredHours: 100000,
          badgeIcon: 'medal',
          badgeLabel: '100K Veteran',
          posterTemplate: {
            titleTemplate: 'Century of Dedication: 100,000 Hours',
            subtitleTemplate: 'A Milestone of Extraordinary Craftsmanship & Enterprise Loyalty',
            primaryColor: '#1a73e8',
            includePhoto: true,
            includeDepartment: true,
            includeJoiningDate: true,
          },
          approvalRequired: false,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as MilestoneConfig,
      ]),
      upsertMilestoneConfig: vi.fn(),
      getEmployeeAchievements: vi.fn().mockImplementation(() => Promise.resolve([...achievementsStore])),
      recordAchievement: vi.fn().mockImplementation((ach) => {
        const item = { ...ach, id: 'ach_123', achievedAt: new Date() };
        achievementsStore.push(item);
        return Promise.resolve(item);
      }),
      getAchievementById: vi.fn(),
      updateAchievement: vi.fn().mockResolvedValue({} as any),
      createNotification: vi.fn().mockResolvedValue(undefined),
      getRewardsCatalogue: vi.fn().mockResolvedValue([
        {
          id: 'rew_1',
          tenantId,
          companyId,
          milestoneKey: '100k_hours',
          name: 'Executive Timepiece & Sabbatical Grant',
          description: 'Commemorative engraved luxury timepiece and 2 weeks paid sabbatical grant.',
          category: 'gift',
          imageUrl: '/assets/rewards/watch.png',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
      upsertRewardCatalogueItem: vi.fn(),
      getRewardAssignments: vi.fn().mockResolvedValue([]),
      createRewardAssignment: vi.fn().mockImplementation((assign) => Promise.resolve({ ...assign, id: 'assign_1', createdAt: new Date(), updatedAt: new Date() })),
      updateRewardAssignmentStatus: vi.fn(),
      createCompanyFeedPost: vi.fn().mockImplementation((post) => Promise.resolve({ ...post, id: 'post_1', createdAt: new Date() })),
      getCompanyFeedPosts: vi.fn().mockResolvedValue([]),
    };

    workingHoursService = new WorkingHoursService(mockRepo as unknown as MilestoneRepository);
    milestoneService = new MilestoneService(
      mockRepo as unknown as MilestoneRepository,
      workingHoursService,
    );
  });

  describe('Feature 2: Lifetime Working Hours Calculation & Deduplication', () => {
    it('calculates verified attendance hours accurately from workedMinutes', async () => {
      const records: Partial<EmployeeAttendance>[] = [
        {
          id: 'att_1',
          tenantId,
          companyId,
          employeeId,
          date: '2026-01-01',
          workedMinutes: 480, // 8.00 hours
          isMissingPunch: false,
          checkInTime: '09:00',
          checkOutTime: '17:00',
        },
        {
          id: 'att_2',
          tenantId,
          companyId,
          employeeId,
          date: '2026-01-02',
          workedMinutes: 510, // 8.50 hours
          isMissingPunch: false,
          checkInTime: '09:00',
          checkOutTime: '17:30',
        },
      ];

      (mockRepo.getEmployeeAttendanceRecords as any).mockResolvedValue(records);
      (mockRepo.getEmployeeApprovedTimesheets as any).mockResolvedValue([]);

      const result = await workingHoursService.calculateWorkingHours(tenantId, companyId, employeeId);

      expect(result.attendanceHours).toBe(16.5);
      expect(result.timesheetDedupedHours).toBe(0);
      expect(result.lifetimeHours).toBe(16.5);
      expect(result.preventedDuplicateHours).toBe(0);
      expect(result.totalVerifiedWorkdays).toBe(2);
    });

    it('rejects incomplete punches with isMissingPunch=true and does not invent hours', async () => {
      const records: Partial<EmployeeAttendance>[] = [
        {
          id: 'att_valid',
          tenantId,
          companyId,
          employeeId,
          date: '2026-01-05',
          workedMinutes: 480, // 8 hours
          isMissingPunch: false,
          checkInTime: '09:00',
          checkOutTime: '17:00',
        },
        {
          id: 'att_missing_punch',
          tenantId,
          companyId,
          employeeId,
          date: '2026-01-06',
          workedMinutes: 0,
          isMissingPunch: true, // Missing check-out punch
          checkInTime: '09:00',
          checkOutTime: null,
        },
      ];

      (mockRepo.getEmployeeAttendanceRecords as any).mockResolvedValue(records);
      (mockRepo.getEmployeeApprovedTimesheets as any).mockResolvedValue([]);

      const result = await workingHoursService.calculateWorkingHours(tenantId, companyId, employeeId);

      expect(result.attendanceHours).toBe(8);
      expect(result.lifetimeHours).toBe(8);
      expect(result.totalVerifiedWorkdays).toBe(1);
    });

    it('handles overnight shifts correctly (e.g. 22:00 to 06:00 next day)', async () => {
      const records: Partial<EmployeeAttendance>[] = [
        {
          id: 'att_overnight',
          tenantId,
          companyId,
          employeeId,
          date: '2026-01-10',
          workedMinutes: 480, // 8 hours verified overnight
          isMissingPunch: false,
          checkInTime: '22:00',
          checkOutTime: '06:00',
        },
      ];

      (mockRepo.getEmployeeAttendanceRecords as any).mockResolvedValue(records);
      (mockRepo.getEmployeeApprovedTimesheets as any).mockResolvedValue([]);

      const result = await workingHoursService.calculateWorkingHours(tenantId, companyId, employeeId);

      expect(result.lifetimeHours).toBe(8);
      expect(result.totalVerifiedWorkdays).toBe(1);
    });

    it('prevents double counting when attendance and timesheet exist for the same day', async () => {
      // Date 2026-01-15 has 8.0 hours attendance
      const attendance: Partial<EmployeeAttendance>[] = [
        {
          id: 'att_dup',
          tenantId,
          companyId,
          employeeId,
          date: '2026-01-15',
          workedMinutes: 480, // 8.0 hours
          isMissingPunch: false,
          checkInTime: '09:00',
          checkOutTime: '17:00',
        },
      ];

      // Date 2026-01-15 also has an approved timesheet for 8.0 hours on Project Alpha
      // Date 2026-01-16 (no attendance) has an approved timesheet for 7.5 hours
      const timesheets = [
        {
          id: 'ts_dup',
          date: '2026-01-15',
          hours: '8.00',
          status: 'approved',
          projectName: 'Project Alpha',
        },
        {
          id: 'ts_standalone',
          date: '2026-01-16',
          hours: '7.50',
          status: 'approved',
          projectName: 'Project Beta',
        },
      ];

      (mockRepo.getEmployeeAttendanceRecords as any).mockResolvedValue(attendance);
      (mockRepo.getEmployeeApprovedTimesheets as any).mockResolvedValue(timesheets);

      const result = await workingHoursService.calculateWorkingHours(tenantId, companyId, employeeId);

      // Attendance on 2026-01-15 is 8 hours
      // Standalone timesheet on 2026-01-16 is 7.5 hours
      // Total verified hours = 8 + 7.5 = 15.5
      expect(result.attendanceHours).toBe(8);
      expect(result.timesheetDedupedHours).toBe(7.5);
      expect(result.lifetimeHours).toBe(15.5);
      expect(result.preventedDuplicateHours).toBe(8); // Duplicate 8 hours from timesheet on 2026-01-15 prevented!
      expect(result.totalVerifiedWorkdays).toBe(2);
    });

    it('generates yearly, monthly, and daily breakdowns accurately', async () => {
      const attendance: Partial<EmployeeAttendance>[] = [
        {
          id: 'att_jan',
          tenantId,
          companyId,
          employeeId,
          date: '2025-01-10',
          workedMinutes: 480, // 8 hours
          isMissingPunch: false,
        },
        {
          id: 'att_feb',
          tenantId,
          companyId,
          employeeId,
          date: '2025-02-15',
          workedMinutes: 480, // 8 hours
          isMissingPunch: false,
        },
        {
          id: 'att_next_year',
          tenantId,
          companyId,
          employeeId,
          date: '2026-03-01',
          workedMinutes: 600, // 10 hours
          isMissingPunch: false,
        },
      ];

      (mockRepo.getEmployeeAttendanceRecords as any).mockResolvedValue(attendance);
      (mockRepo.getEmployeeApprovedTimesheets as any).mockResolvedValue([]);

      const result = await workingHoursService.calculateWorkingHours(tenantId, companyId, employeeId);

      expect(result.lifetimeHours).toBe(26);
      expect(result.yearlySummaries).toEqual([
        { year: '2026', attendanceHours: 10, timesheetHours: 0, totalHours: 10, workdaysCount: 1 },
        { year: '2025', attendanceHours: 16, timesheetHours: 0, totalHours: 16, workdaysCount: 2 },
      ]);
      expect(result.monthlySummaries).toHaveLength(3);
      expect(result.recentDailyBreakdown).toHaveLength(3);
    });
  });

  describe('Feature 3: 100,000-Hour Achievement & Rewards Milestone System', () => {
    it('evaluates employee at below 100,000 hours as in_progress', async () => {
      // 99,990 hours
      const attendance: Partial<EmployeeAttendance>[] = [
        {
          id: 'att_high',
          tenantId,
          companyId,
          employeeId,
          date: '2026-01-01',
          workedMinutes: 5999400, // 99,990 hours
          isMissingPunch: false,
        },
      ];

      (mockRepo.getEmployeeAttendanceRecords as any).mockResolvedValue(attendance);
      (mockRepo.getEmployeeApprovedTimesheets as any).mockResolvedValue([]);

      const overview = await milestoneService.evaluateEmployeeMilestones(tenantId, companyId, employeeId);

      expect(overview.workingHours.lifetimeHours).toBe(99990);
      expect(overview.milestones).toHaveLength(1);
      const m = overview.milestones[0]!;
      expect(m.isAchieved).toBe(false);
      expect(m.percentComplete).toBeCloseTo(99.99, 1);
      expect(m.requiredHours - m.currentHours).toBe(10);
      expect(mockRepo.recordAchievement).not.toHaveBeenCalled();
      expect(mockRepo.createNotification).not.toHaveBeenCalled();
    });

    it('triggers achievement when employee crosses 100,000 verified hours', async () => {
      // 100,005 hours
      const attendance: Partial<EmployeeAttendance>[] = [
        {
          id: 'att_high',
          tenantId,
          companyId,
          employeeId,
          date: '2026-01-01',
          workedMinutes: 6000300, // 100,005 hours
          isMissingPunch: false,
        },
      ];

      (mockRepo.getEmployeeAttendanceRecords as any).mockResolvedValue(attendance);
      (mockRepo.getEmployeeApprovedTimesheets as any).mockResolvedValue([]);

      const overview = await milestoneService.evaluateEmployeeMilestones(tenantId, companyId, employeeId);

      expect(overview.workingHours.lifetimeHours).toBe(100005);
      const m = overview.milestones[0]!;
      expect(m.isAchieved).toBe(true);
      expect(m.percentComplete).toBe(100);
      expect(m.currentHours).toBe(100005);

      // Verify achievement was created
      expect(mockRepo.recordAchievement).toHaveBeenCalledTimes(1);
      const achArgs = (mockRepo.recordAchievement as any).mock.calls[0][0];
      expect(achArgs.milestoneKey).toBe('100k_hours');
      expect(achArgs.achievedHours).toBe('100005');
      expect(achArgs.posterData).toBeDefined();
      expect(achArgs.posterData.employeeName).toBe('Sarah Connor');
      expect(achArgs.posterData.milestoneHours).toBe(100000);

      // Verify in-app notification was triggered
      expect(mockRepo.createNotification).toHaveBeenCalledTimes(1);
      const notifArgs = (mockRepo.createNotification as any).mock.calls[0][0];
      expect(notifArgs.title).toContain('100,000');
    });

    it('enforces idempotency: does not award duplicate achievement or notifications on re-evaluation', async () => {
      const existingAchievement: Partial<EmployeeMilestoneAchievement> = {
        id: 'ach_existing',
        tenantId,
        companyId,
        employeeId,
        milestoneKey: '100k_hours',
        milestoneTitle: 'Century Pioneer (100,000 Verified Hours)',
        milestoneHours: 100000,
        achievedHours: '100005.00',
        status: 'unlocked',
        posterData: {
          employeeName: 'Sarah Connor',
          milestoneTitle: 'Century Pioneer (100,000 Verified Hours)',
          milestoneHours: 100005,
          companyName: 'Bezent Global Technologies',
          photoUrl: 'https://example.com/avatar.jpg',
          achievedDate: new Date().toISOString(),
          publishedToFeed: false,
        },
        achievedAt: new Date(),
      };

      (mockRepo.getEmployeeAttendanceRecords as any).mockResolvedValue([
        { date: '2026-01-01', workedMinutes: 6000300, isMissingPunch: false },
      ]);
      (mockRepo.getEmployeeApprovedTimesheets as any).mockResolvedValue([]);
      // Mock existing achievement already in DB
      achievementsStore = [existingAchievement as any];

      const overview = await milestoneService.evaluateEmployeeMilestones(tenantId, companyId, employeeId);

      expect(overview.milestones[0]!.isAchieved).toBe(true);
      // recordAchievement and createNotification MUST NOT be called again
      expect(mockRepo.recordAchievement).not.toHaveBeenCalled();
      expect(mockRepo.createNotification).not.toHaveBeenCalled();
    });

    it('publishes recognition poster to company feed successfully', async () => {
      const achievement: Partial<EmployeeMilestoneAchievement> = {
        id: 'ach_123',
        tenantId,
        companyId,
        employeeId,
        milestoneKey: '100k_hours',
        milestoneTitle: 'Century Pioneer (100,000 Verified Hours)',
        achievedHours: '100000.00',
        status: 'unlocked',
        posterData: {
          employeeName: 'Sarah Connor',
          milestoneTitle: 'Century Pioneer (100,000 Verified Hours)',
          milestoneHours: 100000,
          companyName: 'Bezent Global Technologies',
          photoUrl: 'https://example.com/avatar.jpg',
          achievedDate: new Date().toISOString(),
          publishedToFeed: false,
        },
      };

      (mockRepo.getAchievementById as any).mockResolvedValue(achievement);
      (mockRepo.updateAchievement as any).mockResolvedValue({
        ...achievement,
        status: 'published',
        posterPublishedAt: new Date(),
      });

      const result = await milestoneService.publishAchievementPoster(
        tenantId,
        companyId,
        'ach_123',
        'admin_user_1',
      );

      expect(mockRepo.updateAchievement).toHaveBeenCalledWith(
        'ach_123',
        tenantId,
        companyId,
        expect.objectContaining({ status: 'published' }),
      );
      expect(mockRepo.createCompanyFeedPost).toHaveBeenCalledTimes(1);
      const postArgs = (mockRepo.createCompanyFeedPost as any).mock.calls[0][0];
      expect(postArgs.type).toBe('milestone_poster');
      expect(postArgs.title).toContain('Sarah Connor');
      expect(postArgs.status).toBe('published');
      expect(result.feedPostId).toBe('post_1');
    });

    it('manages reward assignments and status transitions with auditable history', async () => {
      (mockRepo.createRewardAssignment as any).mockImplementation((input: any) =>
        Promise.resolve({
          ...input,
          id: 'assign_1',
          status: 'pending',
          auditHistory: [
            {
              status: 'pending',
              changedBy: 'admin_user_1',
              timestamp: new Date().toISOString(),
              reason: 'Initial assignment upon 100K achievement',
            },
          ],
        }),
      );

      const assignment = await milestoneService.assignReward(
        tenantId,
        companyId,
        employeeId,
        'ach_123',
        'rew_1',
        'admin_user_1',
        'Initial assignment upon 100K achievement',
      );

      expect(assignment.id).toBe('assign_1');
      expect(assignment.status).toBe('pending');
      expect(assignment.auditHistory).toHaveLength(1);

      // Update status to approved
      (mockRepo.updateRewardAssignmentStatus as any).mockResolvedValue({
        ...assignment,
        status: 'approved',
        approvedByUserId: 'finance_manager_1',
        auditHistory: [
          ...(assignment.auditHistory ?? []),
          {
            status: 'approved',
            changedBy: 'finance_manager_1',
            timestamp: new Date().toISOString(),
            reason: 'Budget approved by VP',
          },
        ],
      });

      const updated = await milestoneService.updateRewardStatus(
        tenantId,
        companyId,
        'assign_1',
        'finance_manager_1',
        { status: 'approved', notes: 'Budget approved by VP' },
      );

      expect(updated.status).toBe('approved');
      expect(updated.auditHistory).toHaveLength(2);
    });

    it('allows admins to configure milestone thresholds and add new milestones', async () => {
      const updatedConfigInput = {
        milestoneKey: '100k_hours',
        title: 'Century Pioneer Updated',
        description: 'Updated description',
        requiredHours: 100000,
        badgeIcon: 'trophy',
        badgeLabel: 'Centurion',
        posterTemplate: {
          titleTemplate: 'Century of Dedication: 100,000 Hours',
          subtitleTemplate: 'A Milestone of Extraordinary Craftsmanship & Enterprise Loyalty',
          primaryColor: '#1a73e8',
          includePhoto: true,
          includeDepartment: true,
          includeJoiningDate: true,
        },
        approvalRequired: true,
        isActive: true,
      };

      (mockRepo.upsertMilestoneConfig as any).mockResolvedValue({
        id: 'cfg_1',
        tenantId,
        companyId,
        ...updatedConfigInput,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const saved = await milestoneService.updateMilestoneConfig(tenantId, companyId, updatedConfigInput);
      expect(saved.title).toBe('Century Pioneer Updated');
      expect(saved.badgeIcon).toBe('trophy');
      expect(mockRepo.upsertMilestoneConfig).toHaveBeenCalledTimes(1);
    });
  });
});
