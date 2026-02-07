/**
 * Pactwork Storybook Addon Panel
 *
 * A UI panel for controlling API scenarios, latency, and network states
 * directly from the Storybook interface.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useChannel, useParameter, useAddonState } from 'storybook/internal/manager-api';
import { AddonPanel, Form, ActionBar } from '@storybook/components';
import { styled } from '@storybook/theming';
import type { HandlerInfo, PactworkPanelState } from './types.js';
import { ADDON_ID, PARAM_KEY, EVENTS } from './constants.js';

/**
 * Styled components for the panel UI
 */
const PanelContainer = styled.div`
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Section = styled.div`
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

const ControlRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SliderContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
`;

const SliderValue = styled.span`
  font-size: 12px;
  min-width: 60px;
  font-family: monospace;
  color: ${(props: { theme: { color: { defaultText: string } } }) => props.theme.color.defaultText};
`;

const EmptyState = styled.div`
  padding: 32px 16px;
  text-align: center;
  color: ${(props: { theme: { color: { mediumdark: string } } }) => props.theme.color.mediumdark};
`;

const HandlerList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
`;

const HandlerItem = styled.li`
  padding: 8px;
  border-bottom: 1px solid ${(props: { theme: { appBorderColor: string } }) => props.theme.appBorderColor};
  font-size: 12px;

  &:last-child {
    border-bottom: none;
  }
`;

const HandlerMethod = styled.span<{ method: string }>`
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

const HandlerPath = styled.span`
  font-family: monospace;
  color: ${(props: { theme: { color: { defaultText: string } } }) => props.theme.color.defaultText};
`;

const ScenarioCount = styled.span`
  margin-left: 8px;
  font-size: 11px;
  color: ${(props: { theme: { color: { mediumdark: string } } }) => props.theme.color.mediumdark};
`;

const ScrollArea = styled.div`
  overflow-y: auto;
  flex: 1;
`;

/**
 * Network error type options
 */
const NETWORK_ERROR_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'timeout', label: 'Timeout' },
  { value: 'abort', label: 'Abort' },
  { value: 'network-error', label: 'Network Error' },
];

/**
 * Latency presets for quick selection
 */
const LATENCY_PRESETS = [
  { value: 0, label: 'None' },
  { value: 100, label: '100ms' },
  { value: 500, label: '500ms' },
  { value: 1000, label: '1s' },
  { value: 2000, label: '2s' },
  { value: 5000, label: '5s' },
];

/**
 * Default panel state
 */
const DEFAULT_STATE: PactworkPanelState = {
  selectedScenario: null,
  latency: 0,
  networkError: null,
  enabled: true,
};

interface PanelProps {
  active: boolean;
}

/**
 * Pactwork addon panel component.
 * Provides controls for scenarios, latency, and network simulation.
 */
export function Panel({ active }: PanelProps): React.ReactElement | null {
  // Addon state persists across story changes
  const [state, setState] = useAddonState<PactworkPanelState>(ADDON_ID, DEFAULT_STATE);

  // Available handlers from preview
  const [handlers, setHandlers] = useState<HandlerInfo[]>([]);

  // All available scenarios
  const [scenarios, setScenarios] = useState<string[]>([]);

  // Story parameters
  const params = useParameter<{ scenario?: string; latency?: number }>(PARAM_KEY, {});

  // Channel for communicating with decorator
  const emit = useChannel({
    [EVENTS.HANDLERS_READY]: (data: { handlers: HandlerInfo[]; scenarios: string[] }) => {
      setHandlers(data.handlers);
      setScenarios(data.scenarios);
    },
    [EVENTS.STATE_UPDATE]: (newState: Partial<PactworkPanelState>) => {
      setState((prev: PactworkPanelState) => ({ ...prev, ...newState }));
    },
  });

  // Sync state from story parameters on story change
  useEffect(() => {
    if (params.scenario && params.scenario !== state.selectedScenario) {
      setState((prev: PactworkPanelState) => ({ ...prev, selectedScenario: params.scenario ?? null }));
    }
    if (params.latency !== undefined && params.latency !== state.latency) {
      setState((prev: PactworkPanelState) => ({ ...prev, latency: params.latency ?? 0 }));
    }
  }, [params.scenario, params.latency, setState, state.selectedScenario, state.latency]);

  // Handle scenario change
  const handleScenarioChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const scenario = e.target.value || null;
      setState((prev: PactworkPanelState) => ({ ...prev, selectedScenario: scenario }));
      emit(EVENTS.SCENARIO_CHANGE, { scenario });
    },
    [emit, setState]
  );

  // Handle latency change
  const handleLatencyChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const latency = parseInt(e.target.value, 10);
      setState((prev: PactworkPanelState) => ({ ...prev, latency }));
      emit(EVENTS.LATENCY_CHANGE, { latency });
    },
    [emit, setState]
  );

  // Handle latency preset click
  const handleLatencyPreset = useCallback(
    (latency: number) => {
      setState((prev: PactworkPanelState) => ({ ...prev, latency }));
      emit(EVENTS.LATENCY_CHANGE, { latency });
    },
    [emit, setState]
  );

  // Handle network error change
  const handleNetworkErrorChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const type = e.target.value as 'timeout' | 'abort' | 'network-error' | null;
      const networkError = type || null;
      setState((prev: PactworkPanelState) => ({ ...prev, networkError }));
      emit(EVENTS.NETWORK_CHANGE, { type: networkError });
    },
    [emit, setState]
  );

  // Handle reset
  const handleReset = useCallback(() => {
    setState(DEFAULT_STATE);
    emit(EVENTS.RESET, {});
  }, [emit, setState]);

  // Request current state when panel becomes active
  useEffect(() => {
    if (active) {
      emit(EVENTS.STATE_REQUEST, {});
    }
  }, [active, emit]);

  // Memoized scenario options grouped by operation
  const scenarioOptions = useMemo(() => {
    const grouped: Record<string, string[]> = {};

    for (const scenario of scenarios) {
      const [operationId] = scenario.split('.');
      if (!grouped[operationId]) {
        grouped[operationId] = [];
      }
      grouped[operationId].push(scenario);
    }

    return grouped;
  }, [scenarios]);

  if (!active) {
    return null;
  }

  return (
    <AddonPanel active={active}>
      <>
        <ScrollArea>
          <PanelContainer>
          {/* Scenario Selection */}
          <Section>
            <SectionTitle>Scenario</SectionTitle>
            <Form.Field label="">
              <Form.Select
                value={state.selectedScenario || ''}
                onChange={handleScenarioChange}
                size="auto"
              >
                <option value="">Default (no scenario)</option>
                {Object.entries(scenarioOptions).map(([operationId, opScenarios]) => (
                  <optgroup key={operationId} label={operationId}>
                    {opScenarios.map((scenario) => (
                      <option key={scenario} value={scenario}>
                        {scenario.split('.')[1]}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Form.Select>
            </Form.Field>
          </Section>

          {/* Latency Control */}
          <Section>
            <SectionTitle>Latency</SectionTitle>
            <ControlRow>
              <SliderContainer>
                <Form.Input
                  type="range"
                  min={0}
                  max={10000}
                  step={100}
                  value={state.latency}
                  onChange={handleLatencyChange}
                />
                <SliderValue>{state.latency}ms</SliderValue>
              </SliderContainer>
            </ControlRow>
            <ControlRow>
              {LATENCY_PRESETS.map((preset) => (
                <Form.Button
                  key={preset.value}
                  size="small"
                  variant={state.latency === preset.value ? 'solid' : 'outline'}
                  onClick={() => handleLatencyPreset(preset.value)}
                >
                  {preset.label}
                </Form.Button>
              ))}
            </ControlRow>
          </Section>

          {/* Network Error Simulation */}
          <Section>
            <SectionTitle>Network State</SectionTitle>
            <Form.Field label="">
              <Form.Select
                value={state.networkError || ''}
                onChange={handleNetworkErrorChange}
                size="auto"
              >
                {NETWORK_ERROR_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Field>
          </Section>

          {/* Available Handlers */}
          <Section>
            <SectionTitle>Available Handlers ({handlers.length})</SectionTitle>
            {handlers.length === 0 ? (
              <EmptyState>
                No handlers found. Make sure to configure pactwork in your preview.ts
              </EmptyState>
            ) : (
              <HandlerList>
                {handlers.slice(0, 10).map((handler) => (
                  <HandlerItem key={handler.operationId}>
                    <HandlerMethod method={handler.method}>{handler.method}</HandlerMethod>
                    <HandlerPath>{handler.path}</HandlerPath>
                    {handler.availableScenarios.length > 0 && (
                      <ScenarioCount>
                        ({handler.availableScenarios.length} scenarios)
                      </ScenarioCount>
                    )}
                  </HandlerItem>
                ))}
                {handlers.length > 10 && (
                  <HandlerItem>
                    ... and {handlers.length - 10} more handlers
                  </HandlerItem>
                )}
              </HandlerList>
            )}
          </Section>
          </PanelContainer>
        </ScrollArea>

        <ActionBar
          actionItems={[
            {
              title: 'Reset All',
              onClick: handleReset,
            },
          ]}
        />
      </>
    </AddonPanel>
  );
}

export default Panel;
