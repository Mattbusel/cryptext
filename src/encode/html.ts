import { Page } from '../engine/page.js';
import { walkRow, CellState } from '../engine/helpers.js';
import { COLOUR_NAMES } from '../engine/codes.js';

export function encodeHtml(page: Page): string {
  let html = '<div class="cryptext-page">\n';

  for (let rowIdx = 0; rowIdx < 25; rowIdx++) {
    const row = page.grid[rowIdx];
    const states = walkRow(row);

    // Check if this row or any cell in it has double-height
    let isDhTop = false;
    if (rowIdx < 24) {
      for (let c = 0; c < 40; c++) {
        if (states[c].doubleHeight) {
          isDhTop = true;
          break;
        }
      }
    }

    // Check if previous row had double-height (makes this a dh-bottom)
    let isDhBottom = false;
    if (rowIdx > 0) {
      const prevRow = page.grid[rowIdx - 1];
      const prevStates = walkRow(prevRow);
      for (let c = 0; c < 40; c++) {
        if (prevStates[c].doubleHeight) {
          isDhBottom = true;
          break;
        }
      }
    }

    const rowClass = [
      'row',
      isDhTop ? 'dh-top' : '',
      isDhBottom ? 'dh-bottom' : '',
    ]
      .filter(Boolean)
      .join(' ');

    html += `  <div class="${rowClass}">\n`;

    if (isDhBottom) {
      // Double-height bottom row is empty
      html += `  </div>\n`;
      continue;
    }

    // Group runs of cells with identical attributes
    let currentSpan: {
      start: number;
      end: number;
      state: CellState;
    } | null = null;

    for (let colIdx = 0; colIdx < 40; colIdx++) {
      const state = states[colIdx];
      const code = row[colIdx];

      // Control codes (0x00-0x1F) are rendered as spaces
      const isControl = code <= 0x1f;
      const char = isControl ? ' ' : String.fromCharCode(code);
      const isMosaic = state.mosaic && !isControl;

      // Check if we need to start a new span
      const stateKey = JSON.stringify({
        fg: state.fg,
        bg: state.bg,
        flash: state.flash,
        conceal: state.conceal,
      });
      const currentKey = currentSpan
        ? JSON.stringify({
            fg: currentSpan.state.fg,
            bg: currentSpan.state.bg,
            flash: currentSpan.state.flash,
            conceal: currentSpan.state.conceal,
          })
        : null;

      if (currentSpan && stateKey !== currentKey) {
        // Close current span
        html += renderSpan(row, currentSpan.start, currentSpan.end, states);
        currentSpan = null;
      }

      if (!currentSpan) {
        currentSpan = { start: colIdx, end: colIdx + 1, state };
      } else {
        currentSpan.end = colIdx + 1;
      }
    }

    if (currentSpan) {
      html += renderSpan(row, currentSpan.start, currentSpan.end, states);
    }

    html += `  </div>\n`;
  }

  html += '</div>\n';
  return html;
}

function renderSpan(
  row: Uint8Array,
  start: number,
  end: number,
  states: CellState[],
): string {
  const state = states[start];
  const fgName = COLOUR_NAMES[state.fg] || 'white';
  const bgName = COLOUR_NAMES[state.bg] || 'black';

  const classes = [
    'span',
    `fg-${fgName}`,
    `bg-${bgName}`,
    state.flash ? 'flash' : '',
    state.conceal ? 'conceal' : '',
  ]
    .filter(Boolean)
    .join(' ');

  let content = '';
  for (let i = start; i < end; i++) {
    const code = row[i];
    const isControl = code <= 0x1f;

    if (state.mosaic && !isControl) {
      // Render mosaic character
      const sextants = code & 0x5f; // Extract sextant bits
      content += `<span class="mosaic" data-sextants="${sextants}">`;
      content += '<span class="sx"></span><span class="sx"></span>';
      content += '<span class="sx"></span><span class="sx"></span>';
      content += '<span class="sx"></span><span class="sx"></span>';
      content += '</span>';
    } else {
      content += isControl ? ' ' : String.fromCharCode(code);
    }
  }

  return `    <span class="${classes}">${content}</span>`;
}
