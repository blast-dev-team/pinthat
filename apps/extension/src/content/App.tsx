import { Panel } from './components/Panel';
import { HoverOverlay } from './components/HoverOverlay';
import { SelectedOverlays } from './components/SelectedOverlays';
import { FreeMoveArrowOverlays } from './components/FreeMoveArrowOverlays';
import { PopupRouter } from './components/PopupRouter';
import { Toasts } from './components/Toasts';
import { useElementSelection } from './hooks/useElementSelection';
import { useShortcuts } from './hooks/useShortcuts';
import { useStore } from './state/store';

interface AppProps {
  shadowRoot: ShadowRoot;
}

export function App(_props: AppProps) {
  // Document-level keydown listener for configurable shortcuts.
  // Mounted unconditionally so the `toggle` shortcut can flip `active`
  // even when the rest of the UI is hidden.
  useShortcuts();

  const panelVisible = useStore((s) => s.panelVisible);
  const active = useStore((s) => s.active);
  const { hoverInfo, selectedInfo } = useElementSelection();

  // The browser popup's toggle controls `panelVisible`. When the panel is
  // hidden, nothing from the extension renders. When it's visible but
  // selection mode is off (`active === false`), the panel shows but hover
  // outlines / click-to-pin are disabled.
  if (!panelVisible) return null;

  return (
    <>
      <Panel />
      {active && hoverInfo && <HoverOverlay info={hoverInfo} />}
      {active && selectedInfo && <HoverOverlay info={selectedInfo} />}
      {active && <SelectedOverlays />}
      {active && <FreeMoveArrowOverlays />}
      <PopupRouter />
      <Toasts />
    </>
  );
}
