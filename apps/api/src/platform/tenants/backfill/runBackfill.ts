import { tenantManagementBackfillService } from './tenantManagementBackfill.service.js';

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`[Backfill] Starting Tenant Management Phase 01 backfill (dryRun: ${isDryRun})...`);

  const report = await tenantManagementBackfillService.runBackfill({
    dryRun: isDryRun,
    actorEmail: 'admin@bezent.local',
  });

  console.log('----------------------------------------------------');
  console.log('BACKFILL CLASSIFICATION REPORT');
  console.log('----------------------------------------------------');
  console.log(`Total Tenants Processed: ${report.totalTenantsProcessed}`);
  console.log(`Already Configured Primary Admins: ${report.alreadyConfigured.length}`);
  console.log(`Safe Automatic Designations: ${report.safeAutomatic.length}`);
  console.log(`Requires Business Confirmation (Ambiguous): ${report.requiresBusinessConfirmation.length}`);
  console.log(`Requires Manual Reconciliation (Missing Admin): ${report.requiresManualReconciliation.length}`);
  console.log('Preserved Baseline:');
  console.log(`  - Total Companies: ${report.preservedDataSummary.totalCompanies}`);
  console.log(`  - Total Tenant Module Entitlements: ${report.preservedDataSummary.totalTenantModuleEntitlements}`);

  if (report.safeAutomatic.length > 0) {
    console.log('\n[Safe Automatic Mapping]:');
    for (const item of report.safeAutomatic) {
      console.log(`  - ${item.tenantName} (${item.tenantId}) -> Admin User: ${item.targetAdminUserId}`);
    }
  }

  if (report.requiresBusinessConfirmation.length > 0) {
    console.log('\n[Requires Business Confirmation]:');
    for (const item of report.requiresBusinessConfirmation) {
      console.log(`  - ${item.tenantName} (${item.tenantId}): ${item.reason} (Candidates: ${item.candidateAdminUserIds.join(', ')})`);
    }
  }

  if (report.requiresManualReconciliation.length > 0) {
    console.log('\n[Requires Manual Reconciliation]:');
    for (const item of report.requiresManualReconciliation) {
      console.log(`  - ${item.tenantName} (${item.tenantId}): ${item.reason}`);
    }
  }

  console.log('----------------------------------------------------');
  console.log(`[Backfill] Completed successfully. Executed: ${!isDryRun}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[Backfill] Fatal error:', err);
    process.exit(1);
  });
