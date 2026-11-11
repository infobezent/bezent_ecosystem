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
      className="bezent-hiring-column"
    >
      <CardHeader className="bezent-hiring-column__header">
        <Stack gap="xs">
          <Inline justify="between" align="center">
            <span className="bezent-font-bold bezent-text-sm">{stage.label}</span>
            <Badge variant={stage.badgeVariant} size="sm">
              {candidates.length}
            </Badge>
          </Inline>
          <span className="bezent-text-xs bezent-text-secondary">{stage.description}</span>
        </Stack>
      </CardHeader>

      <CardBody className="bezent-hiring-column__body">
        <Stack gap="sm">
          {candidates.length === 0 ? (
            <div className="bezent-hiring-empty-dashed bezent-hiring-empty-dashed--compact">
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
