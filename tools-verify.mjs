import fs from 'node:fs';
await import('./render.js'); // popula globalThis.SB
const SB = globalThis.SB;

const { songs } = JSON.parse(fs.readFileSync('songs.json', 'utf8'));

// parser de uma seção renderizada -> objeto (mesma lógica do tools-parse-songs)
function pick(re, s){ const r = re.exec(s); return r ? r[1].trim() : null; }
function parseSection(block, classExtra, id){
  const classes = ('song ' + classExtra).split(/\s+/);
  const bloco = classes.includes('b2') ? 2 : 1;
  const chordsTop = classes.includes('chords-top');
  const num = pick(/<div class="songnum">(\d+)<\/div>/, block);
  const title = pick(/<h2 class="songtitle">([\s\S]*?)<\/h2>/, block);
  const artist = pick(/<div class="songartist">([\s\S]*?)<\/div>/, block) || '';
  const mb = pick(/<div class="metabar">([\s\S]*?)<\/div>(?:<div class="songnote")/, block)
          ?? pick(/<div class="metabar">([\s\S]*?)<\/div>(?:<div class="sections)/, block)
          ?? pick(/<div class="metabar">([\s\S]*?)<\/div>/, block);
  let tom=null, levada=null, singers=[];
  if (mb){
    tom = pick(/<span class="meta"><b>Tom<\/b>\s*([\s\S]*?)<\/span>/, mb);
    levada = pick(/<span class="meta"><b>Levada<\/b>\s*([\s\S]*?)<\/span>/, mb);
    const sgRe = /sg-([a-z]+)"><span class="sgdot"><\/span>([^<]+)<\/span>/g; let s;
    while ((s = sgRe.exec(mb))) singers.push({ key: s[1], name: s[2].trim() });
  }
  const note = pick(/<div class="songnote">([\s\S]*?)<\/div>/, block);
  const wrapM = /<div class="sections([^"]*)">([\s\S]*)<\/div>\s*$/.exec(block.trim());
  const cols2 = wrapM ? /cols2/.test(wrapM[1]) : false;
  const sectionsHtml = wrapM ? wrapM[2] : '';
  const sections = [];
  for (const chunk of sectionsHtml.split(/<div class="section">/).slice(1)){
    const label = pick(/<div class="seclabel">([\s\S]*?)<\/div>/, chunk) || '';
    const lines = [];
    for (const lc of chunk.split(/<div class="line">/).slice(1)){
      const cue = pick(/<div class="cue">([\s\S]*?)<\/div>/, lc);
      const chords = pick(/<div class="chords">([\s\S]*?)<\/div>/, lc);
      if (cue===null && chords===null) continue;
      const line = {}; if (cue!==null) line.cue=cue; if (chords!==null) line.chords=chords; lines.push(line);
    }
    sections.push({ label, lines });
  }
  return { id, num:Number(num), bloco, title, artist, tom, levada, singers, note, cols2, chordsTop, sections };
}

// unescape para comparar (render escapa &<>)
function unesc(o){
  return JSON.parse(JSON.stringify(o).replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>'));
}

const rendered = SB.renderSongsArea(songs);
const secRe = /<section class="song([^"]*)" id="(b\d-\d+)">([\s\S]*?)<\/section>/g;
let m, diffs = 0;
const byId = Object.fromEntries(songs.map(s=>[s.id,s]));
while ((m = secRe.exec(rendered))){
  const got = unesc(parseSection(m[3], m[1].trim(), m[2]));
  const want = byId[m[2]];
  const a = JSON.stringify(want), b = JSON.stringify(got);
  if (a !== b){ diffs++; if (diffs<=5){ console.log('DIFF', m[2]); console.log(' want', a.slice(0,200)); console.log('  got', b.slice(0,200)); } }
}
console.log(diffs === 0 ? '✓ round-trip dados: IDÊNTICO (40 músicas)' : ('✗ '+diffs+' músicas diferem'));

// índice regenerado vs original
const html = fs.readFileSync('index.html', 'utf8');
const idxRe = /<li><a href="#(b\d-\d+)"><span class="ix-num">\d+<\/span><span class="ix-title">([\s\S]*?)<\/span><span class="ix-artist">([\s\S]*?)<\/span><\/a><\/li>/g;
const origIdx = {}; let im;
while ((im = idxRe.exec(html))) origIdx[im[1]] = { title: im[2], artist: im[3] };
let idxDiff = 0;
for (const s of songs){
  const title = SB.renderIndexBlocks([s]).match(/ix-title">([\s\S]*?)<\/span>/)[1];
  const artist = SB.renderIndexBlocks([s]).match(/ix-artist">([\s\S]*?)<\/span><\/a>/)[1];
  const o = origIdx[s.id]; if (!o) { console.log('idx faltando', s.id); idxDiff++; continue; }
  if (o.title !== title || o.artist.replace(/&amp;/g,'&') !== artist.replace(/&amp;/g,'&')){
    idxDiff++; if (idxDiff<=8){ console.log('ÍNDICE difere', s.id);
      if(o.title!==title) console.log('  title orig=['+o.title+'] novo=['+title+']');
      if(o.artist!==artist) console.log('  artist orig=['+o.artist+'] novo=['+artist+']'); }
  }
}
console.log(idxDiff === 0 ? '✓ índice regenerado: IDÊNTICO' : ('⚠ '+idxDiff+' itens de índice diferem (ver acima)'));
