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

async function process() {
  const chars = {};
  const sheets = {};
  const ex = {};
  parser.parse(await buffer(gunzip))['gnm:Workbook']['gnm:Sheets']['gnm:Sheet'].forEach(({ ['gnm:Name']: nm, ['gnm:Cells']: { ['gnm:Cell'] : cl } }) => {
    if (nm === 'char') {
      let dt, gm;
      cl.forEach(({ ['@Row']: r, ['@Col']: c, ['#text']: t }) => {
        if (c == 0)
          gm = t;
        else if (c == 1)
          dt = new Date(Date.UTC(0, 0, t-1))
        else if (!(t in chars))
          chars[t] = { gm, dt, g: [], v: 0, dtxx: undefined };
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
          totalVotes += +t;
        }
      });
      for (const ch in votes) {
        const vv = votes[ch] / totalVotes;
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
        console.error({ ch, nm });
      }
    }
  });
  const series = [];
  Object.entries(chars).sort((a, b) => b[1].v - a[1].v).forEach(([ch, { g, gm, dt, v }]) => {
    if (g.length >= 2)
      series.push({
        name: ch,
        data: g.map(([x, y]) => ({
          x: (x / 86400000 / 365.2425 * 12),
          y: Math.round(1000 * Math.log(y)) / 1000,
        })),
      });
  });
  return JSON.stringify(series);
}

fs.rm('dist/', { recursive: true, force: true }).then(() =>
  fs.mkdir('dist/', { recursive: true }).then(() => Promise.all([
    fs.copyFile('index.html', 'dist/index.html'),
    process().then((res) => fs.writeFile('dist/touhou.json', res)),
  ])));
