/**
 * Pactwork Storybook Addon Panel
 *
 * Observability panel showing request logs, current state, and handler info.
 * Control is handled by the Storybook toolbar.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useChannel, useGlobals } from 'storybook/internal/manager-api';
import { AddonPanel, Button } from '@storybook/components';
import { styled } from '@storybook/theming';
import type { HandlerInfo } from './types.js';
import { EVENTS } from './constants.js';

// Styled components
const PanelContainer = styled.div`
  padding: 16px;
  font-family: ${({ theme }) => theme.typography.fonts.base};
  font-size: 13px;
  height: 100%;
  overflow: auto;
`;

const Section = styled.div`
  margin-bottom: 20px;
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const SectionTitle = styled.h3`
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${({ theme }) => theme.color.mediumdark};
  margin: 0;
`;

const Badge = styled.span<{ variant?: 'success' | 'error' | 'warning' | 'info' }>`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  background: ${({ variant, theme }) => {
    switch (variant) {
      case 'success': return theme.color.positive;
      case 'error': return theme.color.negative;
      case 'warning': return theme.color.warning;
      default: return theme.color.secondary;
    }
  }};
  color: white;
`;

const CurrentStateGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
`;

const StateCard = styled.div`
  background: ${({ theme }) => theme.background.content};
  border: 1px solid ${({ theme }) => theme.appBorderColor};
  border-radius: 6px;
  padding: 12px;
  text-align: center;
`;

const StateLabel = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.color.mediumdark};
  margin-bottom: 4px;
`;

const StateValue = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.defaultText};
`;

const RequestLogContainer = styled.div`
  background: ${({ theme }) => theme.background.content};
  border: 1px solid ${({ theme }) => theme.appBorderColor};
  border-radius: 6px;
  overflow: hidden;
`;

const RequestLogHeader = styled.div`
  display: grid;
  grid-template-columns: 70px 1fr 80px 100px 70px;
  gap: 8px;
  padding: 8px 12px;
  background: ${({ theme }) => theme.background.hoverable};
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.mediumdark};
`;

const RequestLogRow = styled.div<{ status: number }>`
  display: grid;
  grid-template-columns: 70px 1fr 80px 100px 70px;
  gap: 8px;
  padding: 8px 12px;
  border-top: 1px solid ${({ theme }) => theme.appBorderColor};
  font-size: 12px;
  background: ${({ status, theme }) =>
    status === 0 ? 'rgba(255, 0, 0, 0.05)' :
    status >= 400 ? 'rgba(255, 165, 0, 0.05)' :
    'transparent'
  };
`;

const MethodBadge = styled.span<{ method: string }>`
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  background: ${({ method }) => {
    switch (method) {
      case 'GET': return '#61affe';
      case 'POST': return '#49cc90';
      case 'PUT': return '#fca130';
      case 'DELETE': return '#f93e3e';
      default: return '#999';
    }
  }};
  color: white;
`;

const StatusBadge = styled.span<{ status: number }>`
  font-weight: 600;
  color: ${({ status }) =>
    status === 0 ? '#f93e3e' :
    status >= 500 ? '#f93e3e' :
    status >= 400 ? '#fca130' :
    '#49cc90'
  };
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 24px;
  color: ${({ theme }) => theme.color.mediumdark};
`;

const HandlerList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const HandlerItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: ${({ theme }) => theme.background.content};
  border: 1px solid ${({ theme }) => theme.appBorderColor};
  border-radius: 6px;
`;

const HandlerPath = styled.span`
  flex: 1;
  font-family: ${({ theme }) => theme.typography.fonts.mono};
  font-size: 12px;
`;

const ScenarioCount = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.color.mediumdark};
`;

// Types
interface RequestLogEntry {
  id: string;
  timestamp: number;
  method: string;
  path: string;
  operationId: string;
  scenario: string;
  status: number;
  duration: number;
}

interface PanelProps {
  active: boolean;
}

const MAX_LOG_ENTRIES = 50;

export function Panel({ active }: PanelProps): React.ReactElement | null {
  const [handlers, setHandlers] = useState<HandlerInfo[]>([]);
  const [requestLog, setRequestLog] = useState<RequestLogEntry[]>([]);
  const [globals] = useGlobals();

  // Get current state from globals
  const currentScenario = (globals.pactworkScenario as string) || 'default';
  const currentLatency = (globals.pactworkLatency as number) || 0;
  const currentNetwork = (globals.pactworkNetwork as string) || 'online';

  // Channel for receiving events from preview
  const emit = useChannel({
    [EVENTS.HANDLERS_READY]: (data: { handlers: HandlerInfo[] }) => {
      setHandlers(data.handlers);
    },
    'pactwork/request-log': (entry: RequestLogEntry) => {
      setRequestLog(prev => [entry, ...prev].slice(0, MAX_LOG_ENTRIES));
    },
  });

  // Request state when panel becomes active
  useEffect(() => {
    if (active) {
      emit(EVENTS.STATE_REQUEST, {});
    }
  }, [active, emit]);

  // Clear log handler
  const handleClearLog = useCallback(() => {
    setRequestLog([]);
  }, []);

  if (!active) {
    return null;
  }

  return (
    <AddonPanel active={active}>
      <PanelContainer>
        {/* Current State */}
        <Section>
          <SectionTitle>Current State</SectionTitle>
          <CurrentStateGrid>
            <StateCard>
              <StateLabel>Scenario</StateLabel>
              <StateValue>{currentScenario === '' ? 'default' : currentScenario.split('.')[1] || currentScenario}</StateValue>
            </StateCard>
            <StateCard>
              <StateLabel>Latency</StateLabel>
              <StateValue>{currentLatency > 0 ? `${currentLatency}ms` : 'None'}</StateValue>
            </StateCard>
            <StateCard>
              <StateLabel>Network</StateLabel>
              <StateValue>
                <Badge variant={currentNetwork === 'offline' ? 'error' : 'success'}>
                  {currentNetwork}
                </Badge>
              </StateValue>
            </StateCard>
          </CurrentStateGrid>
        </Section>

        {/* Request Log */}
        <Section>
          <SectionHeader>
            <SectionTitle>Request Log ({requestLog.length})</SectionTitle>
            {requestLog.length > 0 && (
              <Button size="small" onClick={handleClearLog}>Clear</Button>
            )}
          </SectionHeader>
          <RequestLogContainer>
            <RequestLogHeader>
              <span>Method</span>
              <span>Path</span>
              <span>Scenario</span>
              <span>Status</span>
              <span>Time</span>
            </RequestLogHeader>
            {requestLog.length === 0 ? (
              <EmptyState>No requests yet. Interact with a story to see API calls.</EmptyState>
            ) : (
              requestLog.map((entry) => (
                <RequestLogRow key={entry.id} status={entry.status}>
                  <span><MethodBadge method={entry.method}>{entry.method}</MethodBadge></span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.path}
                  </span>
                  <span>{entry.scenario}</span>
                  <span>
                    <StatusBadge status={entry.status}>
                      {entry.status === 0 ? 'ERR' : entry.status}
                    </StatusBadge>
                  </span>
                  <span>{entry.duration}ms</span>
                </RequestLogRow>
              ))
            )}
          </RequestLogContainer>
        </Section>

        {/* Available Handlers */}
        <Section>
          <SectionTitle>Available Handlers ({handlers.length})</SectionTitle>
          {handlers.length === 0 ? (
            <EmptyState>No handlers detected.</EmptyState>
          ) : (
            <HandlerList>
              {handlers.map((handler) => (
                <HandlerItem key={handler.operationId}>
                  <MethodBadge method={handler.method}>{handler.method}</MethodBadge>
                  <HandlerPath>{handler.path}</HandlerPath>
                  <ScenarioCount>{handler.availableScenarios.length} scenarios</ScenarioCount>
                </HandlerItem>
              ))}
            </HandlerList>
          )}
        </Section>
      </PanelContainer>
    </AddonPanel>
  );
}

export default Panel;
