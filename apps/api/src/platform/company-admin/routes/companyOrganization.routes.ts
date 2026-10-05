/**
 * Compatibility adapter for /api/v1/company-admin/organization.
 * Re-exports canonical Platform Organization router.
 */
export { organizationRouter as companyOrganizationRouter } from '../../organization/routes/organization.routes.js';
