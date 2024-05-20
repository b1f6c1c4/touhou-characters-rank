const tooltipEl = document.getElementById('tooltip');
const tmpl = document.getElementById('tooltip-tmpl').innerHTML;
const closer = document.getElementById('close');
function getContrastColor(c) {
  const color = (c.charAt(0) === '#') ? c.substring(1, 7) : c;
  const R = parseInt(color.substring(0, 2), 16);
  const G = parseInt(color.substring(2, 4), 16);
  const B = parseInt(color.substring(4, 6), 16);
  const A = 1;
  const brightness = R * 0.299 + G * 0.587 + B * 0.114 + (1 - A) * 255;
  return brightness > 186 ? "#000000" : "#FFFFFF";
}
Mustache.parse(tmpl);
fetch('/touhou.json').then(async (res) => {
  const series = await res.json();
  series.forEach(s => {
    s.borderWidth = 2;
    s.showLine = true;
    s.order = 1;
    s.tension = 0.3;
    s.pointRadius = 3;
    if (s.aux.group)
      s.borderDash = [5, 5];
    if (s.aux.grouped) {
      s.borderColor += '33';
      s.backgroundColor += '33';
    }
  });
  const options = {
    type: 'scatter',
    data: {
      datasets: series,
    },
    options: {
      pointHitRadius: Math.min(window.innerWidth, window.innerHeight) > 1000 ? 9 : undefined,
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
        },
      },
      events: ['click'],
      plugins: {
        legend: {
          labels: {
            font: {
              size: 8,
            },
            padding: 3,
            boxWidth: 7,
          },
        },
        tooltip: {
          enabled: false,
          external(context) {
            // Hide if no tooltip
            const tooltipModel = context.tooltip;
            if (tooltipModel.opacity === 0) {
              tooltipEl.style.display = 'none';
              closer.style.visibility = 'hidden';
              return;
            }

            // Set caret Position
            tooltipEl.classList.remove('above', 'below', 'no-transform');
            if (tooltipModel.yAlign) {
              tooltipEl.classList.add(tooltipModel.yAlign);
            } else {
              tooltipEl.classList.add('no-transform');
            }

            // Set Text
            let ids = new Map();
            if (tooltipModel.body) {
              tooltipModel.body.forEach((bi, i) => ids.set(tooltipModel.dataPoints[i].datasetIndex, i));
              tooltipEl.innerHTML = Mustache.render(tmpl, {
                title: tooltipModel.title || [],
                body: Array.from(ids, ([id, i]) => {
                  const colors = tooltipModel.labelColors[i];
                  const style = `
                    background: ${colors.backgroundColor.substring(0, 7)};
                    border-color: ${colors.borderColor.substring(0, 7)};
                    color: ${getContrastColor(colors.backgroundColor)};
                  `;
                  const { label, aux } = series[id];
                  const m = label.match(/^(?<l>[^（）]*)(?<l2>（.*）)?$/);
                  const { l, l2 } = m.groups;
                  return {
                    style,
                    cls: l.length <= 4 ? 'nm-lg' : l.length <= 6 ? 'nm-md' : 'nm-sm',
                    multi: Array.isArray(aux.url) ? 'multi' : '',
                    label: l,
                    label2: l2,
                    ...aux,
                    dt: new Date(aux.dt).toISOString().replace(/T.*/, ''),
                    v: Math.round(Math.log(aux.v) * 1000) / 1000,
                  };
                }),
              });
            }

            const position = context.chart.canvas.getBoundingClientRect();
            const bodyFont = Chart.helpers.toFont(tooltipModel.options.bodyFont);

            // Display, position, and set styles for font
            closer.style.visibility = 'visible';
            tooltipEl.style.opacity = 1;
            tooltipEl.style.display = 'flex';
            tooltipEl.style.position = 'absolute';
            if (ids.size === 1) {
              if (tooltipModel.caretX > position.width / 2) {
                tooltipEl.style.left = 'unset';
                tooltipEl.style.right = window.innerWidth - position.right - window.scrollX + position.width - tooltipModel.caretX + 'px';
              } else {
                tooltipEl.style.left = position.left + window.scrollX + tooltipModel.caretX + 'px';
                tooltipEl.style.right = 'unset';
              }
              if (tooltipModel.caretY > position.height / 2) {
                tooltipEl.style.top = 'unset';
                tooltipEl.style.bottom = window.innerHeight - position.bottom - window.scrollY + position.height - tooltipModel.caretY + 'px';
              } else {
                tooltipEl.style.top = position.top + window.scrollY + tooltipModel.caretY + 'px';
                tooltipEl.style.bottom = 'unset';
              }
              tooltipEl.style.width = 'unset';
            } else {
              tooltipEl.style.left = '0';
              tooltipEl.style.right = 'unset';
              tooltipEl.style.width = '100vw';
              tooltipEl.style.top = '0';
              tooltipEl.style.bottom = 'unset';
            }
            tooltipEl.style.font = bodyFont.string;
            tooltipEl.style.padding = tooltipModel.padding + 'px ' + tooltipModel.padding + 'px';
          },
        },
      },
      onHover: (e, as, chart) => {
        const ge = as.flatMap(a => series[a.datasetIndex].aux.group);
        series.forEach(s => {
          s.order = 1;
          s.borderWidth = as.length ? ge.includes(s.label) ? 10 : 0.1 : 2;
          s.pointRadius = 3;
        });
        as.forEach(a => {
          const obj = series[a.datasetIndex];
          obj.order = 0;
          obj.borderWidth = 5;
          obj.pointRadius = 8;
        });
        chart.update();
      },
    },
  };
  const theChart = new Chart(document.getElementById('chart'), options);
  closer.addEventListener('click', () => {
    theChart.setActiveElements([]);
    series.forEach(s => {
      s.order = 1;
      s.borderWidth = 2;
      s.pointRadius = 3;
    });
    tooltipEl.style.display = 'none';
    closer.style.visibility = 'hidden';
    theChart.update();
  });
  document.querySelector('h1').remove();
});
