import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  Inline,
  Stack,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type { Candidate, CandidateStage } from '../types/candidate';
import { ACTIVE_PIPELINE_STAGES } from '../types/pipeline';

export interface PipelineCandidateCardProps {
  candidate: Candidate;
  onSelectCandidate: (candidate: Candidate) => void;
  onStageChange: (candidateId: string, newStage: CandidateStage) => void;
}

export function PipelineCandidateCard({
  candidate,
  onSelectCandidate,
  onStageChange,
}: PipelineCandidateCardProps) {
  const initials = candidate.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2);

  const currentIdx = ACTIVE_PIPELINE_STAGES.findIndex((s) => s.id === candidate.currentStage);
  const canMovePrev = currentIdx > 0;
  const canMoveNext = currentIdx >= 0 && currentIdx < ACTIVE_PIPELINE_STAGES.length - 1;

  const handlePrevStage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canMovePrev) {
      const prevStage = ACTIVE_PIPELINE_STAGES[currentIdx - 1];
      if (prevStage) onStageChange(candidate.id, prevStage.id);
    }
  };

  const handleNextStage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canMoveNext) {
      const nextStage = ACTIVE_PIPELINE_STAGES[currentIdx + 1];
      if (nextStage) onStageChange(candidate.id, nextStage.id);
    }
  };

  return (
    <Card
      variant="flat"
      padding="sm"
      className="cursor-pointer hover:border-primary-400 transition-all shadow-xs"
      onClick={() => onSelectCandidate(candidate)}
    >
      <CardBody>
        <Stack gap="xs">
          {/* Header: Avatar, Name & Rating */}
          <Inline justify="between" align="start">
            <Inline align="center" gap="xs">
              <Avatar initials={initials} size="sm" color="blue" />
              <Stack gap="none">
                <span className="bezent-font-semibold bezent-text-sm leading-tight">
                  {candidate.fullName}
                </span>
                <span className="bezent-text-xs bezent-text-secondary">
                  {candidate.candidateNumber}
                </span>
              </Stack>
            </Inline>
            <Badge variant="neutral" size="sm">
              ★ {candidate.rating.toFixed(1)}
            </Badge>
          </Inline>

          {/* Applied Job Info */}
          <Stack gap="none">
            <span className="bezent-text-xs bezent-font-medium text-gray-800 line-clamp-1">
              {candidate.appliedJobTitle}
            </span>
            <span className="bezent-text-xs bezent-text-secondary">
              {candidate.currentCompany ? `${candidate.totalExperienceYears}y at ${candidate.currentCompany}` : `${candidate.totalExperienceYears}y exp`}
            </span>
          </Stack>

          {/* Notice Period & CTC */}
          <Inline justify="between" align="center">
            <span className="bezent-text-xs bezent-text-secondary">
              {candidate.noticePeriodDays === 0 ? 'Immediate' : `${candidate.noticePeriodDays}d notice`}
            </span>
            {candidate.expectedCtcLpa && (
              <span className="bezent-text-xs bezent-font-medium text-gray-700">
                ₹{candidate.expectedCtcLpa}L
              </span>
            )}
          </Inline>

          {/* Tags */}
          {candidate.tags.length > 0 && (
            <Inline gap="xs" wrap>
              {candidate.tags.slice(0, 2).map((tag, idx) => (
                <Badge key={idx} variant="info" size="sm">
                  {tag}
                </Badge>
              ))}
            </Inline>
          )}

          {/* Stage Progression Controls */}
          <Inline justify="between" align="center" className="pt-1 border-t border-gray-100">
            {canMovePrev ? (
              <Button size="sm" variant="ghost" onClick={handlePrevStage} title="Move to previous stage">
                <BezentIcon name="edit" size={14} />
              </Button>
            ) : (
              <span />
            )}

            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                onSelectCandidate(candidate);
              }}
            >
              Details
            </Button>

            {canMoveNext ? (
              <Button size="sm" variant="primary" onClick={handleNextStage} title="Advance to next stage">
                <span>Advance</span>
              </Button>
            ) : candidate.currentStage === 'hired' ? (
              <Badge variant="success" size="sm">
                Hired 🎉
              </Badge>
            ) : (
              <span />
            )}
          </Inline>
        </Stack>
      </CardBody>
    </Card>
  );
}
