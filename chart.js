let statusChart = null;

/**
 * ステータス倍率の棒グラフを描画・更新する関数
 */
function updateChart(mainRatio, crtRatio, dmgRatio, emBonus, mainLabel = '攻撃比率') {
  const ctx = document.getElementById('statusChart')?.getContext('2d');
  if (!ctx) return;

  const dataValues = [mainRatio, crtRatio, dmgRatio, emBonus];
  const labels = [mainLabel, '会心補正', '与ダメ補正', '月・星ボーナス'];

  if (statusChart) {
    statusChart.data.labels = labels;
    statusChart.data.datasets[0].data = dataValues;
    statusChart.update();
    return;
  }

  statusChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: '倍率 (%)',
        data: dataValues,
        backgroundColor: [
          'rgba(56, 189, 248, 0.8)', // メイン比率（水色）
          'rgba(168, 85, 247, 0.8)',  // 会心補正（紫）
          'rgba(244, 63, 94, 0.8)',   // 与ダメ補正（赤）
          'rgba(34, 197, 94, 0.8)'    // 月・星（緑）
        ],
        borderRadius: 6,
        borderWidth: 0
      }]
    },
    options: {
      indexAxis: 'y', // 横向きの棒グラフにする設定
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          beginAtZero: true,
          suggestedMax: 200,
          grid: { color: 'rgba(148, 163, 184, 0.1)' },
          ticks: { color: '#94a3b8' }
        },
        y: {
          grid: { display: false },
          ticks: { color: '#f8fafc', font: { weight: 'bold' } }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

function resizeChart() {
  if (statusChart) {
    statusChart.resize();
  }
}