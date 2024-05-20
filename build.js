const { createGunzip } = require('node:zlib');
const { buffer } = require('node:stream/consumers');
const { XMLParser } = require('fast-xml-parser');
const { createReadStream } = require('node:fs');
const fs = require('node:fs/promises');

const gunzip = createGunzip();
const source = createReadStream('touhou.gnumeric');
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix : "@"
});
source.pipe(gunzip);

const colors = {
  '': '#c9cbcf',
  1: '#ffcd56',
  2: '#4bc0c0',
  3: '#a5f43b',
  4: '#36a2eb',
  5: '#ff9f40',
  6: '#ff6384',
  EX: '#9966ff',
};

async function process() {
  const chars = {};
  const sheets = {};
  const ex = {};
  const groups = {};
  const [logos, workbook] = await Promise.all([
    fs.readFile('logo.json'),
    buffer(gunzip),
  ]);
  const logo = JSON.parse(logos);
  parser.parse(workbook)['gnm:Workbook']['gnm:Sheets']['gnm:Sheet'].forEach(({ ['gnm:Name']: nm, ['gnm:Cells']: { ['gnm:Cell'] : cl } }) => {
    if (nm === 'char') {
      let dt, gm, co, special;
      cl.forEach(({ ['@Row']: r, ['@Col']: c, ['#text']: t }) => {
        if (c == 0) {
          gm = t;
          special = false;
        } else if (c == 1)
          ;
        else if (c == 2)
          dt = new Date(Date.UTC(0, 0, t-1))
        else if (c == 3)
          co = t;
        else if (c == 4)
          special = t == 'special';
        else if (!(t in chars)) {
          chars[t] = {
            gm,
            dt,
            g: [],
            v: 0,
            dtxx: undefined,
            color: special ? co : colors[''],
            co,
            url: logo['/'+t],
          };
        }
      });
    } else if (nm === 'stage') {
      let ch;
      cl.forEach(({ ['@Row']: r, ['@Col']: c, ['#text']: t }) => {
        if (c == 0)
          ch = t;
        else if (c == 1) {
          if (chars[ch].color === colors['']) {
            chars[ch].color = colors[t];
            chars[ch].stage = t;
          }
        }
      });
    } else if (nm === 'groups') {
      let grp;
      cl.forEach(({ ['@Row']: r, ['@Col']: c, ['#text']: t }) => {
        if (c == 0) {
          grp = t;
          chars[grp].group = [];
        } else {
          chars[grp].group.push(t);
          groups[t] = grp;
        }
      });
    } else {
      const dt = new Date(nm);
      const votes = {};
      let totalVotes = 0;
      let ch;
      cl.forEach(({ ['@Row']: r, ['@Col']: c, ['#text']: t }) => {
        if (c == 0)
          ch = t;
        else if (c == 1) {
          votes[ch] = +t;
          if (ch in groups) {
            if (!(groups[ch] in votes))
              votes[groups[ch]] = t;
            else
              votes[groups[ch]] += t;
          }
          totalVotes += +t;
        }
      });
      for (const ch in votes) {
        const vv = votes[ch] / totalVotes * cl.length / 2;
        if (!(ch in chars)) {
          if (!(ch in ex))
            ex[ch] = 0;
          ex[ch] += vv;
        } else {
          const obj = chars[ch];
          obj.dtxx = nm;
          obj.g.push([dt - obj.dt, vv]);
          obj.v += vv;
        }
      }
      for (const ch in chars) {
        const obj = chars[ch];
        if (obj.dtxx === nm)
          continue;
        if (dt < obj.dt)
          continue;
        obj.g.push([dt - obj.dt, Math.exp(-10)]);
      }
    }
  });
  const series = [];
  Object.entries(chars).forEach(([ch, { g, gm, dt, v, color, co, url, stage, group }]) => {
    if (g.length >= 2)
      series.push({
        label: ch,
        data: g.map(([x, y]) => ({
          x: (x / 86400000 / 365.2425 * 12),
          y: Math.round(1000 * Math.log(y)) / 1000,
        })),
        borderColor: color,
        backgroundColor: co,
        aux: {
          url: group ? group.map(c => chars[c].url) : url,
          gm,
          dt,
          v,
          stage,
          group,
          grouped: groups[ch],
        },
      });
  });
  return JSON.stringify(series);
}

fs.rm('dist/', { recursive: true, force: true }).then(() =>
  fs.mkdir('dist/', { recursive: true }).then(() => Promise.all([
    fs.link('index.html', 'dist/index.html'),
    fs.link('index.js', 'dist/index.js'),
    fs.link('index.css', 'dist/index.css'),
    fs.link('node_modules/chart.js/dist/chart.umd.js', 'dist/chart.umd.js'),
    fs.link('node_modules/chart.js/dist/chart.umd.js.map', 'dist/chart.umd.js.map'),
    fs.link('node_modules/mustache/mustache.min.js', 'dist/mustache.js'),
    process().then((res) => fs.writeFile('dist/touhou.json', res)),
  ])));
