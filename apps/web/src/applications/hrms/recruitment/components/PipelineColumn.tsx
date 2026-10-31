import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  Inline,
  Stack,
} from '../../../../design-system/components';
import type { Candidate, CandidateStage } from '../types/candidate';
import type { PipelineStageConfig } from '../types/pipeline';
import { PipelineCandidateCard } from './PipelineCandidateCard';

export interface PipelineColumnProps {
  stage: PipelineStageConfig;
  candidates: Candidate[];
  onSelectCandidate: (candidate: Candidate) => void;
  onStageChange: (candidateId: string, newStage: CandidateStage) => void;
}

export function PipelineColumn({
  stage,
  candidates,
  onSelectCandidate,
  onStageChange,
}: PipelineColumnProps) {
  const isTerminalSuccess = stage.id === 'hired';

  return (
    <Card
      variant={isTerminalSuccess ? 'tint-green' : 'flat'}
      padding="sm"
      className="min-w-[280px] max-w-[320px] flex-shrink-0 bg-gray-50/70 border border-gray-200/80 rounded-xl"
    >
      <CardHeader className="pb-2 border-b border-gray-200/60">
        <Stack gap="xs">
          <Inline justify="between" align="center">
            <span className="bezent-font-bold bezent-text-sm text-gray-900">
              {stage.label}
            </span>
            <Badge variant={stage.badgeVariant} size="sm">
              {candidates.length}
            </Badge>
          </Inline>
          <span className="bezent-text-xs bezent-text-secondary line-clamp-1">
            {stage.description}
          </span>
        </Stack>
      </CardHeader>

      <CardBody className="pt-2">
        <Stack gap="sm">
          {candidates.length === 0 ? (
            <div className="py-6 text-center border-2 border-dashed border-gray-200 rounded-lg">
              <span className="bezent-text-xs bezent-text-secondary">
                No candidates in {stage.label}
              </span>
            </div>
          ) : (
            candidates.map((cand) => (
              <PipelineCandidateCard
                key={cand.id}
                candidate={cand}
                onSelectCandidate={onSelectCandidate}
                onStageChange={onStageChange}
              />
            ))
          )}
        </Stack>
      </CardBody>
    </Card>
  );
}
