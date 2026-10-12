import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Grid,
  Input,
  Select,
  Switch,
  Stack,
  Button,
  Alert,
  LoadingState,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  Divider,
  Actions,
} from '../../../../../design-system/components';
import { SettingsRow } from '../components/SettingsRow';
import {
  fetchSecuritySettings,
  updateSecuritySettings,
} from '../../../attendance/api/attendanceApi';
import type {
  AttendanceSecuritySettings,
  GeofenceConfigItem,
} from '../../../attendance/types/attendance.types';

export function LocationSecurityTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [enableGps, setEnableGps] = useState(true);
  const [geofences, setGeofences] = useState<GeofenceConfigItem[]>([]);
  const [ipAllowlist, setIpAllowlist] = useState('192.168.1.0/24, 10.0.0.0/16');
  const [enforceIpRestriction, setEnforceIpRestriction] = useState(false);
  const [maxDevicesPerEmployee, setMaxDevicesPerEmployee] = useState(2);
  const [allowSharedKiosk, setAllowSharedKiosk] = useState(true);
  const [detectMockLocation, setDetectMockLocation] = useState(true);
  const [detectImpossibleTravel, setDetectImpossibleTravel] = useState(true);
  const [rapidPunchThrottlingSeconds, setRapidPunchThrottlingSeconds] = useState(60);
  const [flagVpnProxy, setFlagVpnProxy] = useState(true);

  // New Geofence form
  const [geoName, setGeoName] = useState('');
  const [geoLat, setGeoLat] = useState('12.9716');
  const [geoLng, setGeoLng] = useState('77.5946');
  const [geoRadius, setGeoRadius] = useState(100);
  const [geoStrict] = useState(true);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data: AttendanceSecuritySettings = await fetchSecuritySettings();
      setEnableGps(Boolean(data.enableGps));
      if (Array.isArray(data.geofenceConfigs)) {
        setGeofences(data.geofenceConfigs);
      }
      if (Array.isArray(data.ipAllowlist)) {
        setIpAllowlist(data.ipAllowlist.join(', '));
      }
      setEnforceIpRestriction(Boolean(data.enforceIpRestriction));
      setMaxDevicesPerEmployee(data.maxDevicesPerEmployee ?? 2);
      setAllowSharedKiosk(Boolean(data.allowSharedKiosk));
      setDetectMockLocation(Boolean(data.detectMockLocation));
      setDetectImpossibleTravel(Boolean(data.detectImpossibleTravel));
      setRapidPunchThrottlingSeconds(data.rapidPunchThrottlingSeconds ?? 60);
      setFlagVpnProxy(Boolean(data.flagVpnProxy));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load security settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleAddGeofence = () => {
    if (!geoName.trim() || !geoLat || !geoLng) return;
    const newG: GeofenceConfigItem = {
      locationId: `geo_${Date.now()}`,
      name: geoName.trim(),
      latitude: Number(geoLat),
      longitude: Number(geoLng),
      radiusMeters: Number(geoRadius) || 100,
      enforceStrict: geoStrict,
    };
    setGeofences((prev) => [...prev, newG]);
    setGeoName('');
  };

  const handleRemoveGeofence = (idx: number) => {
    setGeofences((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const ipList = ipAllowlist
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await updateSecuritySettings({
        enableGps,
        geofenceConfigs: geofences,
        ipAllowlist: ipList,
        enforceIpRestriction,
        maxDevicesPerEmployee,
        allowSharedKiosk,
        detectMockLocation,
        detectImpossibleTravel,
        rapidPunchThrottlingSeconds,
        flagVpnProxy,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save security settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading Attendance Location & Security Settings..." />;
  }

  return (
    <Stack gap="lg">
      {error && <Alert variant="error">{error}</Alert>}
      {success && (
        <Alert variant="success">Location & Security settings updated successfully.</Alert>
      )}

      <Card variant="flat" padding="lg">
        <Stack gap="md">
          {/* GPS Enforcement */}
          <SettingsRow
            label="GPS Coordinate Capture"
            icon="hub"
            info="Requires browser/device geolocation permissions before check-in can be recorded."
          >
            <Switch checked={enableGps} onChange={(e) => setEnableGps(e.target.checked)} />
          </SettingsRow>

          {enableGps && (
            <Card variant="flat" padding="md">
              <Stack gap="md">
                <Table compact hoverable>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Geofence Workplace</TableHeaderCell>
                      <TableHeaderCell>Coordinates (Lat, Lng)</TableHeaderCell>
                      <TableHeaderCell>Radius (Meters)</TableHeaderCell>
                      <TableHeaderCell>Enforce Strict</TableHeaderCell>
                      <TableHeaderCell>Actions</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {geofences.map((g, idx) => (
                      <TableRow key={g.locationId}>
                        <TableCell>
                          <strong>{g.name}</strong>
                        </TableCell>
                        <TableCell>
                          {g.latitude}, {g.longitude}
                        </TableCell>
                        <TableCell>{g.radiusMeters}m</TableCell>
                        <TableCell>{g.enforceStrict ? 'Strict' : 'Advisory'}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveGeofence(idx)}
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Add geofence inline */}
                <Grid columns={3} gap="sm">
                  <Input
                    label="Campus Name"
                    value={geoName}
                    onChange={(e) => setGeoName(e.target.value)}
                    placeholder="e.g. Branch Office"
                  />
                  <Input
                    label="Latitude"
                    value={geoLat}
                    onChange={(e) => setGeoLat(e.target.value)}
                    placeholder="12.9716"
                  />
                  <Input
                    label="Longitude"
                    value={geoLng}
                    onChange={(e) => setGeoLng(e.target.value)}
                    placeholder="77.5946"
                  />
                </Grid>
                <Grid columns={2} gap="sm">
                  <Input
                    label="Radius (Meters)"
                    type="number"
                    value={String(geoRadius)}
                    onChange={(e) => setGeoRadius(Number(e.target.value))}
                  />
                  <div>
                    <label className="bezent-label">&nbsp;</label>
                    <Button variant="outline" onClick={handleAddGeofence}>
                      Add Geofence Boundary
                    </Button>
                  </div>
                </Grid>
              </Stack>
            </Card>
          )}

          <Divider spacing="sm" />

          {/* Enforce IP Restriction */}
          <SettingsRow
            label="Enforce IP Restriction"
            icon="security"
            info="Strictly reject punch requests originating outside authorized office networks."
          >
            <Switch
              checked={enforceIpRestriction}
              onChange={(e) => setEnforceIpRestriction(e.target.checked)}
            />
          </SettingsRow>

          <Divider spacing="sm" />

          {/* Allowed IP Networks */}
          <SettingsRow
            label="Office IP Networks (CIDR)"
            icon="hub"
            info="Comma separated IPv4/IPv6 networks."
          >
            <Input
              value={ipAllowlist}
              onChange={(e) => setIpAllowlist(e.target.value)}
              placeholder="192.168.1.0/24, 10.0.0.0/16"
            />
          </SettingsRow>

          <Divider spacing="sm" />

          {/* Device Binding Limit */}
          <SettingsRow
            label="Device Binding Limit"
            icon="devices"
            info="Max registered unique devices per employee."
          >
            <Select
              value={String(maxDevicesPerEmployee)}
              onChange={(e) => setMaxDevicesPerEmployee(Number(e.target.value))}
              options={[
                { value: '1', label: '1 Device (Strict)' },
                { value: '2', label: '2 Devices (Mobile + PC)' },
                { value: '3', label: '3 Devices' },
                { value: '5', label: '5 Devices' },
              ]}
            />
          </SettingsRow>

          <Divider spacing="sm" />

          {/* Rapid Punch Throttle */}
          <SettingsRow
            label="Rapid Punch Throttle (Seconds)"
            icon="schedule"
            info="Suppresses accidental multiple rapid touches within window."
          >
            <Select
              value={String(rapidPunchThrottlingSeconds)}
              onChange={(e) => setRapidPunchThrottlingSeconds(Number(e.target.value))}
              options={[
                { value: '30', label: '30 Seconds' },
                { value: '60', label: '60 Seconds' },
                { value: '120', label: '120 Seconds' },
                { value: '300', label: '5 Minutes' },
              ]}
            />
          </SettingsRow>

          <Divider spacing="sm" />

          {/* Shared Kiosk */}
          <SettingsRow
            label="Allow Shared Kiosk Mode"
            icon="devices"
            info="Permits multiple employees to punch in from a registered tablet kiosk."
          >
            <Switch
              checked={allowSharedKiosk}
              onChange={(e) => setAllowSharedKiosk(e.target.checked)}
            />
          </SettingsRow>

          <Divider spacing="sm" />

          {/* Mock Location Detection */}
          <SettingsRow
            label="Detect Mock Location Signals"
            icon="security"
            info="Flags attempts to bypass geofences via GPS mocking applications."
          >
            <Switch
              checked={detectMockLocation}
              onChange={(e) => setDetectMockLocation(e.target.checked)}
            />
          </SettingsRow>

          <Divider spacing="sm" />

          {/* Impossible Travel */}
          <SettingsRow
            label="Detect Impossible Travel Velocity"
            icon="security"
            info="Flags consecutive punches from distant coordinates in short windows."
          >
            <Switch
              checked={detectImpossibleTravel}
              onChange={(e) => setDetectImpossibleTravel(e.target.checked)}
            />
          </SettingsRow>

          <Divider spacing="sm" />

          {/* VPN / Proxy Detection */}
          <SettingsRow
            label="Flag Anonymous VPN / Residential Proxies"
            icon="security"
            info="Audits punches submitted through suspicious proxy tunnels."
          >
            <Switch checked={flagVpnProxy} onChange={(e) => setFlagVpnProxy(e.target.checked)} />
          </SettingsRow>
        </Stack>
      </Card>

      {/* Save Action */}
      <Actions align="end">
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </Actions>
    </Stack>
  );
}

export default LocationSecurityTab;
