import { AnimationEngine } from './animation-engine.js';
import { getCardBackImageUrl, renderCardBack, renderCard } from './card-renderer.js';
import { majorArcana } from './cards-data.js?v=public-demo-v1';

export const cardById = new Map(majorArcana.map(card => [card.id, card]));
export function createDraw(previousIds = [], supplementary = false, options = {}) {
  const requestedCount = Number.parseInt(options.count, 10);
  const count = Math.max(1, Math.min(supplementary ? 2 : 5, requestedCount || (supplementary ? 1 : 3)));
  const deck = majorArcana.filter(card => !previousIds.includes(card.id)).map(card => ({ id: card.id, isReversed: Math.random() < .4 }));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  if (deck.length < count) return null;
  const defaults = supplementary
    ? ['补充指引', '需要看见的另一面']
    : ['当下的处境', '潜在的阻碍', '前行的方向', '未被看见的影响', '整合指引'];
  const positions = Array.isArray(options.positions) ? options.positions.slice(0, count) : [];
  while (positions.length < count) positions.push(defaults[positions.length] ?? `牌位 ${positions.length + 1}`);
  return {
    id: crypto.randomUUID(), status: 'ready', count, positions, deck, selected: [],
    kind: supplementary ? 'supplement' : 'primary',
    questionSummary: typeof options.questionSummary === 'string' ? options.questionSummary : '',
  };
}

export function appendCardResults(container, cards, { reveal = false } = {}) {
  const ready = [];
  const grid = document.createElement('div');
  grid.className = 'reading-cards';
  for (const selected of cards) {
    const card = cardById.get(selected.id);
    if (!card) continue;
    const figure = document.createElement('figure');
    const position = document.createElement('p');
    position.className = 'reading-position';
    position.textContent = selected.position;
    const face = document.createElement('button');
    face.type = 'button';
    face.className = 'reading-face';
    face.setAttribute('aria-label',  `查看${card.name}，${selected.isReversed ? '逆位' : '正位'}`);
    const flip = document.createElement('span');
    flip.className = 'reading-flip';
    const front = document.createElement('span');
    front.className = 'reading-front';
    const back = document.createElement('span');
    back.className = 'reading-back';
    back.setAttribute('aria-hidden', 'true');
    renderCardBack(back);
    flip.append(front, back);
    face.append(flip);
    ready.push(renderCard(card, front, { showReversed: selected.isReversed }));
    face.addEventListener('click', () => openCardDetail(selected, face));
    if (reveal) {
      flip.style.setProperty('--reveal-delay', `${ready.length * 240}ms`);
      flip.classList.add('awaiting-reveal');
    }
    const name = document.createElement('figcaption');
    name.textContent = `${card.name} · ${selected.isReversed ? '逆位' : '正位'}`;
    const meaning = document.createElement('p');
    meaning.className = 'reading-meaning';
    meaning.textContent = '核心关键词：' + card.knowledge.keywords;
    figure.append(position, face, name, meaning);
    grid.append(figure);
  }
  container.append(grid);
  if (reveal) void Promise.all(ready).then(() => {
    if (!grid.isConnected) return;
    requestAnimationFrame(() => grid.querySelectorAll('.reading-flip').forEach(flip => {
      flip.classList.remove('awaiting-reveal');
      flip.classList.add('reveal');
    }));
  });
  const note = document.createElement('p');
  note.className = 'reading-note';
  note.textContent = '点击牌面，可查看这张牌的专业牌义参考';
  container.append(note);
}

const positionDescriptions = {
  '当下的处境': '这张牌所处的位置，用来探索你目前的状态与正在面对的事情。',
  '潜在的阻碍': '这个位置用来观察尚未察觉的影响，或值得留意的挑战。',
  '前行的方向': '这个位置用来探索接下来可以关注的方向与可能性。',
  '补充指引': '这张补充牌为原来的牌阵增加一个观察角度。'
};
function openCardDetail(selected, trigger) {
  const card = cardById.get(selected.id);
  const modal = document.createElement('dialog');
  modal.className = 'card-detail';
  modal.setAttribute('aria-labelledby', 'cardDetailTitle');
  modal.innerHTML = `<button class="detail-close icon-button" aria-label="关闭牌面详情" type="button">×</button>
    <div class="detail-art"></div><div class="detail-copy"><p class="eyebrow">YOUR CARD</p><h2 id="cardDetailTitle"></h2><p class="detail-position"></p><p class="detail-position-description"></p><p class="detail-meaning"></p><details class="detail-book"><summary>牌面与象征</summary><p class="detail-symbolism"></p></details><details class="detail-book"><summary>智慧指引</summary><p class="detail-wisdom"></p></details><p class="reading-note">基础牌义参考</p></div>`;
  modal.querySelector('h2').textContent = `${card.name} · ${selected.isReversed ? '逆位' : '正位'}`;
  modal.querySelector('.detail-position').textContent = selected.position;
  modal.querySelector('.detail-position-description').textContent = positionDescriptions[selected.position] ?? selected.position;
  modal.querySelector('.detail-meaning').textContent = selected.isReversed ? card.reversedDesc : card.uprightDesc;
  void renderCard(card, modal.querySelector('.detail-art'), { showReversed: selected.isReversed });
  modal.querySelector('.detail-symbolism').textContent = card.knowledge.symbolism;
  modal.querySelector('.detail-wisdom').textContent = card.knowledge.wisdom;
  const close = () => modal.close();
  modal.querySelector('.detail-close').addEventListener('click', close);
  modal.addEventListener('click', event => {
    if (event.target !== modal) return;
    const rect = modal.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
  });
  modal.addEventListener('close', () => {
    document.body.classList.remove('viewing-card');
    modal.remove();
    trigger.focus({ preventScroll: true });
  }, { once: true });
  document.body.append(modal);
  document.body.classList.add('viewing-card');
  modal.showModal();
}

let closeCurrent = null;
export function closeDraw() { closeCurrent?.(); }
export async function openDraw(draw, { onPick, onComplete, onClose }) {
  closeDraw();
  const modal = document.createElement('dialog');
  modal.className = 'draw-modal';
  modal.setAttribute('aria-labelledby', 'drawTitle');
  modal.innerHTML = `<button class="draw-close" type="button" aria-label="暂时收起牌阵">×</button>
    <div class="draw-heading"><p class="eyebrow">A MOMENT FOR YOURSELF</p><h2 id="drawTitle">静下心，让直觉带你选牌</h2><p class="draw-progress" role="status" aria-live="polite"></p></div>
    <div class="draw-orbit" role="group" aria-label="待选塔罗牌">
      <div class="draw-gesture-hint" aria-hidden="true"><span class="gesture-arrow">‹</span><span class="gesture-copy">按住左右拖动牌阵</span><span class="gesture-arrow">›</span></div>
    </div>
    <div class="draw-slots" aria-label="已选牌位"></div>
    <p class="draw-help">轻点一张牌，跟随你的第一感觉 · 键盘可用 Tab 与 Enter 选择</p>
    <button class="draw-return" type="button">稍后继续</button>`;
  document.body.append(modal);
  const orbit = modal.querySelector('.draw-orbit');
  const gestureCopy = modal.querySelector('.gesture-copy');
  const progress = modal.querySelector('.draw-progress');
  const slots = modal.querySelector('.draw-slots');
  let engine;
  let disposed = false;
  let busy = false;
  let revealTimer;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const update = () => {
    progress.textContent = draw.selected.length === draw.count ? '选牌完成，牌面即将揭晓' : `请选择 ${draw.count} 张牌 · 已选 ${draw.selected.length} / ${draw.count}`;
    slots.replaceChildren();
    draw.positions.forEach((position, i) => {
      const slot = document.createElement('span');
      slot.className = 'draw-slot' + (i < draw.selected.length ? ' filled' : '');
      slot.textContent = `${i < draw.selected.length ? '✧' : '·'} ${position}`;
      slots.append(slot);
    });
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    clearTimeout(revealTimer);
    engine?.destroy();
    modal.close();
    modal.remove();
    document.body.classList.remove('drawing');
    if (closeCurrent === dispose) closeCurrent = null;
    onClose?.();
  };
  closeCurrent = dispose;
  modal.querySelector('.draw-close').addEventListener('click', dispose);
  modal.querySelector('.draw-return').addEventListener('click', dispose);
  modal.addEventListener('cancel', event => { event.preventDefault(); dispose(); });
  update();
  modal.showModal();
  document.body.classList.add('drawing');
  const back = await getCardBackImageUrl();
  if (disposed) return;
  engine = new AnimationEngine(orbit);
  engine.enableDrag();
  engine.setOrbitSpeed(.22);
  if (reducedMotion) engine.setAutoRotate(false);
  const remaining = draw.deck.filter(card => !draw.selected.some(picked => picked.id === card.id));
  let pointerStart;
  let dragged = false;
  let keyboardNavigating = false;
  modal.addEventListener('keydown', event => {
    if (event.key === 'Tab' || event.key.startsWith('Arrow')) keyboardNavigating = true;
  });
  orbit.addEventListener('pointerdown', event => {
    keyboardNavigating = false;
    engine.setAutoRotate(!reducedMotion);
    pointerStart = { x: event.clientX, y: event.clientY };
    dragged = false;
  });
  orbit.addEventListener('pointermove', event => {
    if (pointerStart && Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 8) {
      dragged = true;
      orbit.classList.add('is-dragging');
      gestureCopy.textContent = '松开后，牌阵会继续缓缓转动';
    }
  });
  const finishDrag = () => {
    pointerStart = null;
    orbit.classList.remove('is-dragging');
    if (dragged) gestureCopy.textContent = '继续左右拖动，寻找下一张牌';
  };
  orbit.addEventListener('pointerup', finishDrag);
  orbit.addEventListener('pointercancel', () => { dragged = true; finishDrag(); });
  remaining.forEach((card, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'floating-card';
    button.setAttribute('aria-label', `选择第 ${index + 1} 张背面牌`);
    if (back) button.style.backgroundImage = `url("${back}")`;
    else renderCardBack(button);
    orbit.append(button);
    engine.addCard(button, index, remaining.length);
    button.addEventListener('focus', () => {
      if (keyboardNavigating) engine.setAutoRotate(false);
    });
    button.addEventListener('click', async event => {
      if (disposed || busy || button.disabled || (event.detail > 0 && dragged)) return;
      busy = true;
      button.disabled = true;
      draw.selected.push({ ...card, position: draw.positions[draw.selected.length] });
      onPick();
      update();
      if (!reducedMotion) await engine.selectCard(button, { x: orbit.clientWidth / 2, y: orbit.clientHeight / 2 });
      if (disposed) return;
      engine.removeCard(button);
      button.remove();
      busy = false;
      if (!reducedMotion && !keyboardNavigating) engine.setAutoRotate(true);
      if (draw.selected.length < draw.count) {
        gestureCopy.textContent = draw.selected.length === 1
          ? '牌阵仍在转动 · 拖动寻找第二张牌'
          : '牌阵仍在转动 · 拖动寻找最后一张牌';
      }
      if (draw.selected.length === draw.count) {
        onComplete();
        busy = true;
        modal.classList.add('draw-complete');
        modal.querySelector('h2').textContent = '你的牌，准备好了';
        modal.querySelector('.draw-help').textContent = '回到对话，一起揭开牌面';
        modal.querySelector('.draw-return').textContent = '查看牌面';
        revealTimer = setTimeout(dispose, reducedMotion ? 0 : 900);
      }
    });
  });
  engine.start();
}
