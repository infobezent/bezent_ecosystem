import { and, eq } from 'drizzle-orm';
import { getDb } from '../../../../../db/connection.js';
import { leaveTypes } from '../../../../../db/schema.js';
import { leaveDefaultsService } from '../../service/leaveDefaults.service.js';

/**
 * Test helper: provisions the default leave types for a company (idempotent) and returns the id of
 * the type with the given code (AL, CL, SL or LOP), for tests that insert leave requests directly.
 */
export async function ensureLeaveTypeId(
  tenantId: string,
  companyId: string,
  code: 'AL' | 'CL' | 'SL' | 'LOP',
): Promise<string> {
  await leaveDefaultsService.ensureDefaultLeaveSetup(tenantId, companyId);
  const [row] = await getDb()
    .select({ id: leaveTypes.id })
    .from(leaveTypes)
    .where(
      and(
        eq(leaveTypes.tenantId, tenantId),
        eq(leaveTypes.companyId, companyId),
        eq(leaveTypes.code, code),
      ),
    );
  if (!row) throw new Error(`Leave type ${code} is not configured for ${companyId}`);
  return row.id;
}
