const tmpl = document.getElementById('tooltip-tmpl').innerHTML;
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
        },
      },
      events: ['click'],
      plugins: {
        tooltip: {
          enabled: false,
          external(context) {
            // Tooltip Element
            let tooltipEl = document.getElementById('tooltip');

            // Hide if no tooltip
            const tooltipModel = context.tooltip;
            if (tooltipModel.opacity === 0) {
              tooltipEl.style.opacity = 0;
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
            if (tooltipModel.body) {
              const titleLines = tooltipModel.title || [];
              const bodyLines = tooltipModel.body.map(bi => bi.lines);
              let o;
              tooltipEl.innerHTML = Mustache.render(tmpl, o = {
                title: tooltipModel.title || [],
                body: tooltipModel.body.map((bi, i) => {
                  const colors = tooltipModel.labelColors[i];
                  const style = `
                    background: ${colors.backgroundColor};
                    border-color: ${colors.borderColor};
                    color: ${getContrastColor(colors.backgroundColor)};
                  `;
                  const { label, aux } = series[tooltipModel.dataPoints[i].datasetIndex];
                  return {
                    style,
                    label,
                    cls: label.length <= 4 ? 'nm-lg' : label.length <= 6 ? 'nm-md' : 'nm-sm',
                    ...aux,
                    v: Math.round(Math.log(aux.v) * 1000) / 1000,
                  };
                }),
              });
              console.dir(o);
            }

            const position = context.chart.canvas.getBoundingClientRect();
            const bodyFont = Chart.helpers.toFont(tooltipModel.options.bodyFont);

            // Display, position, and set styles for font
            tooltipEl.style.opacity = 1;
            tooltipEl.style.position = 'absolute';
            tooltipEl.style.left = position.left + window.pageXOffset + tooltipModel.caretX + 'px';
            tooltipEl.style.top = position.top + window.pageYOffset + tooltipModel.caretY + 'px';
            tooltipEl.style.font = bodyFont.string;
            tooltipEl.style.padding = tooltipModel.padding + 'px ' + tooltipModel.padding + 'px';
            tooltipEl.style.pointerEvents = 'none';
          },
        },
      },
      onHover: (e, as, chart) => {
        if (as.length) {
          const [a] = as;
          console.dir(a);
          const obj = series[a.datasetIndex];
        }
      },
    },
  };
  new Chart(document.getElementById('chart'), options);
});
