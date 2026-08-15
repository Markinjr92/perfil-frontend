import { api } from './api.js';

const state = {
  mode: null, // solo | room
  soloToken: null,
  soloScore: 0,
  roomCode: null,
  hostToken: null,
  playerToken: null,
  isHost: false,
  pollTimer: null,
  round: null,
};

const $ = (sel) => document.querySelector(sel);
const catLabel = {
  pessoa: 'Pessoa',
  lugar: 'Lugar',
  ano: 'Ano',
  coisa: 'Coisa',
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
  }, 2400);
}

function setFeedback(text, kind = '') {
  const el = $('#feedback');
  el.textContent = text || '';
  el.className = `feedback ${kind}`.trim();
}

function renderTips(round) {
  const stage = $('#tipStage');
  const tips = round?.card?.tips || [];
  if (!tips.length) {
    stage.innerHTML = '<p class="tip-empty">Toque em <strong>Revelar dica</strong> para começar.</p>';
    return;
  }
  stage.innerHTML = `<ol class="tip-list">${tips
    .map(
      (t, i) =>
        `<li><span class="tip-num">${i + 1}</span><span>${escapeHtml(t)}</span></li>`
    )
    .join('')}</ol>`;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
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
  $('#btnReveal').disabled = ended || revealed >= total;
  $('#btnGiveUp').hidden = state.mode !== 'solo' || ended;
  $('#btnNext').hidden = !(state.mode === 'solo' && ended);
  $('#btnHostStart').hidden = !(state.mode === 'room' && state.isHost && ended);
  $('#guessInput').disabled = ended;
  $('#guessForm').querySelector('button[type="submit"]').disabled = ended;

  if (state.mode === 'solo') {
    $('#modePill').textContent = 'Solo';
    $('#scorePill').textContent = `${state.soloScore} pts`;
    $('#topMeta').hidden = false;
    $('#playSide').hidden = true;
  }
}

function renderScoreboard(players, meId) {
  const ul = $('#scoreboard');
  ul.innerHTML = (players || [])
    .map(
      (p) =>
        `<li class="${p.id === meId ? 'is-me' : ''}"><span>${escapeHtml(p.nickname)}${
          p.isHost ? ' ★' : ''
        }</span><strong>${p.score}</strong></li>`
    )
    .join('');
}

async function refreshRoom() {
  if (!state.roomCode || !state.playerToken) return;
  const data = await api.roomState(state.roomCode, state.playerToken);
  state.isHost = Boolean(data.me?.isHost);
  $('#roomCodeLabel').textContent = data.code;
  renderScoreboard(data.players, data.me?.id);
  $('#modePill').textContent = `Sala ${data.code}`;
  $('#scorePill').textContent = `${data.me?.score ?? 0} pts`;
  $('#topMeta').hidden = false;
  $('#playSide').hidden = false;

  if (data.round) {
    updatePlayChrome(data.round);
    $('#btnHostStart').hidden = !(state.isHost && data.round.status !== 'active');
    $('#btnReveal').hidden = state.mode === 'room' && !state.isHost;
  } else {
    $('#tipStage').innerHTML =
      '<p class="tip-empty">Aguardando o host iniciar a rodada…</p>';
    $('#btnReveal').disabled = true;
    $('#btnReveal').hidden = true;
    $('#btnHostStart').hidden = !state.isHost;
    $('#btnGiveUp').hidden = true;
    $('#btnNext').hidden = true;
  }
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
  }, 2000);
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

$('#guessForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const guess = $('#guessInput').value.trim();
  if (!guess) return;
  try {
    if (state.mode === 'solo') {
      const data = await api.soloGuess(state.soloToken, guess);
      if (data.correct) {
        state.soloScore += data.points || 0;
        setFeedback(`Acertou! +${data.points} pts — ${data.answer}`, 'ok');
        updatePlayChrome(data);
        toast('Resposta certa!');
      } else {
        setFeedback('Ainda não… revele outra dica ou tente de novo.', 'bad');
        updatePlayChrome(data);
      }
    } else {
      const data = await api.roomGuess(state.roomCode, state.playerToken, guess);
      if (data.correct) {
        setFeedback(`Acertou! +${data.points} pts — ${data.answer}`, 'ok');
        toast(`${data.winner} acertou!`);
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
