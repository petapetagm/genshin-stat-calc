let allCharacters = [];
let allWeapons = [];
let selectedCharacter = null;
let selectedWeapon = null;

// 初期化処理
document.addEventListener('DOMContentLoaded', () => {
  // 1. 入力欄の変更監視
  ['baseAtk', 'atkPercent', 'CRT', 'CRD', 'dmgBonus', 'elementMastery', 'lunarStarBonus'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', calculate);
  });

// 2. 加減ボタン（.step-btn）のクリック監視
document.querySelectorAll('.step-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const targetId = btn.dataset.target;
    const addVal = parseFloat(btn.dataset.add) || 0;
    const inputEl = document.getElementById(targetId);

    if (inputEl) {
      let currentVal = parseFloat(inputEl.value) || 0;
      currentVal = Math.max(0, currentVal + addVal);
      inputEl.value = (Math.round(currentVal * 10) / 10).toFixed(1).replace(/\.0$/, '');
      calculate();
    }
  });
});

  // タブ切り替えイベント
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    // ボタンの active 切り替え
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // コンテンツの active 切り替え
    const targetTab = btn.dataset.tab;
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });

    if (targetTab === 'numeric') {
      document.getElementById('numeric-tab').classList.add('active');
    } else if (targetTab === 'chart') {
      document.getElementById('chart-tab').classList.add('active');
    }
  });
});

  // 3. 聖遺物メインステ選択ボタンの監視（トグル機能 ＆ 入力欄直接連動）
  document.querySelectorAll('.option-grid').forEach(grid => {
    grid.addEventListener('click', (e) => {
      const target = e.target;
      if (!target.classList.contains('opt-btn')) return;

      const statName = target.dataset.stat;
      const statVal = parseFloat(target.dataset.num) || 0;
      const wasActive = target.classList.contains('active');

      // 同一スロット内の他ボタンの選択解除・数値戻し
      const currentActive = grid.querySelector('.opt-btn.active');
      if (currentActive && currentActive !== target) {
        const oldStat = currentActive.dataset.stat;
        const oldVal = parseFloat(currentActive.dataset.num) || 0;
        modifyInputValue(oldStat, -oldVal);
        currentActive.classList.remove('active');
      }

      if (wasActive) {
        // 解除（もう一度押された場合）
        target.classList.remove('active');
        modifyInputValue(statName, -statVal);
      } else {
        // 選択
        target.classList.add('active');
        modifyInputValue(statName, statVal);
      }

      calculate();
    });
  });

  // 4. フィルター＆武器選択の監視
  const elementFilter = document.getElementById('element-filter');
  const weaponFilter = document.getElementById('weapon-type-filter');
  const weaponSelect = document.getElementById('weapon-select');

  if (elementFilter) elementFilter.addEventListener('change', filterCharacters);
  if (weaponFilter) weaponFilter.addEventListener('change', filterCharacters);
  if (weaponSelect) weaponSelect.addEventListener('change', onWeaponChange);

  loadAllData();
});

// メインステ切り替え時に入力欄の数値を直接変動させる関数
function modifyInputValue(statName, delta) {
  const inputMap = {
    atkPercent: 'atkPercent',
    crt: 'CRT',
    crd: 'CRD',
    dmgBonus: 'dmgBonus',
    em: 'elementMastery'
  };

  const inputId = inputMap[statName];
  if (!inputId) return;

  const inputEl = document.getElementById(inputId);
  if (inputEl) {
    let currentVal = parseFloat(inputEl.value) || 0;
    currentVal = Math.max(0, currentVal + delta);
    inputEl.value = (Math.round(currentVal * 10) / 10).toFixed(1).replace(/\.0$/, '');
  }
}

// JSONデータの取得
async function loadAllData() {
  try {
    const [charRes, weaponRes] = await Promise.all([
      fetch('characters.json'),
      fetch('weapons.json')
    ]);

    if (!charRes.ok || !weaponRes.ok) throw new Error('JSON読み込み失敗');

    allCharacters = await charRes.json();
    allWeapons = await weaponRes.json();

    renderCharacterGrid(allCharacters);
  } catch (error) {
    console.error('エラー:', error);
    const grid = document.getElementById('character-grid');
    if (grid) grid.innerHTML = '<p style="color: #ff5555;">データの読み込みに失敗しました。</p>';
  }
}

// キャラ・武器選択時の基礎ステータス反映
function applyStats() {
  let baseAtk = selectedCharacter ? (selectedCharacter.baseAtk || 0) : 0;
  if (selectedWeapon && selectedWeapon.baseAtk) {
    baseAtk += selectedWeapon.baseAtk;
  }

  // 基礎突破ステータス（全キャラ共通: 会心率5%, 会心ダメ50%）
  let crtVal = 5.0;
  let crdVal = 50.0;
  let emVal = 0;

  if (selectedCharacter) {
    if (selectedCharacter.ascensionStat === 'crt') crtVal += 19.2;
    if (selectedCharacter.ascensionStat === 'crd') crdVal += 38.4;
    if (selectedCharacter.ascensionStat === 'em') emVal += 115.2;
  }

  if (selectedWeapon) {
    if (selectedWeapon.subStatType === 'crt') crtVal += selectedWeapon.subStatValue;
    if (selectedWeapon.subStatType === 'crd') crdVal += selectedWeapon.subStatValue;
    if (selectedWeapon.subStatType === 'em') emVal += selectedWeapon.subStatValue;
  }

  // 選択中のメインステータス分も反映
  document.querySelectorAll('.opt-btn.active').forEach(btn => {
    const stat = btn.dataset.stat;
    const num = parseFloat(btn.dataset.num) || 0;
    if (stat === 'crt') crtVal += num;
    if (stat === 'crd') crdVal += num;
    if (stat === 'em') emVal += num;
  });

  const baseAtkInput = document.getElementById("baseAtk");
  const crtInput = document.getElementById("CRT");
  const crdInput = document.getElementById("CRD");
  const emInput = document.getElementById("elementMastery");

  if (baseAtkInput) baseAtkInput.value = baseAtk;
  if (crtInput) crtInput.value = crtVal.toFixed(1);
  if (crdInput) crdInput.value = crdVal.toFixed(1);
  if (emInput) emInput.value = Math.round(emVal);

  calculate();
}

// キャラクターグリッド描画
function renderCharacterGrid(characters) {
  const grid = document.getElementById('character-grid');
  if (!grid) return;
  grid.innerHTML = '';

  if (characters.length === 0) {
    grid.innerHTML = '<p style="grid-column: 1/-1; color: #a8a8b3;">該当するキャラクターがいません</p>';
    return;
  }

  characters.forEach(char => {
    const card = document.createElement('div');
    card.className = 'char-card';
    if (selectedCharacter && selectedCharacter.id === char.id) {
      card.classList.add('selected');
    }

    const img = document.createElement('img');
    img.src = char.icon || 'https://via.placeholder.com/65?text=?';
    img.alt = char.name;

    const nameSpan = document.createElement('span');
    nameSpan.textContent = char.name;

    card.appendChild(img);
    card.appendChild(nameSpan);

    card.addEventListener('click', () => {
      document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedCharacter = char;

      updateWeaponDropdown(char.weaponType);
      applyStats();
    });

    grid.appendChild(card);
  });
}

// 武器ドロップダウン更新
function updateWeaponDropdown(weaponType) {
  const weaponSelect = document.getElementById('weapon-select');
  weaponSelect.innerHTML = '<option value="">武器を選択してください</option>';
  weaponSelect.disabled = false;
  selectedWeapon = null;

  const matchedWeapons = allWeapons.filter(w => w.weaponType === weaponType);

  matchedWeapons.forEach(w => {
    const opt = document.createElement('option');
    opt.value = w.id;
    opt.textContent = w.name;
    weaponSelect.appendChild(opt);
  });
}

function onWeaponChange(e) {
  const weaponId = e.target.value;
  selectedWeapon = allWeapons.find(w => w.id === weaponId) || null;
  applyStats();
}

function filterCharacters() {
  const selectedElement = document.getElementById('element-filter').value;
  const selectedWeaponType = document.getElementById('weapon-type-filter').value;

  const filtered = allCharacters.filter(char => {
    const matchElement = (selectedElement === 'all') || (char.element === selectedElement);
    const matchWeapon = (selectedWeaponType === 'all') || (char.weaponType === selectedWeaponType);
    return matchElement && matchWeapon;
  });

  renderCharacterGrid(filtered);
}

// 最終計算処理
function calculate() {
  const baseAtk = Number(document.getElementById('baseAtk')?.value) || 0;
  const atkPercent = Number(document.getElementById('atkPercent')?.value) || 0;
  const CRT = Number(document.getElementById('CRT')?.value) || 0;
  const CRD = Number(document.getElementById('CRD')?.value) || 0;
  const dmgBonus = Number(document.getElementById('dmgBonus')?.value) || 0;
  const elementMastery = Number(document.getElementById('elementMastery')?.value) || 0;
  const lunarStarBonus = Number(document.getElementById('lunarStarBonus')?.value) || 0;

  // 羽の固定攻撃力 (+311)
  const featherAtk = baseAtk > 0 ? 311 : 0;
  
  // 表示攻撃力 = 基礎攻撃力 × (1 + 攻撃%/100) + 羽(+311)
  const shownAtk = Math.round(baseAtk * (1 + atkPercent / 100) + featherAtk);

  // 表示HP/防御力（キャラの基礎ステータスデータがある場合は拡張可能）
  const baseHp = selectedCharacter?.baseHp || 0;
  const baseDef = selectedCharacter?.baseDef || 0;
  const featherHp = baseHp > 0 ? 4780 : 0; // 花 (+4780)
  const shownHp = Math.round(baseHp + featherHp);
  const shownDef = Math.round(baseDef);

  const finalShownAtkEl = document.getElementById('finalShownAtk');
  const finalShownHpEl = document.getElementById('finalShownHp');
  const finalShownDefEl = document.getElementById('finalShownDef');
  const atkRatioEl = document.getElementById('atkRatio');
  const crtRatioEl = document.getElementById('crtRatio');
  const dmgRatioEl = document.getElementById('dmgRatio');
  const emBonusEl = document.getElementById('emBonus');

  if (finalShownAtkEl) finalShownAtkEl.textContent = shownAtk;
  if (finalShownHpEl) finalShownHpEl.textContent = shownHp;
  if (finalShownDefEl) finalShownDefEl.textContent = shownDef;

  if (baseAtk === 0) {
    if (atkRatioEl) atkRatioEl.textContent = '0%';
    if (crtRatioEl) crtRatioEl.textContent = '100.0%';
    if (dmgRatioEl) dmgRatioEl.textContent = '100.0%';
    if (emBonusEl) emBonusEl.textContent = '0.0%';
    return;
  }

  const atkRatio = (shownAtk / baseAtk) * 100;
  const realCRT = Math.min(Math.max(CRT, 0), 100) / 100;
  const crtRatio = (1 + (realCRT * (CRD / 100))) * 100;
  const dmgRatio = (1 + (dmgBonus / 100)) * 100;
  const emBonus = ((6 * elementMastery) / (2000 + elementMastery)) * 100 + lunarStarBonus;

  if (atkRatioEl) atkRatioEl.textContent = atkRatio.toFixed(1) + '%';
  if (crtRatioEl) crtRatioEl.textContent = crtRatio.toFixed(1) + '%';
  if (dmgRatioEl) dmgRatioEl.textContent = dmgRatio.toFixed(1) + '%';
  if (emBonusEl) emBonusEl.textContent = emBonus.toFixed(1) + '%';
}