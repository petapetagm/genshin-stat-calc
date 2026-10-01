let allCharacters = [];
let allWeapons = [];
let selectedCharacter = null;
let selectedWeapon = null;

// 初期化処理
document.addEventListener('DOMContentLoaded', () => {
  // 入力監視設定
  ['baseAtk', 'shownAtk', 'CRT', 'CRD', 'dmgBonus', 'elementMastery'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', calculate);
  });

  // フィルター＆武器選択の監視設定
  const elementFilter = document.getElementById('element-filter');
  const weaponFilter = document.getElementById('weapon-type-filter');
  const weaponSelect = document.getElementById('weapon-select');

  if (elementFilter) elementFilter.addEventListener('change', filterCharacters);
  if (weaponFilter) weaponFilter.addEventListener('change', filterCharacters);
  if (weaponSelect) weaponSelect.addEventListener('change', onWeaponChange);

  // データ並行読み込み
  loadAllData();
  calculate();
});

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

// キャラクターグリッドの描画
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

    // キャラクター選択時
    card.addEventListener('click', () => {
      document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedCharacter = char;

      // キャラクターの武器種に応じて武器ドロップダウンを生成
      updateWeaponDropdown(char.weaponType);

      // ステータス再計算・反映
      applyStats();
    });

    grid.appendChild(card);
  });
}

// 武器ドロップダウンの更新
function updateWeaponDropdown(weaponType) {
  const weaponSelect = document.getElementById('weapon-select');
  weaponSelect.innerHTML = '<option value="">武器を選択してください</option>';
  weaponSelect.disabled = false;
  selectedWeapon = null;

  // 該当する weaponType の武器だけを抽出
  const matchedWeapons = allWeapons.filter(w => w.weaponType === weaponType);

  matchedWeapons.forEach(w => {
    const opt = document.createElement('option');
    opt.value = w.id;
    opt.textContent = w.name;
    weaponSelect.appendChild(opt);
  });
}

// 武器選択変更時
function onWeaponChange(e) {
  const weaponId = e.target.value;
  selectedWeapon = allWeapons.find(w => w.id === weaponId) || null;
  applyStats();
}

// キャラクターと武器のステータスを計算してフォームにセット
function applyStats() {
  if (!selectedCharacter) return;

  // 1. 基礎攻撃力（キャラクター基礎 + 武器基礎）
  let totalBaseAtk = selectedCharacter.baseAtk || 0;
  if (selectedWeapon && selectedWeapon.baseAtk) {
    totalBaseAtk += selectedWeapon.baseAtk;
  }
  document.getElementById("baseAtk").value = totalBaseAtk;

  // 2. 会心・熟知等の初期値（キャラ基礎＋突破ボーナス＋武器サブステータス）
  let crtVal = 5.0;  // 基礎会心率 5%
  let crdVal = 50.0; // 基礎会心ダメージ 50%
  let emVal = 0;     // 基礎熟知 0

  // キャラクター突破ボーナス
  if (selectedCharacter.ascensionStat === 'crt') crtVal += 19.2;
  if (selectedCharacter.ascensionStat === 'crd') crdVal += 38.4;
  if (selectedCharacter.ascensionStat === 'em') emVal += 115.2;

  // 武器サブステータスの加算
  if (selectedWeapon) {
    if (selectedWeapon.subStatType === 'crt') crtVal += selectedWeapon.subStatValue;
    if (selectedWeapon.subStatType === 'crd') crdVal += selectedWeapon.subStatValue;
    if (selectedWeapon.subStatType === 'em') emVal += selectedWeapon.subStatValue;
  }

  document.getElementById("CRT").value = crtVal.toFixed(1);
  document.getElementById("CRD").value = crdVal.toFixed(1);
  document.getElementById("elementMastery").value = Math.round(emVal);

  calculate();
}

// フィルター処理
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

// ステータス計算処理
function calculate() {
  const baseAtk = Number(document.getElementById('baseAtk').value) || 0;
  const shownAtk = Number(document.getElementById('shownAtk').value) || 0;
  const CRT = Number(document.getElementById('CRT').value) || 0;
  const CRD = Number(document.getElementById('CRD').value) || 0;
  const dmgBonus = Number(document.getElementById('dmgBonus').value) || 0;
  const elementMastery = Number(document.getElementById('elementMastery').value) || 0;

  const atkRatioEl = document.getElementById('atkRatio');
  const crtRatioEl = document.getElementById('crtRatio');
  const dmgRatioEl = document.getElementById('dmgRatio');
  const emBonusEl = document.getElementById('emBonus');

  if (baseAtk === 0) {
    if (atkRatioEl) atkRatioEl.textContent = '0%';
    if (crtRatioEl) crtRatioEl.textContent = '100.0%';
    if (dmgRatioEl) dmgRatioEl.textContent = '100.0%';
    if (emBonusEl) emBonusEl.textContent = '0.0%';
    return;
  }

  const atkRatio = (shownAtk / baseAtk) * 100;
  const realCRT = Math.min(Math.max(CRT, 0), 100) / 100;
  const crtRatio = (1 + (realCRT * (CRD / 100))) * 100; // 会心補正%
  const dmgRatio = (1 + (dmgBonus / 100)) * 100;        // 与ダメ補正%
  const emBonus = ((6 * elementMastery) / (2000 + elementMastery)) * 100;

  if (atkRatioEl) atkRatioEl.textContent = atkRatio.toFixed(1) + '%';
  if (crtRatioEl) crtRatioEl.textContent = crtRatio.toFixed(1) + '%';
  if (dmgRatioEl) dmgRatioEl.textContent = dmgRatio.toFixed(1) + '%';
  if (emBonusEl) emBonusEl.textContent = emBonus.toFixed(1) + '%';
}