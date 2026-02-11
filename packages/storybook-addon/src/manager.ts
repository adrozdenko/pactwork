/**
 * Pactwork Storybook Addon Manager Entry
 *
 * Registers the addon panel and toolbar in the Storybook manager UI.
 * This file runs in the manager context (sidebar, addon panel, toolbar).
 */

import React from 'react';
import { addons, types } from 'storybook/internal/manager-api';
import { ADDON_ID, PANEL_ID, TOOL_ID } from './constants.js';
import { Panel } from './Panel.js';
import { Toolbar } from './Toolbar.js';

/**
 * Wrapper component that extracts the active prop for the Panel.
 */
function PanelWrapper(props: { active?: boolean }): React.ReactElement | null {
  return React.createElement(Panel, { active: props.active ?? false });
}

/**
 * Wrapper component for the Toolbar.
 */
function ToolbarWrapper(): React.ReactElement | null {
  return React.createElement(Toolbar);
}

/**
 * Register the pactwork addon panel and toolbar.
 */
addons.register(ADDON_ID, () => {
  addons.add(TOOL_ID, {
    type: types.TOOL,
    title: 'Pactwork',
    match: ({ viewMode }: { viewMode?: string }) => viewMode === 'story',
    render: ToolbarWrapper,
  });

  addons.add(PANEL_ID, {
    type: types.PANEL,
    title: 'Pactwork',
    match: ({ viewMode }: { viewMode?: string }) => viewMode === 'story',
    render: PanelWrapper,
  });
});
