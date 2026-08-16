import { api } from './api.js';
import { renderBoard } from './board.js';

const state = {
  mode: null,
  soloToken: null,
  soloScore: 0,
  roomCode: null,
  hostToken: null,
  playerToken: null,
  isHost: false,
  pollTimer: null,
  round: null,
  room: null,
};

const $ = (sel) => document.querySelector(sel);
const catLabel = {
  pessoa: 'Pessoa',
  lugar: 'Lugar',
  ano: 'Ano',
  coisa: 'Coisa',
};
const phaseLabel = {
  lobby: 'Lobby — aguardando início',
  awaiting_roll: 'Hora do dado',
  awaiting_tips: 'Revelando dicas',
  round_over: 'Fim da rodada',
  finished: 'Partida encerrada',
};

function showScreen(name) {
  document.querySelectorAll('.screen').forEach((el) => {
    el.classList.toggle('active', el.dataset.screen === name);
  });
}

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    el.hidden = true;
  }, 2600);
}

function setFeedback(text, kind = '') {
  const el = $('#feedback');
  el.textContent = text || '';
  el.className = `feedback ${kind}`.trim();
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderTips(round) {
  const stage = $('#tipStage');
  const tips = round?.card?.tips || [];
  if (!tips.length) {
    stage.innerHTML =
      '<p class="tip-empty">Role o dado e revele dicas para montar o perfil.</p>';
    return;
  }
  stage.innerHTML = `<ol class="tip-list">${tips
    .map(
      (t, i) =>
        `<li><span class="tip-num">${i + 1}</span><span>${escapeHtml(t)}</span></li>`
    )
    .join('')}</ol>`;
}

function updateDice(value) {
  const face = $('#diceFace');
  const cap = $('#diceCaption');
  if (!value) {
    face.textContent = '—';
    cap.textContent = 'Dado';
    return;
  }
  face.textContent = String(value);
  face.classList.remove('dice-pop');
  void face.offsetWidth;
  face.classList.add('dice-pop');
  const map = {
    1: 'Pessoa',
    2: 'Pessoa',
    3: 'Lugar',
    4: 'Ano',
    5: 'Coisa',
    6: 'Coringa',
  };
  cap.textContent = map[value] || 'Dado';
}

function updatePlayChrome(round) {
  state.round = round;
  const cat = round?.card?.category;
  $('#catBadge').textContent = catLabel[cat] || cat || '—';
  const revealed = round?.card?.revealedCount ?? 0;
  const total = round?.card?.tipsTotal ?? 20;
  $('#tipsMeta').textContent = `${revealed} / ${total} dicas`;
  renderTips(round);

  const ended = round && round.status !== 'active';
  $('#guessInput').disabled =
    Boolean(ended) ||
    (state.mode === 'room' && state.room?.turnPhase !== 'awaiting_tips');
  $('#guessForm').querySelector('button[type="submit"]').disabled = $('#guessInput').disabled;

  if (state.mode === 'solo') {
    $('#modePill').textContent = 'Solo';
    $('#scorePill').textContent = `${state.soloScore} pts`;
    $('#topMeta').hidden = false;
    $('#playSide').hidden = true;
    $('#boardWrap').hidden = true;
    $('#btnReveal').hidden = false;
    $('#btnReveal').disabled = ended || revealed >= total;
    $('#btnGiveUp').hidden = ended;
    $('#btnNext').hidden = !ended;
    $('#btnBeginGame').hidden = true;
    $('#btnRoll').hidden = true;
    $('#btnSkip').hidden = true;
    $('#btnNextTurn').hidden = true;
    $('#btnHostStart').hidden = true;
  }
}

function renderScoreboard(players, meId, currentId) {
  const ul = $('#scoreboard');
  ul.innerHTML = (players || [])
    .map((p) => {
      const turn = currentId && Number(p.id) === Number(currentId) ? ' · vez' : '';
      return `<li class="${p.id === meId ? 'is-me' : ''}">
        <span><i class="pawn-dot" style="--pawn:${p.color || '#e2b12c'}"></i>${escapeHtml(p.nickname)}${
          p.isHost ? ' ★' : ''
        }${turn}</span>
        <strong>casa ${p.position ?? 0}</strong>
      </li>`;
    })
    .join('');
}

function applyRoomUi(data) {
  state.room = data;
  state.isHost = Boolean(data.me?.isHost);
  const phase = data.turnPhase || 'lobby';
  const isLobby = data.status === 'lobby' || phase === 'lobby';
  const finished = data.status === 'finished' || phase === 'finished';

  $('#roomCodeLabel').textContent = data.code;
  $('#phaseLine').textContent = phaseLabel[phase] || phase;
  $('#rulesMini').textContent = [data.rules?.players, data.rules?.movement]
    .filter(Boolean)
    .join(' · ');
  renderScoreboard(data.players, data.me?.id, data.currentPlayer?.id);
  $('#modePill').textContent = `Sala ${data.code}`;
  $('#scorePill').textContent = `casa ${data.me?.position ?? 0}`;
  $('#topMeta').hidden = false;
  $('#playSide').hidden = false;
  $('#boardWrap').hidden = false;

  renderBoard($('#boardRoot'), {
    boardSize: data.boardSize || 40,
    players: data.players || [],
    currentPlayerId: data.currentPlayer?.id,
  });
  updateDice(data.lastDice);

  const myTurn =
    data.currentPlayer && data.me && Number(data.currentPlayer.id) === Number(data.me.id);
  $('#turnPill').hidden = false;
  $('#turnPill').textContent = finished
    ? `Venceu: ${data.winner?.nickname || '—'}`
    : data.currentPlayer
      ? `Vez de ${data.currentPlayer.nickname}`
      : '—';

  // Botões
  $('#btnBeginGame').hidden = !(state.isHost && isLobby);
  $('#btnRoll').hidden = !(
    !finished &&
    phase === 'awaiting_roll' &&
    (state.isHost || myTurn)
  );
  $('#btnReveal').hidden = !(state.isHost && phase === 'awaiting_tips');
  $('#btnSkip').hidden = !(state.isHost && phase === 'awaiting_tips');
  $('#btnNextTurn').hidden = !(phase === 'round_over' && !finished);
  $('#btnGiveUp').hidden = true;
  $('#btnNext').hidden = true;
  $('#btnHostStart').hidden = true;

  if (data.round && phase === 'awaiting_tips') {
    updatePlayChrome(data.round);
    const revealed = data.round.card?.revealedCount ?? 0;
    const total = data.round.card?.tipsTotal ?? 20;
    $('#btnReveal').disabled = revealed >= total;
  } else if (phase === 'awaiting_roll') {
    $('#catBadge').textContent = 'Dado';
    $('#tipsMeta').textContent = 'Role para sortear a categoria';
    $('#tipStage').innerHTML =
      '<p class="tip-empty">O jogador da vez (ou o host) rola o dado. 1–2 Pessoa · 3 Lugar · 4 Ano · 5 Coisa · 6 Coringa.</p>';
    $('#guessInput').disabled = true;
    $('#guessForm').querySelector('button[type="submit"]').disabled = true;
  } else if (isLobby) {
    $('#catBadge').textContent = 'Lobby';
    const n = (data.players || []).length;
    $('#tipsMeta').textContent = `${n} / 6 jogador(es)`;
    const need = Math.max(0, 2 - n);
    $('#tipStage').innerHTML = state.isHost
      ? `<p class="tip-empty">${
          need > 0
            ? `Faltam <strong>${need}</strong> jogador(es) para iniciar (mín. 2).`
            : 'Todos prontos? Toque em <strong>Iniciar jogo</strong> — a ordem será <strong>sorteada</strong>.'
        }</p>`
      : '<p class="tip-empty">Aguardando o host iniciar o jogo… A ordem de turno será sorteada.</p>';
    $('#guessInput').disabled = true;
    $('#guessForm').querySelector('button[type="submit"]').disabled = true;
    $('#btnBeginGame').disabled = n < 2;
  } else if (finished) {
    $('#tipStage').innerHTML = `<p class="tip-empty"><strong>${escapeHtml(
      data.winner?.nickname || 'Alguém'
    )}</strong> chegou ao fim do tabuleiro!</p>`;
    $('#guessInput').disabled = true;
    $('#guessForm').querySelector('button[type="submit"]').disabled = true;
  } else if (phase === 'round_over') {
    $('#tipStage').innerHTML =
      '<p class="tip-empty">Rodada encerrada. Toque em <strong>Próximo turno</strong>.</p>';
    $('#guessInput').disabled = true;
    $('#guessForm').querySelector('button[type="submit"]').disabled = true;
  }
}

async function refreshRoom() {
  if (!state.roomCode || !state.playerToken) return;
  const data = await api.roomState(state.roomCode, state.playerToken);
  applyRoomUi(data);
}

function stopPoll() {
  if (state.pollTimer) {
    clearInterval(state.pollTimer);
    state.pollTimer = null;
  }
}

function startPoll() {
  stopPoll();
  state.pollTimer = setInterval(() => {
    refreshRoom().catch(() => {});
  }, 1500);
}

async function enterSoloPlay() {
  const category = $('#soloCategory').value || undefined;
  const nickname = $('#soloNick').value.trim() || undefined;
  const data = await api.soloStart({ category, nickname });
  state.mode = 'solo';
  state.soloToken = data.token;
  showScreen('play');
  updatePlayChrome(data);
  setFeedback('');
  $('#guessInput').value = '';
  $('#guessInput').focus();
}

async function createRoom() {
  const nickname = $('#roomNick').value.trim();
  if (nickname.length < 2) {
    toast('Digite um apelido');
    return;
  }
  const data = await api.createRoom(nickname);
  state.mode = 'room';
  state.roomCode = data.code;
  state.hostToken = data.hostToken;
  state.playerToken = data.playerToken;
  state.isHost = true;
  showScreen('play');
  await refreshRoom();
  startPoll();
  toast(`Sala ${data.code} criada`);
}

async function joinRoom() {
  const nickname = $('#roomNick').value.trim();
  const code = $('#roomCodeInput').value.trim().toUpperCase();
  if (nickname.length < 2 || code.length < 4) {
    toast('Apelido e código são obrigatórios');
    return;
  }
  const data = await api.joinRoom(code, nickname);
  state.mode = 'room';
  state.roomCode = data.code;
  state.playerToken = data.playerToken;
  state.hostToken = null;
  state.isHost = false;
  showScreen('play');
  await refreshRoom();
  startPoll();
  toast(`Entrou na sala ${data.code}`);
}

document.querySelectorAll('[data-go]').forEach((btn) => {
  btn.addEventListener('click', () => {
    stopPoll();
    showScreen(btn.dataset.go);
  });
});

$('#btnSoloStart').addEventListener('click', async () => {
  try {
    await enterSoloPlay();
  } catch (err) {
    toast(err.message);
  }
});

$('#btnCreateRoom').addEventListener('click', async () => {
  try {
    await createRoom();
  } catch (err) {
    toast(err.message);
  }
});

$('#btnJoinRoom').addEventListener('click', async () => {
  try {
    await joinRoom();
  } catch (err) {
    toast(err.message);
  }
});

$('#btnBeginGame').addEventListener('click', async () => {
  try {
    const data = await api.roomBegin(state.roomCode, state.hostToken);
    const order = (data.turnOrder || []).map((p) => p.nickname).join(' → ');
    setFeedback(
      order
        ? `Ordem sorteada: ${order}. Começa ${data.firstPlayer || data.currentPlayer?.nickname}.`
        : 'Partida iniciada! Role o dado.'
    );
    toast(`Começa: ${data.firstPlayer || data.currentPlayer?.nickname || '—'}`);
    applyRoomUi(data);
    // fecha o guia depois do início para liberar espaço
    const box = $('#howtoBox');
    if (box) box.open = false;
  } catch (err) {
    toast(err.message);
  }
});

$('#btnRoll').addEventListener('click', async () => {
  try {
    const data = await api.roomRoll(state.roomCode, {
      hostToken: state.hostToken,
      playerToken: state.playerToken,
    });
    updateDice(data.dice);
    toast(`Dado: ${data.dice} → ${catLabel[data.category] || data.category}`);
    setFeedback(`Categoria: ${catLabel[data.category] || data.category}`);
    await refreshRoom();
  } catch (err) {
    toast(err.message);
  }
});

$('#btnReveal').addEventListener('click', async () => {
  try {
    if (state.mode === 'solo') {
      const data = await api.soloReveal(state.soloToken);
      updatePlayChrome(data);
    } else {
      await api.roomReveal(state.roomCode, state.hostToken);
      await refreshRoom();
    }
  } catch (err) {
    toast(err.message);
  }
});

$('#btnSkip').addEventListener('click', async () => {
  if (!confirm('Passar a vez sem ninguém acertar?')) return;
  try {
    await api.roomSkip(state.roomCode, state.hostToken);
    setFeedback('Vez passada.');
    await refreshRoom();
  } catch (err) {
    toast(err.message);
  }
});

$('#btnNextTurn').addEventListener('click', async () => {
  try {
    await api.roomNext(state.roomCode, {
      hostToken: state.hostToken,
      playerToken: state.playerToken,
    });
    setFeedback('');
    await refreshRoom();
  } catch (err) {
    toast(err.message);
  }
});

$('#guessForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const guess = $('#guessInput').value.trim();
  if (!guess) return;
  try {
    if (state.mode === 'solo') {
      const data = await api.soloGuess(state.soloToken, guess);
      if (data.correct) {
        state.soloScore += data.points || 0;
        setFeedback(`Acertou! +${data.points} — ${data.answer}`, 'ok');
        updatePlayChrome(data);
        toast('Resposta certa!');
      } else {
        setFeedback('Ainda não… revele outra dica ou tente de novo.', 'bad');
        updatePlayChrome(data);
      }
    } else {
      const data = await api.roomGuess(state.roomCode, state.playerToken, guess);
      if (data.correct) {
        setFeedback(
          `Acertou! Avançou ${data.spaces} casa(s) → posição ${data.position}. ${data.answer}`,
          'ok'
        );
        toast(`${data.winner} +${data.spaces} casas`);
        if (data.wonGame) toast('Fim de jogo!');
      } else {
        setFeedback('Errou. Continue tentando!', 'bad');
      }
      $('#guessInput').value = '';
      await refreshRoom();
    }
  } catch (err) {
    toast(err.message);
  }
});

$('#btnGiveUp').addEventListener('click', async () => {
  if (!confirm('Desistir e ver a resposta?')) return;
  try {
    const data = await api.soloGiveUp(state.soloToken);
    setFeedback(`Resposta: ${data.answer}`, 'bad');
    updatePlayChrome(data);
  } catch (err) {
    toast(err.message);
  }
});

$('#btnNext').addEventListener('click', async () => {
  try {
    await enterSoloPlay();
  } catch (err) {
    toast(err.message);
  }
});

$('#btnHostStart').addEventListener('click', async () => {
  try {
    await api.roomStart(state.roomCode, state.hostToken);
    setFeedback('');
    $('#guessInput').value = '';
    await refreshRoom();
  } catch (err) {
    toast(err.message);
  }
});

api
  .stats()
  .then((s) => {
    const parts = (s.byCategory || []).map((c) => `${c.total} ${c.category}`);
    $('#statsLine').textContent = `${s.total} cartas no baralho · ${parts.join(' · ')}`;
  })
  .catch(() => {
    $('#statsLine').textContent = 'API offline — confira PERFIL_API_BASE.';
  });
