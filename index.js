fetch('/touhou.json').then(async (res) => {
  const options = {
    series: await res.json(),
    chart: {
      height: '100%',
      type: 'line',
      zoom: {
        enabled: false
      },
      toolbar: {
        show: false
      },
      animations: {
        enabled: false,
      },
    },
    stroke: {
      width: 1,
    },
    yaxis: {
      min: -9,
      max: -1,
      forceNiceScale: true,
      decimalsInFloat: 1,
    },
  };
  const chart = new ApexCharts(document.querySelector("#chart"), options);
  chart.render();
});
