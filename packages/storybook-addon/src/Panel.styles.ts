/**
 * Styled components for Pactwork Panel
 */

import { styled } from '@storybook/theming';

export const PanelContainer = styled.div`
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const SectionTitle = styled.h3`
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  color: ${(props: { theme: { color: { mediumdark: string } } }) => props.theme.color.mediumdark};
`;

export const ControlRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const SliderContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
`;

export const SliderValue = styled.span`
  font-size: 12px;
  min-width: 60px;
  font-family: monospace;
  color: ${(props: { theme: { color: { defaultText: string } } }) => props.theme.color.defaultText};
`;

export const EmptyState = styled.div`
  padding: 32px 16px;
  text-align: center;
  color: ${(props: { theme: { color: { mediumdark: string } } }) => props.theme.color.mediumdark};
`;

export const HandlerList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
`;

export const HandlerItem = styled.li`
  padding: 8px;
  border-bottom: 1px solid ${(props: { theme: { appBorderColor: string } }) => props.theme.appBorderColor};
  font-size: 12px;

  &:last-child {
    border-bottom: none;
  }
`;

export const HandlerMethod = styled.span<{ method: string }>`
  font-weight: 600;
  margin-right: 8px;
  color: ${(props: { method: string; theme: { color: { positive: string; secondary: string; gold: string; negative: string; defaultText: string } } }) => {
    switch (props.method) {
      case 'GET':
        return props.theme.color.positive;
      case 'POST':
        return props.theme.color.secondary;
      case 'PUT':
        return props.theme.color.gold;
      case 'DELETE':
        return props.theme.color.negative;
      default:
        return props.theme.color.defaultText;
    }
  }};
`;

export const HandlerPath = styled.span`
  font-family: monospace;
  color: ${(props: { theme: { color: { defaultText: string } } }) => props.theme.color.defaultText};
`;

export const ScenarioCount = styled.span`
  margin-left: 8px;
  font-size: 11px;
  color: ${(props: { theme: { color: { mediumdark: string } } }) => props.theme.color.mediumdark};
`;

export const ScrollArea = styled.div`
  overflow-y: auto;
  flex: 1;
`;
