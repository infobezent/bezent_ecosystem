import type { ReactNode } from 'react';
import {
  Badge,
  Button,
  EmptyState,
  Grid,
  Section,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '../../../../design-system/components';
import type {
  BankAccount,
  EmergencyContact,
  EmployeeProfile,
  EmployeeRecord,
  Skill,
  WorkSchedule,
} from '../api/employeesApi';
import {
  EMPLOYMENT_STATUS_LABELS,
  SOURCE_OF_HIRE_LABELS,
  employmentStatusVariant,
  employmentTypeLabel,
  formatDate,
  formatNoticePeriod,
} from '../model/employeeModel';
import { DetailItem } from './DetailItem';

interface Field {
  label: string;
  value: ReactNode;
}

/** Grid of label/value pairs; fields without a value are omitted. */
function Fields({ items }: { items: Field[] }) {
  const present = items.filter(
    (item) => item.value !== null && item.value !== undefined && item.value !== '',
  );
  return (
    <Grid columns={3} gap="md">
      {present.map((item) => (
        <DetailItem key={item.label} label={item.label}>
          {item.value}
        </DetailItem>
      ))}
    </Grid>
  );
}

function NothingRecorded({ title, description }: { title: string; description: string }) {
  return <EmptyState size="compact" hideIllustration title={title} description={description} />;
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export function ProfileOverview({
  employee,
  onOpenEmployee,
}: {
  employee: EmployeeRecord;
  onOpenEmployee: (employeeId: string) => void;
}) {
  return (
    <Stack gap="lg">
      <Section title="Contact">
        <Fields
          items={[
            { label: 'Work Email', value: employee.email },
            { label: 'Phone', value: employee.phone },
          ]}
        />
      </Section>

      <Section title="Organization">
        <Fields
          items={[
            { label: 'Department', value: employee.departmentName ?? 'Not set' },
            { label: 'Designation', value: employee.designationName ?? 'Not set' },
            { label: 'Location', value: employee.locationName ?? 'Not set' },
            {
              label: 'Reporting Manager',
              value:
                employee.reportingManagerId && employee.reportingManagerName ? (
                  <Button
                    variant="text"
                    size="sm"
                    onClick={() => onOpenEmployee(employee.reportingManagerId!)}
                  >
                    {employee.reportingManagerName}
                  </Button>
                ) : (
                  'Not assigned'
                ),
            },
          ]}
        />
      </Section>

      <Section title="Employment">
        <Fields
          items={[
            { label: 'Employee ID', value: employee.employeeNumber },
            {
              label: 'Employment Status',
              value: (
                <Badge variant={employmentStatusVariant(employee.employmentStatus)} size="sm">
                  {EMPLOYMENT_STATUS_LABELS[employee.employmentStatus]}
                </Badge>
              ),
            },
            { label: 'Employment Type', value: employmentTypeLabel(employee.employmentType) },
            { label: 'Joining Date', value: formatDate(employee.joiningDate) },
            {
              label: 'Probation End Date',
              value: employee.probationEndDate ? formatDate(employee.probationEndDate) : null,
            },
            {
              label: 'Confirmation Date',
              value: employee.confirmationDate ? formatDate(employee.confirmationDate) : null,
            },
            {
              label: 'Last Working Date',
              value: employee.lastWorkingDate ? formatDate(employee.lastWorkingDate) : null,
            },
            {
              label: 'Contract End Date',
              value: employee.contractEndDate ? formatDate(employee.contractEndDate) : null,
            },
            { label: 'Notice Period', value: formatNoticePeriod(employee.noticePeriodDays) },
            {
              label: 'Source of Hire',
              value: employee.sourceOfHire ? SOURCE_OF_HIRE_LABELS[employee.sourceOfHire] : null,
            },
          ]}
        />
      </Section>
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Personal
// ---------------------------------------------------------------------------

export function PersonalSection({ profile }: { profile: EmployeeProfile }) {
  const { personal, familyMembers, nominees } = profile;
  const address = personal
    ? [
        personal.addressStreet,
        personal.addressCity,
        personal.addressDistrict,
        personal.addressState,
        personal.addressPostalCode,
        personal.addressCountry,
      ]
        .filter(Boolean)
        .join(', ')
    : '';

  if (!personal && familyMembers.length === 0 && nominees.length === 0) {
    return (
      <NothingRecorded
        title="No personal details recorded"
        description="Personal details, family members and nominees will appear here once recorded."
      />
    );
  }

  return (
    <Stack gap="lg">
      {personal && (
        <Section title="Personal Details">
          <Fields
            items={[
              { label: 'Middle Name', value: personal.middleName },
              { label: 'Preferred Name', value: personal.preferredName },
              { label: 'Gender', value: personal.gender },
              {
                label: 'Date of Birth',
                value: personal.dateOfBirth ? formatDate(personal.dateOfBirth) : null,
              },
              { label: 'Marital Status', value: personal.maritalStatus },
              { label: 'Blood Group', value: personal.bloodGroup },
              { label: 'Nationality', value: personal.nationality },
              { label: 'Native Language', value: personal.nativeLanguage },
              { label: "Father's Name", value: personal.fatherName },
              { label: 'Guardian Name', value: personal.guardianName },
            ]}
          />
        </Section>
      )}

      {personal && (
        <Section title="Personal Contact">
          <Fields
            items={[
              { label: 'Personal Email', value: personal.personalEmail },
              { label: 'Home Phone', value: personal.homePhone },
              { label: 'Business Phone', value: personal.businessPhone },
              { label: 'Work Phone', value: personal.workPhone },
              { label: 'Address', value: address },
            ]}
          />
        </Section>
      )}

      {familyMembers.length > 0 && (
        <Section title="Family Members">
          <Table compact aria-label="Family members">
            <TableHead>
              <TableRow>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Relationship</TableHeaderCell>
                <TableHeaderCell>Date of Birth</TableHeaderCell>
                <TableHeaderCell>Phone</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {familyMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>{member.name}</TableCell>
                  <TableCell>{member.relationship}</TableCell>
                  <TableCell>{formatDate(member.dateOfBirth)}</TableCell>
                  <TableCell>{member.phone ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      )}

      {nominees.length > 0 && (
        <Section title="Nominees">
          <Table compact aria-label="Nominees">
            <TableHead>
              <TableRow>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Relationship</TableHeaderCell>
                <TableHeaderCell>Share</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {nominees.map((nominee) => (
                <TableRow key={nominee.id}>
                  <TableCell>{nominee.name}</TableCell>
                  <TableCell>{nominee.relationship}</TableCell>
                  <TableCell>{`${nominee.sharePercentage}%`}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      )}
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Emergency contacts
// ---------------------------------------------------------------------------

export function EmergencyContactsSection({ contacts }: { contacts: EmergencyContact[] }) {
  if (contacts.length === 0) {
    return (
      <NothingRecorded
        title="No emergency contacts recorded"
        description="Primary and secondary emergency contacts will appear here once recorded."
      />
    );
  }

  return (
    <Stack gap="lg">
      {contacts.map((contact) => (
        <Section
          key={contact.id}
          title={contact.priority === 'primary' ? 'Primary Contact' : 'Secondary Contact'}
          badge={
            contact.isPrivate ? (
              <Badge variant="neutral" size="sm">
                Private
              </Badge>
            ) : undefined
          }
        >
          <Fields
            items={[
              { label: 'Name', value: contact.name },
              { label: 'Relationship', value: contact.relationship },
              { label: 'Phone', value: contact.phone },
              { label: 'Email', value: contact.email },
              { label: 'Address', value: contact.address },
            ]}
          />
        </Section>
      ))}
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export function AccountsSection({ bankAccount }: { bankAccount: BankAccount | null }) {
  if (!bankAccount) {
    return (
      <NothingRecorded
        title="No bank account recorded"
        description="The employee's salary bank account will appear here once recorded."
      />
    );
  }

  return (
    <Section title="Bank Account">
      <Fields
        items={[
          { label: 'Account Holder', value: bankAccount.accountHolderName },
          { label: 'Account Number', value: bankAccount.accountNumberMasked },
          { label: 'IFSC Code', value: bankAccount.ifscCode },
          { label: 'Bank', value: bankAccount.bankName },
          { label: 'Branch', value: bankAccount.branchName },
          { label: 'Bank Location', value: bankAccount.bankLocation },
        ]}
      />
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

export function SkillsSection({
  skills,
  onOpenEmployee,
}: {
  skills: Skill[];
  onOpenEmployee: (employeeId: string) => void;
}) {
  if (skills.length === 0) {
    return (
      <NothingRecorded
        title="No skills recorded"
        description="Skills, proficiency and their assessment will appear here once recorded."
      />
    );
  }

  const person = (id: string | null, name: string | null) =>
    id && name ? (
      <Button variant="text" size="sm" onClick={() => onOpenEmployee(id)}>
        {name}
      </Button>
    ) : (
      '—'
    );

  return (
    <Table hoverable aria-label="Skills">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Skill</TableHeaderCell>
          <TableHeaderCell>Type</TableHeaderCell>
          <TableHeaderCell>Proficiency</TableHeaderCell>
          <TableHeaderCell>Level</TableHeaderCell>
          <TableHeaderCell>Assessed On</TableHeaderCell>
          <TableHeaderCell>Experience</TableHeaderCell>
          <TableHeaderCell>Examiner</TableHeaderCell>
          <TableHeaderCell>Verified By</TableHeaderCell>
          <TableHeaderCell>Mentor</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {skills.map((skill) => (
          <TableRow key={skill.id}>
            <TableCell>{skill.skillName}</TableCell>
            <TableCell>{skill.skillType}</TableCell>
            <TableCell>
              <Badge variant="info" size="sm">
                {skill.proficiency}
              </Badge>
            </TableCell>
            <TableCell>{skill.level ?? '—'}</TableCell>
            <TableCell>{formatDate(skill.assessedOn)}</TableCell>
            <TableCell>
              {skill.yearsOfExperience === null ? '—' : `${skill.yearsOfExperience} yrs`}
            </TableCell>
            <TableCell>{person(skill.examinerEmployeeId, skill.examinerName)}</TableCell>
            <TableCell>{person(skill.verifiedByEmployeeId, skill.verifiedByName)}</TableCell>
            <TableCell>{person(skill.mentorEmployeeId, skill.mentorName)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ---------------------------------------------------------------------------
// Work
// ---------------------------------------------------------------------------

export function WorkSection({ workSchedule }: { workSchedule: WorkSchedule | null }) {
  if (!workSchedule) {
    return (
      <NothingRecorded
        title="No working hours recorded"
        description="The employee's working days, hours and calendar will appear here once recorded."
      />
    );
  }

  return (
    <Section title="Working Hours">
      <Fields
        items={[
          { label: 'Work Schedule', value: workSchedule.workSchedule },
          { label: 'Working Calendar', value: workSchedule.workingCalendar },
          { label: 'Working Days', value: workSchedule.workingDays.join(', ') },
          { label: 'Hours', value: `${workSchedule.startTime} – ${workSchedule.endTime}` },
          { label: 'Break', value: `${workSchedule.breakMinutes} min` },
          { label: 'Lunch', value: `${workSchedule.lunchMinutes} min` },
          { label: 'Time Zone', value: workSchedule.timeZone },
        ]}
      />
    </Section>
  );
}
