import { useState, useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BezentIcon, CompanionIcon } from '../../design-system/icons';
import { Avatar } from '../../design-system/components';
import { ApprovalsDrawer } from '../../platform/approvals';
import { CalendarDrawer } from '../../platform/calendar';
import { NotesDrawer } from '../../platform/notes';
import { TasksDrawer } from '../../platform/tasks';
import {
  UTILITY_CAPABILITIES,
  UtilityDrawerShell,
  type UtilityCapabilityId,
} from '../../platform/utility-drawer';
import { useTheme } from '../providers/ThemeProvider';
import { useDevUtilityData } from './devUtilityFixtures';
import { ProfileMenu } from '../../layouts/app-shell/ProfileMenu';
import './StandaloneUtilityLayout.css';

const RAIL_CAPABILITIES = UTILITY_CAPABILITIES.filter((c) => c.placement === 'rail');
const DEFAULT_INITIALS = 'SD';
const DEFAULT_NAME = 'Sabin Dani';
const DEFAULT_EMAIL = 'sabin.dani@bezent.com';
const DEFAULT_ROLE = 'Platform Lead';

export function StandaloneUtilityLayout() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const data = useDevUtilityData();

  // Side panel expand / collapse state
  const [panelOpen, setPanelOpen] = useState(true);
  const [activeDrawerId, setActiveDrawerId] = useState<UtilityCapabilityId | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  // Identify current page capability
  const currentCapabilityId: UtilityCapabilityId = useMemo(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('calendar')) return 'calendar';
    if (path.includes('notes')) return 'notes';
    if (path.includes('tasks')) return 'tasks';
    if (path.includes('approvals')) return 'approvals';
    return 'calendar';
  }, [location.pathname]);

  const currentCapability = useMemo(() => {
    return (
      RAIL_CAPABILITIES.find((c) => c.id === currentCapabilityId) ?? {
        id: currentCapabilityId,
        label: 'Utility',
        title: 'Workspace Utility',
        icon: 'calendar' as const,
        placement: 'rail' as const,
      }
    );
  }, [currentCapabilityId]);

  // Remaining icons shown on expansion
  const remainingCapabilities = useMemo(() => {
    return RAIL_CAPABILITIES.filter((c) => c.id !== currentCapabilityId);
  }, [currentCapabilityId]);

  const activeDrawerCapability = useMemo(() => {
    if (!activeDrawerId) return null;
    return RAIL_CAPABILITIES.find((c) => c.id === activeDrawerId) ?? null;
  }, [activeDrawerId]);

  function handleBack() {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/hrms/employees');
    }
  }

  function renderDrawer(id: UtilityCapabilityId) {
    switch (id) {
      case 'tasks':
        return (
          <TasksDrawer
            tasks={data.tasks}
            onClose={() => setActiveDrawerId(null)}
            onCompleteTask={data.completeTask}
            onViewAll={() => {
              setActiveDrawerId(null);
              navigate('/tasks');
            }}
          />
        );
      case 'approvals':
        return (
          <ApprovalsDrawer
            approvals={data.approvals}
            onClose={() => setActiveDrawerId(null)}
            onViewAll={() => {
              setActiveDrawerId(null);
              navigate('/approvals');
            }}
          />
        );
      case 'calendar':
        return (
          <CalendarDrawer
            events={data.events}
            onClose={() => setActiveDrawerId(null)}
            onOpenFullCalendar={() => {
              setActiveDrawerId(null);
              navigate('/calendar');
            }}
          />
        );
      case 'notes':
        return (
          <NotesDrawer
            notes={data.notes}
            onClose={() => setActiveDrawerId(null)}
            onSave={data.saveNote}
            onDelete={data.deleteNote}
            onTogglePin={data.toggleNotePin}
            onViewAll={() => {
              setActiveDrawerId(null);
              navigate('/notes');
            }}
          />
        );
      default:
        return null;
    }
  }

  return (
    <div className="standalone-layout">
      {/* ── Standalone App Top Bar (No HRMS nav bars) ────────────────── */}
      <header className="standalone-header">
        <div className="standalone-header__left">
          <button
            type="button"
            className="standalone-header__back-btn"
            onClick={handleBack}
            title="Back to BEZENT Workspace"
          >
            <BezentIcon name="arrowLeft" size={16} color="currentColor" />
            <span>Workspace</span>
          </button>

          <span className="standalone-header__divider" aria-hidden="true" />

          <div className="standalone-header__brand">
            <CompanionIcon name={currentCapability.icon} size={26} active />
            <span className="standalone-header__title">{currentCapability.title}</span>
          </div>
        </div>

        <div className="standalone-header__right">
          <button
            type="button"
            className="standalone-header__action-btn"
            onClick={toggleTheme}
            title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <BezentIcon
              name={resolvedTheme === 'dark' ? 'sun' : 'moon'}
              size={18}
              color="currentColor"
            />
          </button>

          <div className="standalone-header__profile-anchor">
            <button
              type="button"
              className={`standalone-header__profile ${profileOpen ? 'is-active' : ''}`.trim()}
              aria-label="Profile and account menu"
              aria-expanded={profileOpen}
              aria-haspopup="menu"
              onClick={() => setProfileOpen((prev) => !prev)}
            >
              <Avatar initials={DEFAULT_INITIALS} />
            </button>

            <ProfileMenu
              isOpen={profileOpen}
              onClose={() => setProfileOpen(false)}
              userInitials={DEFAULT_INITIALS}
              userName={DEFAULT_NAME}
              userEmail={DEFAULT_EMAIL}
              userRole={DEFAULT_ROLE}
              onMyProfile={() => {
                setProfileOpen(false);
                navigate('/hrms/employees');
              }}
              onAccountSettings={() => {
                setProfileOpen(false);
                navigate('/hrms/settings');
              }}
              onSignOut={() => setProfileOpen(false)}
              onSwitchAccount={() => setProfileOpen(false)}
              onHelp={() => setProfileOpen(false)}
            />
          </div>

          <button
            type="button"
            className={`standalone-header__side-toggle ${panelOpen ? 'is-active' : ''}`.trim()}
            onClick={() => setPanelOpen((v) => !v)}
            title={panelOpen ? 'Collapse companion panel' : 'Expand companion panel'}
          >
            <BezentIcon
              name={panelOpen ? 'chevronRight' : 'chevronLeft'}
              size={16}
              color="currentColor"
            />
            <span>{panelOpen ? 'Panel' : 'Expand'}</span>
          </button>
        </div>
      </header>

      {/* ── Main Layout Body ─────────────────────────────────────────── */}
      <div className="standalone-layout__body">
        {/* Full-page main capability view */}
        <main className="standalone-layout__main">
          <Outlet context={data} />
        </main>

        {/* Side Drawer if a remaining utility is opened */}
        {activeDrawerCapability && (
          <aside className="standalone-layout__drawer">
            <UtilityDrawerShell
              key={activeDrawerCapability.id}
              title={activeDrawerCapability.title}
              icon={activeDrawerCapability.icon}
              onClose={() => setActiveDrawerId(null)}
            >
              {renderDrawer(activeDrawerCapability.id)}
            </UtilityDrawerShell>
          </aside>
        )}

        {/* Expandable Companion Rail: remaining icons seen on expansion */}
        <aside
          className={`standalone-companion-rail ${panelOpen ? 'is-open' : 'is-collapsed'}`.trim()}
        >
          <div className="standalone-companion-rail__items">
            {remainingCapabilities.map((cap) => {
              const isActive = activeDrawerId === cap.id;
              return (
                <button
                  key={cap.id}
                  type="button"
                  className={`standalone-companion-rail__btn ${isActive ? 'is-active' : ''}`.trim()}
                  onClick={() => setActiveDrawerId(isActive ? null : cap.id)}
                  title={cap.title}
                >
                  <CompanionIcon name={cap.icon} size={22} active={isActive} />
                </button>
              );
            })}
          </div>

          <div className="standalone-companion-rail__footer">
            <button
              type="button"
              className="standalone-companion-rail__collapse-btn"
              onClick={() => setPanelOpen(false)}
              title="Hide side panel"
            >
              <BezentIcon name="chevronRight" size={16} color="currentColor" />
            </button>
          </div>
        </aside>

        {/* Floating trigger button when companion rail is collapsed */}
        {!panelOpen && (
          <button
            type="button"
            className="standalone-collapsed-trigger"
            onClick={() => setPanelOpen(true)}
            title="Show companion utilities"
          >
            <BezentIcon name="chevronLeft" size={16} color="currentColor" />
            <span>Companion</span>
          </button>
        )}
      </div>
    </div>
  );
}
