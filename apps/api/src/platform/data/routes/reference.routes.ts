/**
 * BEZENT Platform Reference Data Routes
 * Mounted at /api/v1/platform/reference
 */

import { Router, type Request, type Response } from 'express';
import { referenceDataService } from '../reference/referenceData.service.js';
import { getAddressRules } from '../address/addressRules.js';
import { postalLookupService } from '../address/postalLookup.service.js';

export const referenceRouter = Router();

// GET /api/v1/platform/reference/countries
referenceRouter.get('/countries', (_req: Request, res: Response) => {
  const countries = referenceDataService.getCountries();
  res.json({ data: countries });
});

// GET /api/v1/platform/reference/countries/:countryCode/regions
referenceRouter.get('/countries/:countryCode/regions', (req: Request, res: Response) => {
  const countryCode = typeof req.params.countryCode === 'string' ? req.params.countryCode : '';
  const regions = referenceDataService.getRegions(countryCode);
  res.json({ data: regions });
});

// GET /api/v1/platform/reference/currencies
referenceRouter.get('/currencies', (_req: Request, res: Response) => {
  const currencies = referenceDataService.getCurrencies();
  res.json({ data: currencies });
});

// GET /api/v1/platform/reference/timezones
referenceRouter.get('/timezones', (_req: Request, res: Response) => {
  const timezones = referenceDataService.getTimezones();
  res.json({ data: timezones });
});

// GET /api/v1/platform/reference/locales
referenceRouter.get('/locales', (_req: Request, res: Response) => {
  const locales = referenceDataService.getLocales();
  res.json({ data: locales });
});

// GET /api/v1/platform/reference/languages
referenceRouter.get('/languages', (_req: Request, res: Response) => {
  const languages = referenceDataService.getLanguages();
  res.json({ data: languages });
});

// GET /api/v1/platform/reference/date-formats
referenceRouter.get('/date-formats', (_req: Request, res: Response) => {
  const dateFormats = referenceDataService.getDateFormats();
  res.json({ data: dateFormats });
});

// GET /api/v1/platform/reference/week-start-days
referenceRouter.get('/week-start-days', (_req: Request, res: Response) => {
  const weekStartDays = referenceDataService.getWeekStartDays();
  res.json({ data: weekStartDays });
});

// GET /api/v1/platform/reference/industries
referenceRouter.get('/industries', (_req: Request, res: Response) => {
  const industries = referenceDataService.getIndustries();
  res.json({ data: industries });
});

// GET /api/v1/platform/reference/organization-types
referenceRouter.get('/organization-types', (_req: Request, res: Response) => {
  const orgTypes = referenceDataService.getOrganizationTypes();
  res.json({ data: orgTypes });
});

// GET /api/v1/platform/reference/address-rules/:countryCode
referenceRouter.get('/address-rules/:countryCode', (req: Request, res: Response) => {
  const countryCode = typeof req.params.countryCode === 'string' ? req.params.countryCode : undefined;
  const rules = getAddressRules(countryCode);
  res.json({ data: rules });
});

// POST /api/v1/platform/reference/postal-lookup
referenceRouter.post('/postal-lookup', async (req: Request, res: Response) => {
  const { countryCode, postalCode } = req.body || {};
  const result = await postalLookupService.lookup({ countryCode, postalCode });
  res.json({ data: result });
});
