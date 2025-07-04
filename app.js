
document.addEventListener('DOMContentLoaded', () => {
  const themeBtn = document.getElementById('toggle-theme');
  const body = document.body;
  const account = document.getElementById('account');
  const riskPercent = document.getElementById('riskPercent');
  const manualStop = document.getElementById('manualStop');
  const leverageInput = document.getElementById('leverage');
  const rrr = document.getElementById('rrr');
  const calculateBtn = document.getElementById('calculate');
  const resultsDiv = document.getElementById('results');
  const historyTable = document.getElementById('tradeHistory').querySelector('tbody');
  const clearBtn = document.getElementById('clearHistory');

  let equityChart, pnlChart, drawdownChart;

  const savedTheme = localStorage.getItem('theme') || 'dark';
  body.setAttribute('data-theme', savedTheme);
  themeBtn.addEventListener('click', () => {
    const next = body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    body.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });

  calculateBtn.addEventListener('click', () => {
    const acc = parseFloat(account.value);
    const risk = parseFloat(riskPercent.value);
    const stopPct = parseFloat(manualStop.value);
    const lev = parseFloat(leverageInput.value || 1);
    const ratio = parseFloat(rrr.value);

    if (!acc || !risk || !stopPct || !lev) {
      resultsDiv.innerHTML = "<p>Please fill in all fields.</p>";
      return;
    }

    const riskDollar = acc * (risk / 100);
    const stopDecimal = stopPct / 100;
    const positionValue = riskDollar / stopDecimal;
    const marginRequired = positionValue / lev;
    const stopDollar = riskDollar / positionValue;
    const targetDollar = ratio ? riskDollar * ratio : null;
    const targetPct = targetDollar ? (targetDollar / positionValue) * 100 : null;

    let output = `
      <p><strong>Risk ($):</strong> $${riskDollar.toFixed(2)}</p>
      <p><strong>Stop Loss:</strong> $${stopDollar.toFixed(2)} (${stopPct.toFixed(2)}%)</p>
      <p><strong>Position Value:</strong> $${positionValue.toFixed(2)}</p>
      <p><strong>Margin Required (Leverage ${lev}x):</strong> $${marginRequired.toFixed(2)}</p>
    `;

    if (targetDollar && targetPct) {
      output += `<p><strong>Take Profit:</strong> $${targetDollar.toFixed(2)} (${targetPct.toFixed(2)}%)</p>`;
    }

    output += `<button id="logTrade">Log Trade</button>`;
    resultsDiv.innerHTML = output;

    document.getElementById('logTrade').addEventListener('click', () => {
      const pl = prompt("Enter profit or loss in $:");
      if (pl === null || isNaN(pl)) return;
      const history = JSON.parse(localStorage.getItem("jorank_history") || "[]");
      history.unshift({
        date: new Date().toLocaleString(),
        risk: riskDollar.toFixed(2),
        value: positionValue.toFixed(2),
        result: parseFloat(pl).toFixed(2)
      });
      localStorage.setItem("jorank_history", JSON.stringify(history));
      updateHistory();
    });
  });

  clearBtn.addEventListener('click', () => {
    if (confirm("Clear all trade history?")) {
      localStorage.removeItem("jorank_history");
      updateHistory();
    }
  });

  window.deleteTrade = (index) => {
    const history = JSON.parse(localStorage.getItem("jorank_history") || "[]");
    history.splice(index, 1);
    localStorage.setItem("jorank_history", JSON.stringify(history));
    updateHistory();
  };

  function updateHistory() {
    const history = JSON.parse(localStorage.getItem("jorank_history") || "[]");
    historyTable.innerHTML = "";
    const pnl = [], equity = [], labels = [];
    let sum = 0;

    history.forEach((t, i) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${t.date}</td>
        <td>$${t.risk}</td>
        <td>$${t.value}</td>
        <td>$${t.result}</td>
        <td><button onclick="deleteTrade(${i})">🗑️</button></td>
      `;
      historyTable.appendChild(row);

      const result = parseFloat(t.result);
      pnl.push(result);
      sum += result;
      equity.push(sum);
      labels.push(t.date);
    });

    const peak = equity.map((v, i) => Math.max(...equity.slice(0, i + 1)));
    const drawdown = equity.map((v, i) => ((v - peak[i]) / peak[i]) * 100);

    if (equityChart) equityChart.destroy();
    if (pnlChart) pnlChart.destroy();
    if (drawdownChart) drawdownChart.destroy();

    equityChart = new Chart(document.getElementById("equityCurveChart").getContext("2d"), {
      type: 'line',
      data: { labels, datasets: [{ label: "Equity", data: equity, borderColor: "#00e676" }] }
    });

    pnlChart = new Chart(document.getElementById("pnlChart").getContext("2d"), {
      type: 'bar',
      data: { labels, datasets: [{ label: "P&L", data: pnl, backgroundColor: "#2979ff" }] }
    });

    drawdownChart = new Chart(document.getElementById("drawdownChart").getContext("2d"), {
      type: 'line',
      data: { labels, datasets: [{ label: "Drawdown (%)", data: drawdown, borderColor: "#ff1744" }] }
    });
  }

  updateHistory();
});
