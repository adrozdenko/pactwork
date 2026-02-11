/**
 * Pactwork Storybook Addon Toolbar
 *
 * Toolbar controls for switching scenarios, latency, and network state.
 * Communicates with the decorator via channel events and Storybook globals.
 */

import React, { useState, useEffect, useCallback, useRef, type CSSProperties } from 'react';
import { useChannel, useGlobals } from 'storybook/internal/manager-api';
import { IconButton } from '@storybook/components';
import { EVENTS } from './constants.js';
import type { HandlerInfo } from './types.js';

// ── Inline styles (no styled-components needed for toolbar) ─────────────

const dropdownStyles: CSSProperties = {
  position: 'fixed',
  zIndex: 2147483647,
  background: 'white',
  border: '1px solid #e0e0e0',
  borderRadius: 6,
  boxShadow: '0 8px 24px rgba(0,0,0,0.16)',
  padding: 8,
  minWidth: 220,
  maxHeight: '80vh',
  overflowY: 'auto',
};

const sectionLabelStyles: CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: 0.5,
  color: '#666',
  padding: '4px 8px',
  marginTop: 4,
};

const itemStyles: CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '6px 8px',
  border: 'none',
  background: 'none',
  textAlign: 'left' as const,
  cursor: 'pointer',
  borderRadius: 4,
  fontSize: 12,
  color: '#2D3148',
};

const activeItemStyles: CSSProperties = {
  ...itemStyles,
  background: '#e8f4fd',
  color: '#2D3148',
  fontWeight: 600,
};

const latencyRowStyles: CSSProperties = {
  display: 'flex',
  gap: 4,
  padding: '4px 8px',
  alignItems: 'center',
};

const latencyButtonStyles: CSSProperties = {
  padding: '4px 8px',
  border: '1px solid #ddd',
  borderRadius: 4,
  background: 'white',
  color: '#2D3148',
  cursor: 'pointer',
  fontSize: 11,
};

const activeBtnStyles: CSSProperties = {
  ...latencyButtonStyles,
  background: '#e8f4fd',
  borderColor: '#08A4BD',
  color: '#2D3148',
  fontWeight: 600,
};

const networkRowStyles: CSSProperties = {
  display: 'flex',
  gap: 4,
  padding: '4px 8px',
};

const dividerStyles: CSSProperties = {
  height: 1,
  background: '#eee',
  margin: '4px 0',
};

// ── Pactwork SVG icon ───────────────────────────────────────────────────

function PactworkIcon(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z"
        fill="currentColor"
        opacity="0.8"
      />
      <path
        d="M12 2v20M2 12h20"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.4"
      />
    </svg>
  );
}

// ── Toolbar constants ───────────────────────────────────────────────────

const LATENCY_PRESETS = [
  { label: 'None', value: 0 },
  { label: '200ms', value: 200 },
  { label: '1s', value: 1000 },
  { label: '3s', value: 3000 },
] as const;

const NETWORK_STATES = [
  { label: 'Online', value: 'online' },
  { label: 'Offline', value: 'offline' },
  { label: 'Timeout', value: 'timeout' },
] as const;

// ── Toolbar component ───────────────────────────────────────────────────

interface ToolbarProps {
  active?: boolean;
}

export function Toolbar({ active }: ToolbarProps): React.ReactElement | null {
  const [isOpen, setIsOpen] = useState(false);
  const [scenarios, setScenarios] = useState<string[]>([]);
  const [handlers, setHandlers] = useState<HandlerInfo[]>([]);
  const [globals, updateGlobals] = useGlobals();
  const buttonRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const currentScenario = (globals.pactworkScenario as string) || '';
  const currentLatency = (globals.pactworkLatency as number) || 0;
  const currentNetwork = (globals.pactworkNetwork as string) || 'online';

  // Channel communication with preview decorator
  const emit = useChannel({
    [EVENTS.HANDLERS_READY]: (data: { handlers: HandlerInfo[]; scenarios: string[] }) => {
      setHandlers(data.handlers);
      setScenarios(data.scenarios);
    },
  });

  // Request state when toolbar mounts
  useEffect(() => {
    emit(EVENTS.STATE_REQUEST, {});
  }, [emit]);

  // Position the dropdown below the button using fixed positioning
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 4,
        left: Math.max(8, rect.right - 220),
      });
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        dropdownRef.current && !dropdownRef.current.contains(target) &&
        buttonRef.current && !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleScenarioChange = useCallback(
    (scenario: string) => {
      const next = scenario === currentScenario ? '' : scenario;
      updateGlobals({ pactworkScenario: next });
      emit(EVENTS.SCENARIO_CHANGE, { scenario: next || null });
    },
    [currentScenario, updateGlobals, emit],
  );

  const handleLatencyChange = useCallback(
    (latency: number) => {
      updateGlobals({ pactworkLatency: latency });
      emit(EVENTS.LATENCY_CHANGE, { latency });
    },
    [updateGlobals, emit],
  );

  const handleNetworkChange = useCallback(
    (network: string) => {
      updateGlobals({ pactworkNetwork: network });
      if (network === 'online') {
        emit(EVENTS.NETWORK_CHANGE, { type: null });
      } else {
        emit(EVENTS.NETWORK_CHANGE, { type: network });
      }
    },
    [updateGlobals, emit],
  );

  const handleReset = useCallback(() => {
    updateGlobals({
      pactworkScenario: '',
      pactworkLatency: 0,
      pactworkNetwork: 'online',
    });
    emit(EVENTS.RESET, {});
  }, [updateGlobals, emit]);

  // Build status label for toolbar button
  const isModified = currentScenario !== '' || currentLatency > 0 || currentNetwork !== 'online';
  const statusParts: string[] = [];
  if (currentScenario) {
    const name = currentScenario.split('.').pop() || currentScenario;
    statusParts.push(name);
  }
  if (currentLatency > 0) statusParts.push(`${currentLatency}ms`);
  if (currentNetwork !== 'online') statusParts.push(currentNetwork);

  return (
    <div ref={buttonRef} style={{ display: 'flex', alignItems: 'center' }}>
      <IconButton
        title="Pactwork API Controls"
        active={isModified}
        onClick={() => setIsOpen(!isOpen)}
      >
        <PactworkIcon />
        {isModified && (
          <span style={{ marginLeft: 4, fontSize: 11 }}>
            {statusParts.join(' · ')}
          </span>
        )}
      </IconButton>

      {isOpen && (
        <div ref={dropdownRef} style={{ ...dropdownStyles, top: dropdownPos.top, left: dropdownPos.left }}>
          {/* Scenarios */}
          <div style={sectionLabelStyles}>Scenario</div>
          <button
            style={currentScenario === '' ? activeItemStyles : itemStyles}
            onClick={() => handleScenarioChange('')}
            onMouseEnter={(e) => {
              if (currentScenario !== '') e.currentTarget.style.background = '#f5f5f5';
            }}
            onMouseLeave={(e) => {
              if (currentScenario !== '') e.currentTarget.style.background = 'none';
            }}
          >
            Default (no scenario)
          </button>
          {scenarios.map((s) => (
            <button
              key={s}
              style={s === currentScenario ? activeItemStyles : itemStyles}
              onClick={() => handleScenarioChange(s)}
              onMouseEnter={(e) => {
                if (s !== currentScenario) e.currentTarget.style.background = '#f5f5f5';
              }}
              onMouseLeave={(e) => {
                if (s !== currentScenario) e.currentTarget.style.background = 'none';
              }}
            >
              {s}
            </button>
          ))}
          {scenarios.length === 0 && (
            <div style={{ ...itemStyles, color: '#999', cursor: 'default' }}>
              No scenarios available
            </div>
          )}

          <div style={dividerStyles} />

          {/* Latency */}
          <div style={sectionLabelStyles}>Latency</div>
          <div style={latencyRowStyles}>
            {LATENCY_PRESETS.map((preset) => (
              <button
                key={preset.value}
                style={currentLatency === preset.value ? activeBtnStyles : latencyButtonStyles}
                onClick={() => handleLatencyChange(preset.value)}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div style={dividerStyles} />

          {/* Network */}
          <div style={sectionLabelStyles}>Network</div>
          <div style={networkRowStyles}>
            {NETWORK_STATES.map((state) => (
              <button
                key={state.value}
                style={currentNetwork === state.value ? activeBtnStyles : latencyButtonStyles}
                onClick={() => handleNetworkChange(state.value)}
              >
                {state.label}
              </button>
            ))}
          </div>

          {/* Reset */}
          {isModified && (
            <>
              <div style={dividerStyles} />
              <button
                style={{ ...itemStyles, color: '#e74c3c', fontWeight: 500 }}
                onClick={handleReset}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#fdf0ef'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
              >
                Reset All
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default Toolbar;
