import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { eq, inArray } from 'drizzle-orm';
import { createApp } from '../../../../../app/server/createApp.js';
import { getDb, pingDatabase } from '../../../../../db/connection.js';
import {
  companies,
  formCustomizations,
  formCustomFields,
  formFieldOverrides,
} from '../../../../../db/schema.js';

/**
 * MySQL-backed tests for the Form Engine API (Employee Registration system
 * form). Uses throwaway companies so the demo company's configuration is
 * never changed.
 */
describe('HRMS Forms API — Employee Registration (MySQL)', () => {
  const app = createApp();
  const tenantId = 'tenant_demo_01';
  const run = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const companyA = `comp_ff_a_${run}`;
  const companyB = `comp_ff_b_${run}`;
  const headersA = { 'x-tenant-id': tenantId, 'x-company-id': companyA };
  const headersB = { 'x-tenant-id': tenantId, 'x-company-id': companyB };
  const base = '/api/v1/hrms/settings/forms/employee-registration';

  type Body = {
    data: {
      form: { version: number };
      sections: {
        key: string;
        fields: { key: string; order: number; width: string; label: string }[];
      }[];
    };
  };
  const getForm = (headers: Record<string, string>) => request(app).get(base).set(headers);
  const getOverrides = (headers: Record<string, string>) =>
    request(app).get(`${base}/overrides`).set(headers);
  const put = (headers: Record<string, string>, fields: unknown[]) =>
    request(app).put(`${base}/overrides`).set(headers).send({ fields });
  const saveForm = (headers: Record<string, string>, payload: string | object) =>
    request(app).put(base).set(headers).send(payload);
  const fieldOf = (body: Body, key: string) =>
    body.data.sections.flatMap((s) => s.fields).find((f) => f.key === key);
  const rowsOf = (companyId: string) =>
    getDb().select().from(formFieldOverrides).where(eq(formFieldOverrides.companyId, companyId));

  beforeAll(async () => {
    const connected = await pingDatabase();
    if (!connected) {
      throw new Error(
        'MySQL database is unreachable. Start MySQL to run MySQL-backed integration tests.',
      );
    }
    await getDb()
      .insert(companies)
      .values([
        {
          id: companyA,
          tenantId,
          name: 'Form Engine A',
          code: `FFA${run}`.slice(0, 50),
          status: 'active',
        },
        {
          id: companyB,
          tenantId,
          name: 'Form Engine B',
          code: `FFB${run}`.slice(0, 50),
          status: 'active',
        },
      ]);
  });

  afterAll(async () => {
    const db = getDb();
    await db
      .delete(formFieldOverrides)
      .where(inArray(formFieldOverrides.companyId, [companyA, companyB]));
    await db
      .delete(formCustomFields)
      .where(inArray(formCustomFields.companyId, [companyA, companyB]));
    await db
      .delete(formCustomizations)
      .where(inArray(formCustomizations.companyId, [companyA, companyB]));
    await db.delete(companies).where(inArray(companies.id, [companyA, companyB]));
  });

  it('resolves the system definition for a company without overrides (no seeding)', async () => {
    const res = await getForm(headersA);
    expect(res.status).toBe(200);
    expect(res.body.data.form).toMatchObject({
      key: 'employee-registration',
      name: 'Employee Registration',
      kind: 'system',
      status: 'active',
    });
    expect(res.body.data.sections).toHaveLength(10);
    expect(fieldOf(res.body, 'personal.bloodGroup')).toMatchObject({
      type: 'dropdown',
      enabled: true,
      required: false,
      overridden: false,
    });
    expect(fieldOf(res.body, 'personal.firstName')).toMatchObject({
      protected: true,
      enabled: true,
      required: true,
    });

    const overrides = await getOverrides(headersA);
    expect(overrides.status).toBe(200);
    expect(overrides.body.data).toEqual({
      formKey: 'employee-registration',
      version: 0,
      fields: [],
      customFields: [],
    });
  });

  it('returns 404 for an unknown form', async () => {
    const res = await request(app).get('/api/v1/hrms/settings/forms/no-such-form').set(headersA);
    expect(res.status).toBe(404);
  });

  it('persists overrides, storing only properties that differ from the default', async () => {
    const saved = await put(headersA, [
      { key: 'personal.bloodGroup', enabled: false, required: false },
      { key: 'personal.middleName', enabled: true, required: true },
      { key: 'personal.lastName', enabled: true, required: false },
    ]);
    expect(saved.status).toBe(200);
    expect(fieldOf(saved.body, 'personal.bloodGroup')).toMatchObject({
      enabled: false,
      overridden: true,
    });

    const reloaded = await getForm(headersA);
    expect(fieldOf(reloaded.body, 'personal.bloodGroup')).toMatchObject({
      enabled: false,
      required: false,
    });
    expect(fieldOf(reloaded.body, 'personal.middleName')).toMatchObject({
      enabled: true,
      required: true,
    });
    expect(fieldOf(reloaded.body, 'personal.lastName')).toMatchObject({ overridden: false });

    const overrides = await getOverrides(headersA);
    expect(
      overrides.body.data.fields.map(
        (f: { fieldKey: string; enabled: boolean | null; required: boolean | null }) => ({
          fieldKey: f.fieldKey,
          enabled: f.enabled,
          required: f.required,
        }),
      ),
    ).toEqual([
      { fieldKey: 'personal.bloodGroup', enabled: false, required: null },
      { fieldKey: 'personal.middleName', enabled: null, required: true },
    ]);
  });

  it("never lets company A's overrides affect company B", async () => {
    const res = await getForm(headersB);
    expect(fieldOf(res.body, 'personal.bloodGroup')).toMatchObject({
      enabled: true,
      overridden: false,
    });
    expect(fieldOf(res.body, 'personal.middleName')).toMatchObject({ required: false });
    expect((await getOverrides(headersB)).body.data.fields).toEqual([]);
    expect(await rowsOf(companyB)).toHaveLength(0);
  });

  it('rejects a crafted request that disables or relaxes a protected field', async () => {
    const disable = await put(headersA, [
      { key: 'personal.firstName', enabled: false, required: false },
    ]);
    expect(disable.status).toBe(400);
    const optional = await put(headersA, [
      { key: 'general.employeeId', enabled: true, required: false },
    ]);
    expect(optional.status).toBe(400);
    const outsideScope = await put(headersA, [
      { key: 'online_access.companyEmail', enabled: false, required: false },
    ]);
    expect(outsideScope.status).toBe(400);

    expect((await rowsOf(companyA)).map((r) => r.fieldKey).sort()).toEqual([
      'personal.bloodGroup',
      'personal.middleName',
    ]);
  });

  it('rejects the whole update when any field is invalid (nothing partially saved)', async () => {
    const res = await put(headersA, [
      { key: 'personal.gender', enabled: false, required: false },
      { key: 'personal.unknownField', enabled: true, required: false },
    ]);
    expect(res.status).toBe(400);
    expect(fieldOf((await getForm(headersA)).body, 'personal.gender')).toMatchObject({
      enabled: true,
    });
  });

  it('removes the override row when a field is set back to its defaults', async () => {
    await put(headersA, [{ key: 'personal.bloodGroup', enabled: true, required: false }]);
    expect(fieldOf((await getForm(headersA)).body, 'personal.bloodGroup')).toMatchObject({
      enabled: true,
      overridden: false,
    });
    expect((await rowsOf(companyA)).map((r) => r.fieldKey)).toEqual(['personal.middleName']);
  });

  it('saves full form definition with custom fields and increments version', async () => {
    const current = await getForm(headersA);
    const version = current.body.data.form.version;

    const generalSection = current.body.data.sections.find(
      (s: { key: string }) => s.key === 'general',
    );
    const personalSection = current.body.data.sections.find(
      (s: { key: string }) => s.key === 'personal',
    );

    const customKey = 'custom.0123456789abcdef0123456789abcdef';
    const payload = {
      version,
      sections: [
        {
          key: 'general',
          fields: generalSection.fields.map(
            (f: {
              key: string;
              origin: string;
              label: string;
              description: string | null;
              enabled: boolean;
              required: boolean;
              width: string;
            }) => ({
              key: f.key,
              origin: f.origin,
              label: f.label,
              description: f.description,
              enabled: f.enabled,
              required: f.required,
              width: f.width,
            }),
          ),
        },
        {
          key: 'personal',
          fields: [
            {
              key: customKey,
              origin: 'custom',
              label: 'Emergency Note',
              description: 'Special note for emergency handling',
              enabled: true,
              required: false,
              width: 'full',
              type: 'single_line',
              config: {},
            },
            ...personalSection.fields.map(
              (f: {
                key: string;
                origin: string;
                label: string;
                description: string | null;
                enabled: boolean;
                required: boolean;
                width: string;
              }) => ({
                key: f.key,
                origin: f.origin,
                label: f.label,
                description: f.description,
                enabled: f.enabled,
                required: f.required,
                width: f.width,
              }),
            ),
          ],
        },
      ],
    };

    const res = await saveForm(headersA, payload);
    expect(res.status).toBe(200);
    expect(res.body.data.form.version).toBe(version + 1);

    const personal = res.body.data.sections.find((s: { key: string }) => s.key === 'personal');
    expect(personal.fields[0]).toMatchObject({
      key: customKey,
      label: 'Emergency Note',
      origin: 'custom',
      order: 1,
      width: 'full',
    });

    // Concurrency conflict test: saving with stale version returns 409
    const conflict = await saveForm(headersA, { ...payload, version });
    expect(conflict.status).toBe(409);
  });
});
