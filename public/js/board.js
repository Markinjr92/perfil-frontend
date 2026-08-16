/** Tabuleiro Perfil — casas em trilha retangular + peões. */

const CAT_CYCLE = ['pessoa', 'lugar', 'ano', 'coisa'];
const CAT_CLASS = {
  pessoa: 'cell-pessoa',
  lugar: 'cell-lugar',
  ano: 'cell-ano',
  coisa: 'cell-coisa',
};

export function categoryForCell(index, boardSize) {
  if (index <= 0) return 'start';
  if (index >= boardSize) return 'finish';
  return CAT_CYCLE[(index - 1) % CAT_CYCLE.length];
}

/** Posições % ao longo do perímetro (trilha). */
export function perimeterCoords(index, boardSize) {
  const n = Math.max(1, boardSize);
  const i = Math.max(0, Math.min(index, n));
  const t = i / n;
  // Retângulo arredondado: top → right → bottom → left
  const perimeter = 2 * (1 + 0.62);
  let d = t * perimeter;
  let x;
  let y;
  if (d <= 1) {
    x = d;
    y = 0;
  } else if (d <= 1 + 0.62) {
    x = 1;
    y = (d - 1) / 0.62;
  } else if (d <= 2 + 0.62) {
    x = 1 - (d - 1 - 0.62);
    y = 1;
  } else {
    x = 0;
    y = 1 - (d - 2 - 0.62) / 0.62;
  }
  return { left: `${8 + x * 84}%`, top: `${10 + y * 78}%` };
}

export function renderBoard(container, { boardSize = 40, players = [], currentPlayerId = null } = {}) {
  if (!container) return;
  const cells = [];
  for (let i = 0; i <= boardSize; i += 1) {
    const cat = categoryForCell(i, boardSize);
    const pos = perimeterCoords(i, boardSize);
    const label = i === 0 ? 'Início' : i >= boardSize ? 'Fim' : String(i);
    const cls = cat === 'start' || cat === 'finish' ? `cell-${cat}` : CAT_CLASS[cat];
    cells.push(
      `<div class="board-cell ${cls}" data-i="${i}" style="left:${pos.left};top:${pos.top}" title="Casa ${label}">
        <span>${label}</span>
      </div>`
    );
  }

  const pawns = (players || [])
    .map((p) => {
      const pos = perimeterCoords(p.position || 0, boardSize);
      const isCurrent = currentPlayerId && Number(p.id) === Number(currentPlayerId);
      return `<div class="pawn ${isCurrent ? 'is-current' : ''}" data-player="${p.id}"
        style="left:${pos.left};top:${pos.top};--pawn:${p.color || '#e2b12c'}"
        title="${escapeAttr(p.nickname)} · casa ${p.position || 0}">
        <span>${escapeAttr((p.nickname || '?').slice(0, 1).toUpperCase())}</span>
      </div>`;
    })
    .join('');

  container.innerHTML = `
    <div class="board-felt">
      <div class="board-center">
        <strong>Perfil</strong>
        <span>Acerte com menos dicas e avance mais casas</span>
      </div>
      ${cells.join('')}
      ${pawns}
    </div>`;
}

function escapeAttr(s) {
  return String(s || '')
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;');
}
