import { useMemo, useState } from 'react';
import {
  Alert,
  Inline,
  Page,
  PageHeader,
  SearchInput,
  Select,
  Stack,
  Tabs,
  Toolbar,
} from '../../../../design-system/components';
import { INITIAL_TALENT_PROFILES } from '../data/mockTalentPool';
import { INITIAL_JOB_OPENINGS } from '../data/mockJobOpenings';
import type { EngagementTouchpoint, ReEngageInput, TalentProfile } from '../types/talentPool';
import { TalentMetrics } from '../components/TalentMetrics';
import { TalentTable } from '../components/TalentTable';
import { TalentProfileModal } from '../components/TalentProfileModal';
import { ReEngageModal } from '../components/ReEngageModal';

export function TalentPoolPage() {
  const [talent, setTalent] = useState<TalentProfile[]>(INITIAL_TALENT_PROFILES);
  const [tabFilter, setTabFilter] = useState<
    'all' | 'silver_medalists' | 'available' | 'consent_due'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState('all');

  const [selectedProfile, setSelectedProfile] = useState<TalentProfile | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isReEngageOpen, setIsReEngageOpen] = useState(false);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  // Counts
  const counts = useMemo(() => {
    return {
      all: talent.length,
      silver_medalists: talent.filter((t) => t.source === 'silver_medalist').length,
      available: talent.filter((t) => t.status === 'available').length,
      consent_due: talent.filter(
        (t) => t.consentStatus === 'consent_expiring_soon' || t.consentStatus === 'consent_expired',
      ).length,
    };
  }, [talent]);

  // Filtered
  const filteredTalent = useMemo(() => {
    return talent.filter((t) => {
      // Tab filter
      if (tabFilter === 'silver_medalists' && t.source !== 'silver_medalist') return false;
      if (tabFilter === 'available' && t.status !== 'available') return false;
      if (
        tabFilter === 'consent_due' &&
        !(t.consentStatus === 'consent_expiring_soon' || t.consentStatus === 'consent_expired')
      )
        return false;

      // Skill filter
      if (skillFilter !== 'all' && !t.skills.includes(skillFilter)) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = t.fullName.toLowerCase().includes(q);
        const matchesCompany = t.currentCompany.toLowerCase().includes(q);
        const matchesTitle = t.primaryRole.toLowerCase().includes(q);
        const matchesTag = t.tags.some((tag) => tag.toLowerCase().includes(q));
        if (!matchesName && !matchesCompany && !matchesTitle && !matchesTag) {
          return false;
        }
      }

      return true;
    });
  }, [talent, tabFilter, skillFilter, searchQuery]);

  // Handlers
  const handleSelectProfile = (profile: TalentProfile) => {
    setSelectedProfile(profile);
    setIsDetailOpen(true);
  };

  const handleReEngageClick = (profile: TalentProfile) => {
    setSelectedProfile(profile);
    setIsReEngageOpen(true);
  };

  const handleConfirmReEngage = (input: ReEngageInput) => {
    setTalent((prev) =>
      prev.map((t) => {
        if (t.id !== input.talentId) return t;
        const newTouchpoint: EngagementTouchpoint = {
          id: `eng-${Date.now()}`,
          date: new Date().toISOString().slice(0, 10),
          type: input.outreachChannel === 'phone' ? 'call' : 'email',
          summary: `Re-engaged into active pipeline (${input.fastTrackStage} stage). Outreach message sent.`,
          contactedBy: 'Talent Acquisition Team',
        };
        return {
          ...t,
          status: 're_engaged',
          engagementHistory: [newTouchpoint, ...t.engagementHistory],
        };
      }),
    );

    const job = INITIAL_JOB_OPENINGS.find((j) => j.id === input.targetJobId);
    setBannerNotice(
      `Successfully re-engaged ${selectedProfile?.fullName} into ${job?.title || 'requisition'} at ${input.fastTrackStage} stage!`,
    );
  };

  const handleAddTouchpoint = (talentId: string, touchpoint: EngagementTouchpoint) => {
    setTalent((prev) =>
      prev.map((t) => {
        if (t.id !== talentId) return t;
        return {
          ...t,
          engagementHistory: [touchpoint, ...t.engagementHistory],
        };
      }),
    );
  };

  return (
    <Page>
      <PageHeader
        title="Talent Pool &amp; Network"
        subtitle="Rediscover past applicants, runner-ups (silver medalists), and high-potential talent with statutory DPDP/GDPR consent management."
      />

      <Stack gap="lg">
        {bannerNotice && (
          <Alert variant="success" onDismiss={() => setBannerNotice(null)}>
            {bannerNotice}
          </Alert>
        )}

        {/* 1. Metrics */}
        <TalentMetrics talent={talent} />

        {/* 2. Tabs */}
        <Tabs
          items={[
            { id: 'all', label: `All Talent (${counts.all})` },
            { id: 'silver_medalists', label: `Silver Medalists (${counts.silver_medalists})` },
            { id: 'available', label: `Ready to Re-Engage (${counts.available})` },
            { id: 'consent_due', label: `Consent Action Due (${counts.consent_due})` },
          ]}
          activeId={tabFilter}
          onChange={(id) => setTabFilter(id as typeof tabFilter)}
        />

        {/* 3. Toolbar */}
        <Toolbar>
          <Inline justify="between" align="center" className="w-full">
            <Inline align="center" gap="md">
              <SearchInput
                placeholder="Search talent name, company, skill, tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery('')}
              />

              <Select
                value={skillFilter}
                onChange={(e) => setSkillFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Skill Domains' },
                  { value: 'React', label: 'React / Frontend' },
                  { value: 'Node.js', label: 'Node.js / Backend' },
                  { value: 'Figma', label: 'Figma / UX' },
                  { value: 'Kubernetes', label: 'Kubernetes / DevOps' },
                  { value: 'Python', label: 'Python / Data' },
                ]}
              />
            </Inline>

            <span className="bezent-text-xs bezent-text-secondary">
              Showing {filteredTalent.length} of {talent.length} talent profiles
            </span>
          </Inline>
        </Toolbar>

        {/* 4. Table */}
        <TalentTable
          talent={filteredTalent}
          onSelectTalent={handleSelectProfile}
          onReEngage={handleReEngageClick}
        />
      </Stack>

      {/* Profile Details Modal */}
      <TalentProfileModal
        profile={selectedProfile}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedProfile(null);
        }}
        onReEngage={handleReEngageClick}
        onAddTouchpoint={handleAddTouchpoint}
      />

      {/* Re-Engage Modal */}
      <ReEngageModal
        profile={selectedProfile}
        isOpen={isReEngageOpen}
        onClose={() => {
          setIsReEngageOpen(false);
          setSelectedProfile(null);
        }}
        onConfirmReEngage={handleConfirmReEngage}
        jobOpenings={INITIAL_JOB_OPENINGS}
      />
    </Page>
  );
}

export default TalentPoolPage;
