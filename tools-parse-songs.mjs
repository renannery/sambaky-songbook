import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');

// pega cada <section class="song ..."> ... </section>
const secRe = /<section class="song([^"]*)" id="(b\d-\d+)">([\s\S]*?)<\/section>/g;
const songs = [];
let m;
const anomalies = [];

function pick(re, s){ const r = re.exec(s); return r ? r[1].trim() : null; }

while ((m = secRe.exec(html))) {
  const classExtra = m[1].trim();        // ex: "b1 chords-top"
  const id = m[2];
  const body = m[3];
  const classes = ('song ' + classExtra).split(/\s+/);
  const bloco = classes.includes('b2') ? 2 : 1;
  const chordsTop = classes.includes('chords-top');

  const num = pick(/<div class="songnum">(\d+)<\/div>/, body);
  const title = pick(/<h2 class="songtitle">([\s\S]*?)<\/h2>/, body);
  const artist = pick(/<div class="songartist">([\s\S]*?)<\/div>/, body) || '';

  // metabar
  const mb = pick(/<div class="metabar">([\s\S]*?)<\/div>\s*(?:<div class="songnote")/, body)
          ?? pick(/<div class="metabar">([\s\S]*?)<\/div>\s*<div class="sections/, body)
          ?? pick(/<div class="metabar">([\s\S]*?)<\/div>/, body);
  let tom=null, levada=null, singers=[];
  if (mb) {
    tom = pick(/<span class="meta"><b>Tom<\/b>\s*([\s\S]*?)<\/span>/, mb);
    levada = pick(/<span class="meta"><b>Levada<\/b>\s*([\s\S]*?)<\/span>/, mb);
    const sgRe = /sg-([a-z]+)"><span class="sgdot"><\/span>([^<]+)<\/span>/g;
    let s;
    while ((s = sgRe.exec(mb))) singers.push({ key: s[1], name: s[2].trim() });
  }

  const note = pick(/<div class="songnote">([\s\S]*?)<\/div>/, body);

  // sections wrapper
  const wrapM = /<div class="sections([^"]*)">([\s\S]*)<\/div>\s*$/.exec(body.trim());
  const cols2 = wrapM ? /cols2/.test(wrapM[1]) : false;
  const sectionsHtml = wrapM ? wrapM[2] : '';

  const sections = [];
  const secChunks = sectionsHtml.split(/<div class="section">/).slice(1);
  for (const chunk of secChunks) {
    const label = pick(/<div class="seclabel">([\s\S]*?)<\/div>/, chunk);
    const lines = [];
    const lineChunks = chunk.split(/<div class="line">/).slice(1);
    for (const lc of lineChunks) {
      const cue = pick(/<div class="cue">([\s\S]*?)<\/div>/, lc);
      const chords = pick(/<div class="chords">([\s\S]*?)<\/div>/, lc);
      if (cue === null && chords === null) continue;
      const line = {};
      if (cue !== null) line.cue = cue;
      if (chords !== null) line.chords = chords;
      lines.push(line);
    }
    sections.push({ label: label || '', lines });
  }

  if (!num || !title) anomalies.push(`${id}: faltando num/title`);
  if (sections.length === 0) anomalies.push(`${id}: sem seções`);

  songs.push({ id, num: Number(num), bloco, title, artist, tom, levada, singers, note, cols2, chordsTop, sections });
}

fs.writeFileSync('songs.json', JSON.stringify({ version: 1, songs }, null, 2) + '\n');

// ---- verificação ----
console.log('músicas:', songs.length);
console.log('com cols2:', songs.filter(s=>s.cols2).length, '| chordsTop:', songs.filter(s=>s.chordsTop).length, '| com note:', songs.filter(s=>s.note).length);
const totalLines = songs.reduce((a,s)=>a+s.sections.reduce((b,x)=>b+x.lines.length,0),0);
console.log('total de linhas:', totalLines);
if (anomalies.length) console.log('ANOMALIAS:\n' + anomalies.join('\n')); else console.log('sem anomalias');
// amostra: b1-2 (corrigida) e b1-20 (medley)
for (const id of ['b1-2','b1-20']) {
  const s = songs.find(x=>x.id===id);
  console.log('\n=== '+id+' ===\n'+JSON.stringify(s, null, 1));
}
