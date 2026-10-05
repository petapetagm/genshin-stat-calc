let allCharacters = [];
let allWeapons = [];
let selectedCharacter = null;
let selectedWeapon = null;
let selectedElement = 'all';
let selectedWeaponType = 'all';

// 初期化処理
document.addEventListener('DOMContentLoaded', () => {

  // --- 1. テーマ切り替え ---
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const savedTheme = localStorage.getItem('theme') || 'light';
  
  if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    if (themeToggleBtn) themeToggleBtn.textContent = '☀️ ライトモード';
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      if (currentTheme === 'dark') {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        themeToggleBtn.textContent = '🌙 ダークモード';
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        themeToggleBtn.textContent = '☀️ ライトモード';
      }
    });
  }

  // --- 2. 元素フィルター監視 ---
  const elemButtons = document.querySelectorAll('#element-filter-group .elem-btn');
  elemButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      elemButtons.forEach(b => b.classList.remove('active'));
      const targetBtn = e.currentTarget;
      targetBtn.classList.add('active');
      selectedElement = targetBtn.getAttribute('data-element');
      filterCharacters();
    });
  });

  // --- 3. 武器種フィルター監視 ---
  const wpButtons = document.querySelectorAll('#weapon-filter-group .wp-btn');
  wpButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      wpButtons.forEach(b => b.classList.remove('active'));
      const targetBtn = e.currentTarget;
      targetBtn.classList.add('active');
      selectedWeaponType = targetBtn.getAttribute('data-weapon');
      filterCharacters();
    });
  });

  // --- 4. 武器ドロップダウン監視 ---
  const weaponSelect = document.getElementById('weapon-select');
  if (weaponSelect) {
    weaponSelect.addEventListener('change', onWeaponChange);
  }

  // --- 5. 入力欄の変更監視（統一） ---
  ['baseAtk', 'baseHp', 'baseDef', 'atkPercent', 'hpPercent', 'defPercent', 'CRT', 'CRD', 'dmgBonus', 'elementMastery', 'lunarStarBonus'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', calculate);
  });

  // --- 6. 加減ボタン（.step-btn）監視 ---
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

  // --- 7. タブ切り替え ---
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const targetTab = btn.dataset.tab;
      document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

      if (targetTab === 'numeric') {
        document.getElementById('numeric-tab').classList.add('active');
      } else if (targetTab === 'chart') {
        document.getElementById('chart-tab').classList.add('active');
        if (typeof resizeChart === 'function') resizeChart();
      }
    });
  });

  // --- 8. 聖遺物メインステ選択ボタン監視 ---
  document.querySelectorAll('.option-grid').forEach(grid => {
    grid.addEventListener('click', (e) => {
      const target = e.target;
      if (!target.classList.contains('opt-btn')) return;

      const statName = target.dataset.stat;
      const statVal = parseFloat(target.dataset.num) || 0;
      const wasActive = target.classList.contains('active');

      const currentActive = grid.querySelector('.opt-btn.active');
      if (currentActive && currentActive !== target) {
        const oldStat = currentActive.dataset.stat;
        const oldVal = parseFloat(currentActive.dataset.num) || 0;
        modifyInputValue(oldStat, -oldVal);
        currentActive.classList.remove('active');
      }

      if (wasActive) {
        target.classList.remove('active');
        modifyInputValue(statName, -statVal);
      } else {
        target.classList.add('active');
        modifyInputValue(statName, statVal);
      }

      calculate();
    });
  });

  loadAllData();
});

function modifyInputValue(statName, delta) {
  const inputMap = {
    atkPercent: 'atkPercent',
    hpPercent: 'hpPercent',
    defPercent: 'defPercent',
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

function applyStats() {
  let baseAtk = selectedCharacter ? (selectedCharacter.baseAtk || 0) : 0;
  if (selectedWeapon && selectedWeapon.baseAtk) {
    baseAtk += selectedWeapon.baseAtk;
  }

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

  document.querySelectorAll('.opt-btn.active').forEach(btn => {
    const stat = btn.dataset.stat;
    const num = parseFloat(btn.dataset.num) || 0;
    if (stat === 'crt') crtVal += num;
    if (stat === 'crd') crdVal += num;
    if (stat === 'em') emVal += num;
  });

  let baseHp = selectedCharacter ? (selectedCharacter.baseHp || 0) : 0;
  let baseDef = selectedCharacter ? (selectedCharacter.baseDef || 0) : 0;

  const baseAtkInput = document.getElementById("baseAtk");
  const baseHpInput = document.getElementById("baseHp");
  const baseDefInput = document.getElementById("baseDef");
  const crtInput = document.getElementById("CRT");
  const crdInput = document.getElementById("CRD");
  const emInput = document.getElementById("elementMastery");

  if (baseAtkInput) baseAtkInput.value = baseAtk;
  if (baseHpInput) baseHpInput.value = baseHp;
  if (baseDefInput) baseDefInput.value = baseDef; 
  if (crtInput) crtInput.value = crtVal.toFixed(1);
  if (crdInput) crdInput.value = crdVal.toFixed(1);
  if (emInput) emInput.value = Math.round(emVal);

  calculate();
}

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
      const isAlreadySelected = card.classList.contains('selected');
      const isSelectedOnly = grid.classList.contains('selected-only');

      if (isAlreadySelected && isSelectedOnly) {
        card.classList.remove('selected');
        grid.classList.remove('selected-only');
        selectedCharacter = null;
        updateWeaponDropdown('');
        applyStats();
        return;
      }

      document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedCharacter = char;

      grid.classList.add('selected-only');

      updateWeaponDropdown(char.weaponType);
      applyStats();
    });

    grid.appendChild(card);
  });
}

function updateWeaponDropdown(weaponType) {
  const weaponSelect = document.getElementById('weapon-select');
  if (!weaponSelect) return;

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
  const filtered = allCharacters.filter(char => {
    const matchElement = (selectedElement === 'all') || (char.element === selectedElement);
    const matchWeapon = (selectedWeaponType === 'all') || (char.weaponType === selectedWeaponType);
    return matchElement && matchWeapon;
  });

  renderCharacterGrid(filtered);
}

// 最終計算処理（修正版）
function calculate() {
  const baseAtk = parseFloat(document.getElementById("baseAtk")?.value) || 0;
  const baseHp = parseFloat(document.getElementById("baseHp")?.value) || 0;
  const baseDef = parseFloat(document.getElementById("baseDef")?.value) || 0;

  const atkPercent = parseFloat(document.getElementById("atkPercent")?.value) || 0;
  const hpPercent = parseFloat(document.getElementById("hpPercent")?.value) || 0;
  const defPercent = parseFloat(document.getElementById("defPercent")?.value) || 0;

  const crt = parseFloat(document.getElementById("CRT")?.value) || 0;
  const crd = parseFloat(document.getElementById("CRD")?.value) || 0;
  const dmgBonus = parseFloat(document.getElementById("dmgBonus")?.value) || 0;
  const em = parseFloat(document.getElementById("elementMastery")?.value) || 0;
  const lunarStarBonus = parseFloat(document.getElementById("lunarStarBonus")?.value) || 0;

  // ステータス実数値計算
  const finalAtk = Math.round(baseAtk * (1 + atkPercent / 100));
  const finalHp = Math.round(baseHp * (1 + hpPercent / 100));
  const finalDef = Math.round(baseDef * (1 + defPercent / 100));

  // 倍率・補正値計算
  const crtRatioVal = 1 + Math.min(Math.max(crt, 0), 100) / 100 * (crd / 100);
  const dmgRatioVal = 1 + dmgBonus / 100;
  const emBonusVal = 1 + lunarStarBonus / 100;
  const atkRatioVal = baseAtk > 0 ? (finalAtk / baseAtk) * 100 : 0;

  // DOM反映
  const finalShownAtk = document.getElementById("finalShownAtk");
  const finalShownHp = document.getElementById("finalShownHp");
  const finalShownDef = document.getElementById("finalShownDef");

  if (finalShownAtk) finalShownAtk.textContent = finalAtk.toLocaleString();
  if (finalShownHp) finalShownHp.textContent = finalHp.toLocaleString();
  if (finalShownDef) finalShownDef.textContent = finalDef.toLocaleString();

  const atkRatio = document.getElementById("atkRatio");
  const crtRatio = document.getElementById("crtRatio");
  const dmgRatio = document.getElementById("dmgRatio");
  const emBonus = document.getElementById("emBonus");

  if (atkRatio) atkRatio.textContent = `${atkRatioVal.toFixed(1)}%`;
  if (crtRatio) crtRatio.textContent = `${(crtRatioVal * 100).toFixed(1)}%`;
  if (dmgRatio) dmgRatio.textContent = `${(dmgRatioVal * 100).toFixed(1)}%`;
  if (emBonus) emBonus.textContent = `${(emBonusVal * 100).toFixed(1)}%`;

  // Chart.js グラフ更新
  if (typeof updateChart === 'function') {
    updateChart(
      Math.round(atkRatioVal),
      Math.round(crtRatioVal * 100),
      Math.round(dmgRatioVal * 100),
      Math.round(emBonusVal * 100)
    );
  }
}