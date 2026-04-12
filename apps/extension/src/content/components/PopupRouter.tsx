import { useStore } from '../state/store';
import { TypeSelectionPopup } from './popups/TypeSelectionPopup';
import { FeedbackInputPopup } from './popups/FeedbackInputPopup';
import { EditPopup } from './popups/EditPopup';
import { OutputModal } from './popups/OutputModal';
import {
  MoveSubOptionsPopup,
  ComponentDirectionPopup,
  ComponentMemoPopup,
  FreeMoveMemoPopup,
} from './popups/MovePopups';
import { FreeMoveDragOverlay } from './FreeMoveDragOverlay';
import { SessionNameModal } from './modals/SessionNameModal';
import { SessionListModal } from './modals/SessionListModal';
import { ShortcutSettingsModal } from './modals/ShortcutSettingsModal';
import { SelectedListPopup } from './popups/SelectedListPopup';
import { SnapshotDrawModal } from './popups/SnapshotDrawModal';

export function PopupRouter() {
  const popup = useStore((s) => s.popup);
  if (!popup) return null;

  switch (popup.kind) {
    case 'type-select':
      return <TypeSelectionPopup targetEl={popup.targetEl} />;
    case 'feedback-input':
      return <FeedbackInputPopup targetEl={popup.targetEl} fbType={popup.fbType} />;
    case 'edit':
      return <EditPopup feedbackId={popup.feedbackId} />;
    case 'output':
      return <OutputModal />;
    case 'move-sub':
      return <MoveSubOptionsPopup targetEl={popup.targetEl} pos={popup.pos} />;
    case 'move-component-dir':
      return <ComponentDirectionPopup targetEl={popup.targetEl} pos={popup.pos} />;
    case 'move-component-memo':
      return (
        <ComponentMemoPopup
          targetEl={popup.targetEl}
          direction={popup.direction}
          pos={popup.pos}
        />
      );
    case 'move-free-drag':
      return <FreeMoveDragOverlay targetEl={popup.targetEl} />;
    case 'move-free-memo':
      return (
        <FreeMoveMemoPopup
          targetEl={popup.targetEl}
          destX={popup.destX}
          destY={popup.destY}
          nearestSelector={popup.nearestSelector}
        />
      );
    case 'session-name':
      return <SessionNameModal />;
    case 'session-list':
      return <SessionListModal />;
    case 'shortcut-settings':
      return <ShortcutSettingsModal />;
    case 'selected-list':
      return <SelectedListPopup />;
    case 'snapshot-draw':
      return (
        <SnapshotDrawModal
          targetEl={popup.targetEl}
          imageDataUrl={popup.imageDataUrl}
          bbox={popup.bbox}
        />
      );
    default:
      return null;
  }
}
