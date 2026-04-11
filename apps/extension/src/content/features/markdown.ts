import type { Feedback } from '../types';
import { circled, truncate } from '../utils/dom';
import { t, type Lang, type StringKey } from '../../shared/i18n';

export function generateMarkdown(feedbacks: Feedback[], lang: Lang): string {
  const tr = (key: StringKey, vars?: Record<string, string | number>) => t(key, lang, vars);

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const page = location.pathname.split('/').pop() || 'index.html';

  let md = `# ${tr('mdTitle')} — ${page}\n> ${tr('mdReviewDate')}: ${dateStr}\n> ${tr('mdTotal')}: ${feedbacks.length}${lang === 'ko' ? tr('mdItems') : ' ' + tr('mdItems')}\n\n---\n\n`;

  const dirKeys: Record<string, StringKey> = {
    left: 'moveDirLeft',
    right: 'moveDirRight',
    up: 'moveDirUp',
    down: 'moveDirDown',
  };

  feedbacks.forEach((fb, i) => {
    const num = i + 1;
    const sectionLabel = fb.section ? ` — ${fb.section}` : '';
    const tag = fb.tagName || tr('mdArea');
    const typeTag = fb.fbType ? `[${fb.fbType}] ` : '';
    md += `## ${circled(num)} ${typeTag}${tag}${sectionLabel}\n`;

    if (fb.selector) md += `- **${tr('mdElement')}**: \`${fb.selector}\`\n`;

    if (fb.fbType === '위치이동') {
      const memo = fb.feedback.includes(' — ')
        ? fb.feedback.split(' — ').slice(1).join(' — ')
        : '';
      if (fb.moveType === 'component') {
        md += `- **${tr('mdMoveMethod')}**: ${tr('moveAutoLabelComponent')}\n`;
        md += `- **${tr('mdDirection')}**: ${fb.moveDirection ? tr(dirKeys[fb.moveDirection]!) : ''}\n`;
      } else if (fb.moveType === 'free' && fb.moveTarget) {
        md += `- **${tr('mdMoveMethod')}**: ${tr('moveAutoLabelFree')}\n`;
        const mt = fb.moveTarget;
        const destDesc =
          mt.description ||
          (mt.nearestSelector ? `${mt.nearestSelector} ${tr('mdNear')}` : `(${mt.x}, ${mt.y})`);
        md += `- **${tr('mdMoveDest')}**: ${destDesc} (${mt.x}, ${mt.y})\n`;
      }
      if (memo) md += `- **${tr('mdMemo')}**: ${memo}\n`;
    } else {
      if (fb.textContent) md += `- **${tr('mdCurrentText')}**: "${truncate(fb.textContent, 80)}"\n`;
      md += `- **${tr('mdFeedback')}**: ${fb.feedback}\n`;
    }

    if (fb.bbox) md += `- **${tr('mdPosition')}**: x:${fb.bbox.x} y:${fb.bbox.y} ${fb.bbox.w}x${fb.bbox.h}\n`;
    if (fb.multiEls && fb.multiEls.length > 0) {
      md += `- **${tr('mdMultiElements')}**: ${fb.multiEls.map((e) => '`' + e.selector + '`').join(', ')}\n`;
    }
    md += '\n';
  });

  md += `---\n> ${tr('mdFooter')}\n`;
  return md;
}
