/**
 * Pactwork Storybook Addon Manager Entry
 *
 * Registers the addon panel in the Storybook manager UI.
 * This file runs in the manager context (sidebar, addon panel).
 */

import React from 'react';
import { addons, types } from 'storybook/internal/manager-api';
import { ADDON_ID, PANEL_ID } from './constants.js';
import { Panel } from './Panel.js';

/**
 * Wrapper component that extracts the active prop for the Panel.
 */
function PanelWrapper(props: { active?: boolean }): React.ReactElement | null {
  return React.createElement(Panel, { active: props.active ?? false });
}

/**
 * Register the pactwork addon panel.
 */
addons.register(ADDON_ID, () => {
  addons.add(PANEL_ID, {
    type: types.PANEL,
    title: 'Pactwork',
    match: ({ viewMode }: { viewMode?: string }) => viewMode === 'story',
    render: PanelWrapper,
  });
});
