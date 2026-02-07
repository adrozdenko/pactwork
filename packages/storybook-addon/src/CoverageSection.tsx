/**
 * Coverage Section for Pactwork Storybook Addon Panel
 *
 * Displays scenario coverage metrics with a color-coded progress bar.
 */

import React from 'react';
import { styled } from '@storybook/theming';

/**
 * Coverage data passed to the section
 */
export interface CoverageData {
  /** Total scenarios in the spec */
  total: number;
  /** Number of scenarios covered by stories */
  covered: number;
  /** List of uncovered scenario IDs */
  uncovered: string[];
}

interface CoverageSectionProps {
  coverage: CoverageData | null;
}

/**
 * Styled components for coverage UI
 */
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const SectionTitle = styled.h3`
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  color: ${(props: { theme: { color: { mediumdark: string } } }) => props.theme.color.mediumdark};
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Percentage = styled.span<{ level: 'good' | 'partial' | 'low' }>`
  font-size: 14px;
  font-weight: 600;
  color: ${(props: { level: string; theme: { color: { positive: string; gold: string; negative: string } } }) => {
    switch (props.level) {
      case 'good':
        return props.theme.color.positive;
      case 'partial':
        return props.theme.color.gold;
      case 'low':
        return props.theme.color.negative;
      default:
        return props.theme.color.positive;
    }
  }};
`;

const ProgressBarContainer = styled.div`
  width: 100%;
  height: 8px;
  background-color: ${(props: { theme: { appBorderColor: string } }) => props.theme.appBorderColor};
  border-radius: 4px;
  overflow: hidden;
`;

const ProgressBarFill = styled.div<{ percentage: number; level: 'good' | 'partial' | 'low' }>`
  height: 100%;
  width: ${(props) => props.percentage}%;
  background-color: ${(props: { level: string; theme: { color: { positive: string; gold: string; negative: string } } }) => {
    switch (props.level) {
      case 'good':
        return props.theme.color.positive;
      case 'partial':
        return props.theme.color.gold;
      case 'low':
        return props.theme.color.negative;
      default:
        return props.theme.color.positive;
    }
  }};
  border-radius: 4px;
  transition: width 0.3s ease;
`;

const MetricText = styled.span`
  font-size: 12px;
  color: ${(props: { theme: { color: { mediumdark: string } } }) => props.theme.color.mediumdark};
`;

const UncoveredContainer = styled.div`
  margin-top: 4px;
`;

const UncoveredLabel = styled.div`
  font-size: 11px;
  color: ${(props: { theme: { color: { mediumdark: string } } }) => props.theme.color.mediumdark};
  margin-bottom: 4px;
`;

const UncoveredList = styled.div`
  font-size: 11px;
  font-family: monospace;
  color: ${(props: { theme: { color: { defaultText: string } } }) => props.theme.color.defaultText};
  word-break: break-word;
`;

const EmptyState = styled.div`
  font-size: 12px;
  color: ${(props: { theme: { color: { mediumdark: string } } }) => props.theme.color.mediumdark};
  font-style: italic;
`;

/**
 * Get coverage level based on percentage
 * - good: >= 80%
 * - partial: >= 50%
 * - low: < 50%
 */
function getCoverageLevel(percentage: number): 'good' | 'partial' | 'low' {
  if (percentage >= 80) return 'good';
  if (percentage >= 50) return 'partial';
  return 'low';
}

/**
 * Format uncovered scenarios for display
 */
function formatUncovered(uncovered: string[], maxShow: number = 3): string {
  if (uncovered.length === 0) return '';

  if (uncovered.length <= maxShow) {
    return uncovered.join(', ');
  }

  const shown = uncovered.slice(0, maxShow);
  const remaining = uncovered.length - maxShow;
  return `${shown.join(', ')}, +${remaining} more`;
}

/**
 * Coverage section component
 */
export function CoverageSection({ coverage }: CoverageSectionProps): React.ReactElement {
  if (!coverage) {
    return (
      <Container>
        <SectionTitle>Scenario Coverage</SectionTitle>
        <EmptyState>No coverage data available</EmptyState>
      </Container>
    );
  }

  const { total, covered, uncovered } = coverage;
  const percentage = total > 0 ? Math.round((covered / total) * 100) : 100;
  const level = getCoverageLevel(percentage);

  return (
    <Container>
      <HeaderRow>
        <SectionTitle>Scenario Coverage</SectionTitle>
        <Percentage level={level}>{percentage}%</Percentage>
      </HeaderRow>

      <ProgressBarContainer>
        <ProgressBarFill percentage={percentage} level={level} />
      </ProgressBarContainer>

      <MetricText>
        {covered} / {total} covered
      </MetricText>

      {uncovered.length > 0 && (
        <UncoveredContainer>
          <UncoveredLabel>Uncovered:</UncoveredLabel>
          <UncoveredList>{formatUncovered(uncovered)}</UncoveredList>
        </UncoveredContainer>
      )}
    </Container>
  );
}

export default CoverageSection;
