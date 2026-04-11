export type FeedbackType = 'UI' | '기능' | '텍스트' | '위치이동';

export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ComputedStyleInfo {
  color: string;
  fontSize: string;
  fontWeight: string;
  backgroundColor: string;
  padding: string;
  margin: string;
  display: string;
  position: string;
  border: string;
  lineHeight: string;
  textAlign: string;
  fontFamily: string;
  borderRadius: string;
  opacity: string;
  gap: string;
  flexDirection: string;
  justifyContent: string;
  alignItems: string;
  overflow: string;
  boxShadow: string;
  marginTop: string;
  marginRight: string;
  marginBottom: string;
  marginLeft: string;
  paddingTop: string;
  paddingRight: string;
  paddingBottom: string;
  paddingLeft: string;
}

export interface CapturedElement {
  selector: string;
  section: string;
  tagName: string;
  classes: string[];
  elementId: string;
  textContent: string;
  bbox: BBox;
  styles: ComputedStyleInfo;
  imgInfo?: {
    src: string;
    naturalWidth: number;
    naturalHeight: number;
    alt: string;
  };
  bgImage?: string;
}

export interface MoveTarget {
  x: number;
  y: number;
  nearestSelector: string | null;
  description: string | null;
}

export interface Feedback extends CapturedElement {
  id: number;
  feedback: string;
  fbType: FeedbackType;
  moveType?: 'component' | 'free';
  moveDirection?: 'up' | 'down' | 'left' | 'right';
  moveTarget?: MoveTarget | null;
  multiEls?: CapturedElement[];
}

export interface PanelPos {
  left?: string;
  top?: string;
  right?: string;
  bottom?: string;
}

export type SessionStatus = 'open' | 'reviewing' | 'closed';

export interface SavedSession {
  id: string;
  name: string;
  page: string;
  url: string;
  createdAt: string; // ISO
  status: SessionStatus;
  feedbacks: Feedback[];
  nextId: number;
  reviewCount?: number;
}

export interface SessionsData {
  sessions: SavedSession[];
}
