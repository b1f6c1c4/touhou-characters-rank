fetch('/touhou.json').then(async (res) => {
  const series = await res.json();
  series.forEach(s => {
    s.borderWidth = 2;
    s.showLine = true;
  });
  const options = {
    type: 'scatter',
    data: {
      datasets: series,
    },
    options: {
      animation: false,
      maintainAspectRatio: false,
      scales: {
        x: {
          min: 0,
          max: 260,
        },
        y: {
          type: 'linear',
          min: -3.5,
          max: 2.5,
        }
      }
    }
  };
  console.dir(options);
  new Chart(document.getElementById('chart'), options);
});
