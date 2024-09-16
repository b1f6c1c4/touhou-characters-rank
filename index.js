const tooltipEl = document.getElementById('tooltip');
const tmpl = document.getElementById('tooltip-tmpl').innerHTML;
const closer = document.getElementById('close');
const menuer = document.querySelector('#menu > span');
function getContrastColor(c) {
  const color = (c.charAt(0) === '#') ? c.substring(1, 7) : c;
  const R = parseInt(color.substring(0, 2), 16);
  const G = parseInt(color.substring(2, 4), 16);
  const B = parseInt(color.substring(4, 6), 16);
  const A = 1;
  const brightness = R * 0.299 + G * 0.587 + B * 0.114 + (1 - A) * 255;
  return brightness > 186 ? "#000000" : "#FFFFFF";
}
function scaled(v) {
  return Math.min(v, v / window.devicePixelRatio);
}
Mustache.parse(tmpl);
fetch('/touhou.json').then(async (res) => {
  let partial = new Set();
  const series = await res.json();
  series.forEach(s => {
    s.borderWidth = scaled(2);
    s.showLine = true;
    s.order = 1;
    s.tension = 0.3;
    s.pointRadius = scaled(3);
    if (s.aux.group)
      s.borderDash = [scaled(5), scaled(5)];
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
      pointHitRadius: scaled(9),
      animation: false,
      maintainAspectRatio: false,
      scales: {
        x: {
          min: 0,
          max: 275,
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
              size: scaled(8),
            },
            padding: scaled(3),
            boxWidth: scaled(7),
          },
          onClick(e, legendItem, legend) {
            theChart.setActiveElements([]);
            const i = legendItem.datasetIndex;
            if (partial.has(i))
              partial.delete(i);
            else
              partial.add(i);
            tooltipEl.style.display = 'none';
            if (partial.size)
              closer.style.visibility = 'visible';
            else
              closer.style.visibility = 'hidden';
            series.forEach(s => {
              s.order = 1;
              s.borderWidth = partial.size ? 0.1 : scaled(2);
              s.pointRadius = scaled(3);
            });
            partial.forEach(a => {
              const obj = series[a];
              obj.borderWidth = scaled(5);
              obj.pointRadius = scaled(8);
            });
            theChart.update();
          },
        },
        tooltip: {
          enabled: false,
          external(context) {
            // Hide if no tooltip
            const tooltipModel = context.tooltip;
            const ids = new Map();
            tooltipModel.body?.forEach((bi, i) => {
              const v = tooltipModel.dataPoints[i].datasetIndex;
              if (!partial.size || partial.has(v))
                ids.set(v, i);
            });
            if (!ids.size || tooltipModel.opacity === 0) {
              tooltipEl.style.display = 'none';
              if (!partial.size)
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
      onHover(e, as, chart) {
        if (partial.size)
          return;
        const ge = as.flatMap(a => series[a.datasetIndex].aux.group);
        series.forEach(s => {
          s.order = 1;
          s.borderWidth = as.length ? ge.includes(s.label) ? scaled(10) : 0.1 : scaled(2);
          s.pointRadius = scaled(3);
        });
        as.forEach(a => {
          const obj = series[a.datasetIndex];
          obj.order = 0;
          obj.borderWidth = scaled(5);
          obj.pointRadius = scaled(8);
        });
        chart.update();
      },
    },
  };
  const theChart = new Chart(document.getElementById('chart'), options);
  closer.addEventListener('click', () => {
    if (partial.size && theChart.getActiveElements().length) {
      theChart.setActiveElements([]);
      tooltipEl.style.display = 'none';
      return;
    }
    partial.clear();
    theChart.setActiveElements([]);
    series.forEach(s => {
      s.order = 1;
      s.borderWidth = scaled(2);
      s.pointRadius = scaled(3);
    });
    tooltipEl.style.display = 'none';
    closer.style.visibility = 'hidden';
    theChart.update();
  });
  menuer.addEventListener('click', () => {
    document.getElementById('menu').classList.toggle('open');
  });
  Array.from(document.querySelectorAll('#menu div span')).forEach(b => b.addEventListener('click', (e) => {
    const filters = {
      '1面': (s) => s.aux.stage === 1,
      '2面': (s) => s.aux.stage === 2,
      '3面': (s) => s.aux.stage === 3,
      '4面': (s) => s.aux.stage === 4,
      '5面': (s) => s.aux.stage === 5,
      '6面': (s) => s.aux.stage === 6,
      'EX': (s) => s.aux.stage === 'EX',
      'N姐妹': (s) => s.aux.group,
      '人类': (s) => s.aux.human,
      '妖怪': (s) => !s.aux.human,
      '整数作': (s) => /^东方(?:红魔乡|妖妖梦|永夜抄|花映塚|风神录|地灵殿|星莲船|神灵庙|辉针城|绀珠传|天空璋|鬼形兽|虹龙洞|兽王园)$/.test(s.aux.gm),
      '小数作': (s) => /^东方(?:萃梦想|绯想天|文花帖DS|心绮楼|深秘录|凭依华|刚欲异闻)$/.test(s.aux.gm),
      '其它作': (s) => !/^东方(?:红魔乡|妖妖梦|永夜抄|花映塚|风神录|地灵殿|星莲船|神灵庙|辉针城|绀珠传|天空璋|鬼形兽|虹龙洞|兽王园|萃梦想|绯想天|文花帖DS|心绮楼|深秘录|凭依华|刚欲异闻)$/.test(s.aux.gm),
    };
    const t = e.target.innerText;
    let f;
    if (t in filters)
      f = filters[t];
    else
      f = (s) => s.aux.gm === '东方' + t;
    let pos = 0, neg = 0;
    series.forEach((s, i) => {
      if (f(s)) {
        if (partial.has(i))
          pos++;
        else
          neg++;
      }
    });
    console.log(pos, neg);
    series.forEach((s, i) => {
      if (f(s)) {
        if (pos >= neg)
          partial.delete(i);
        else
          partial.add(i);
      }
    });
    theChart.setActiveElements([]);
    tooltipEl.style.display = 'none';
    if (partial.size)
      closer.style.visibility = 'visible';
    else
      closer.style.visibility = 'hidden';
    series.forEach(s => {
      s.order = 1;
      s.borderWidth = partial.size ? 0.1 : scaled(2);
      s.pointRadius = scaled(3);
    });
    partial.forEach(a => {
      const obj = series[a];
      obj.borderWidth = scaled(5);
      obj.pointRadius = scaled(8);
    });
    theChart.update();
  }));
  document.querySelector('h1').remove();
});
