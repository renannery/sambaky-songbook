/* Renderizador compartilhado (browser + node). Gera a mesma marcação do songbook
   a partir do modelo de dados (songs.json). */
(function (g) {
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function singersHTML(singers) {
    return (singers || []).map(function (g) {
      return '<span class="sgchip sg-' + g.key + '"><span class="sgdot"></span>' + esc(g.name) + '</span>';
    }).join('');
  }

  function renderSongSection(s) {
    var cls = 'song b' + s.bloco + (s.chordsTop ? ' chords-top' : '');
    var h = '<section class="' + cls + '" id="' + s.id + '">';
    h += '<header class="songhead"><div class="songnum">' + esc(s.num) + '</div>';
    h += '<div class="songtitlewrap"><h2 class="songtitle">' + esc(s.title) + '</h2>';
    h += '<div class="songartist">' + esc(s.artist || '') + '</div></div>';
    if (s.singers && s.singers.length) h += '<div class="songsingers"><span class="mic">🎤</span> ' + singersHTML(s.singers) + '</div>';
    h += '</header>';
    var meta = '';
    if (s.tom) meta += '<span class="meta"><b>Tom</b> ' + esc(s.tom) + '</span>';
    if (s.levada) meta += '<span class="meta"><b>Levada</b> ' + esc(s.levada) + '</span>';
    if (meta) h += '<div class="metabar">' + meta + '</div>';
    if (s.note) h += '<div class="songnote">' + esc(s.note) + '</div>';
    h += '<div class="sections' + (s.cols2 ? ' cols2' : ' ') + '">';
    (s.sections || []).forEach(function (sec) {
      h += '<div class="section">';
      if (sec.label != null && sec.label !== '') h += '<div class="seclabel">' + esc(sec.label) + '</div>';
      (sec.lines || []).forEach(function (ln) {
        h += '<div class="line">';
        if (ln.cue != null) h += '<div class="cue">' + esc(ln.cue) + '</div>';
        if (ln.chords != null) h += '<div class="chords">' + esc(ln.chords) + '</div>';
        h += '</div>';
      });
      h += '</div>';
    });
    h += '</div></section>';
    return h;
  }

  function ixTitle(s) { return esc(s.title) + (s.tom ? ' · ' + esc(s.tom) : ''); }
  function ixArtist(s) {
    var a = esc(s.artist || '');
    if (s.singers && s.singers.length) a += ' ' + singersHTML(s.singers);
    return a;
  }

  function renderIndexBlocks(songs) {
    var h = '';
    [1, 2].forEach(function (bloco) {
      var list = songs.filter(function (s) { return s.bloco === bloco; });
      if (!list.length) return;
      h += '<h3 class="bloco-head">Bloco ' + bloco + '</h3>';
      h += '<ol class="indexlist">';
      list.forEach(function (s) {
        h += '<li><a href="#' + s.id + '"><span class="ix-num">' + esc(s.num) + '</span>'
          + '<span class="ix-title">' + ixTitle(s) + '</span>'
          + '<span class="ix-artist">' + ixArtist(s) + '</span></a></li>';
      });
      h += '</ol>';
    });
    return h;
  }

  // <h3>Bloco N</h3> + sections, para a área principal
  function renderSongsArea(songs) {
    var h = '';
    [1, 2].forEach(function (bloco) {
      var list = songs.filter(function (s) { return s.bloco === bloco; });
      if (!list.length) return;
      h += '<h3 class="bloco-head">Bloco ' + bloco + '</h3>';
      list.forEach(function (s) { h += renderSongSection(s); });
    });
    return h;
  }

  function buildOrder(songs) {
    var counts = {};
    songs.forEach(function (s) { counts[s.bloco] = (counts[s.bloco] || 0) + 1; });
    var seen = {};
    return songs.map(function (s) {
      seen[s.bloco] = (seen[s.bloco] || 0) + 1;
      return { id: s.id, bloco: s.bloco, label: 'Bloco ' + s.bloco + ' · ' + seen[s.bloco] + '/' + counts[s.bloco], title: s.title };
    });
  }

  // ---- modelo <-> texto (markdown simples) ----
  var SINGERS = [['nery', 'Nery'], ['mosquitao', 'Mosquitão'], ['mari', 'Mari'], ['gabriel', 'Gabriel']];
  var NAME2KEY = {}; SINGERS.forEach(function (d) { NAME2KEY[d[1].toLowerCase()] = d[0]; });

  function clean(songs) {
    return songs.map(function (s) {
      return {
        id: s.id, num: Number(s.num) || 0, bloco: Number(s.bloco) || 1,
        title: s.title || '', artist: s.artist || '',
        tom: s.tom || null, levada: s.levada || null,
        singers: (s.singers || []).map(function (g) { return { key: g.key, name: g.name }; }),
        note: (s.note && String(s.note).trim()) ? s.note : null,
        cols2: !!s.cols2, chordsTop: !!s.chordsTop,
        sections: (s.sections || []).map(function (sec) {
          return {
            label: sec.label || '',
            lines: (sec.lines || []).map(function (ln) {
              var o = {};
              if (ln.cue && String(ln.cue).trim() !== '') o.cue = ln.cue;
              if (ln.chords && String(ln.chords).trim() !== '') o.chords = ln.chords;
              return o;
            }).filter(function (ln) { return ln.cue || ln.chords; })
          };
        })
      };
    });
  }

  function parseSingers(val) {
    return val.split(/[,;]/).map(function (x) { return x.trim(); }).filter(Boolean).map(function (name) {
      return { key: NAME2KEY[name.toLowerCase()] || 'outro', name: name };
    });
  }

  function song2text(s) {
    var L = [];
    L.push('# ' + (s.title || ''));
    L.push('artista: ' + (s.artist || ''));
    L.push('tom: ' + (s.tom || ''));
    L.push('levada: ' + (s.levada || ''));
    L.push('canta: ' + (s.singers || []).map(function (g) { return g.name; }).join(', '));
    L.push('bloco: ' + (s.bloco || 1));
    L.push('nº: ' + (s.num || ''));
    var opt = []; if (s.chordsTop) opt.push('cifra-acima'); if (s.cols2) opt.push('2-colunas');
    L.push('opções: ' + opt.join(', '));
    if (s.note) L.push('nota: ' + s.note);
    (s.sections || []).forEach(function (sec) {
      L.push(''); L.push('## ' + (sec.label || ''));
      (sec.lines || []).forEach(function (ln) {
        var ch = (ln.chords || '').replace(/\s+$/, ''), cu = (ln.cue || '').trim();
        if (ch && cu) L.push('[' + ch + '] ' + cu);
        else if (ch) L.push('[' + ch + ']');
        else if (cu) L.push(cu);
      });
    });
    return L.join('\n');
  }

  function text2song(text, base) {
    var s = Object.assign({}, base || {});
    s.singers = []; s.sections = []; s.note = null;
    var lines = String(text).replace(/\r/g, '').split('\n');
    var i = 0, cur = null;
    for (; i < lines.length; i++) {
      var line = lines[i].trim();
      if (/^##(\s|$)/.test(line)) break;
      if (/^#\s/.test(line)) { s.title = line.replace(/^#\s+/, '').trim(); continue; }
      var ci = line.indexOf(':'); if (ci <= 0) continue;
      var key = line.slice(0, ci).trim().toLowerCase(), val = line.slice(ci + 1).trim();
      if (key === 'título' || key === 'titulo') s.title = val;
      else if (key === 'artista') s.artist = val;
      else if (key === 'tom') s.tom = val || null;
      else if (key === 'levada') s.levada = val || null;
      else if (key === 'bloco') s.bloco = Number(val) || s.bloco;
      else if (key === 'nº' || key === 'n°' || key === 'no' || key === 'num' || key === 'numero' || key === 'número') s.num = Number(val) || s.num;
      else if (key === 'canta' || key === 'cantam' || key === 'quem canta') s.singers = parseSingers(val);
      else if (key === 'opções' || key === 'opcoes') { s.chordsTop = /cifra[\s-]?acima/i.test(val); s.cols2 = /colunas/i.test(val); }
      else if (key === 'nota') s.note = val || null;
    }
    for (; i < lines.length; i++) {
      var ln = lines[i].trim();
      if (/^##(\s|$)/.test(ln)) { cur = { label: ln.replace(/^##\s*/, '').trim(), lines: [] }; s.sections.push(cur); continue; }
      if (ln === '') continue;
      if (!cur) { cur = { label: '', lines: [] }; s.sections.push(cur); }
      var mb = ln.match(/^\[(.*?)\]\s*(.*)$/);
      if (mb) { var o = {}; var ch = mb[1].replace(/\s+$/, ''), cu = mb[2].trim(); if (ch.trim()) o.chords = ch; if (cu) o.cue = cu; cur.lines.push(o); }
      else cur.lines.push({ cue: ln });
    }
    return clean([s])[0];
  }

  g.SB = {
    esc: esc,
    renderSongSection: renderSongSection,
    renderIndexBlocks: renderIndexBlocks,
    renderSongsArea: renderSongsArea,
    buildOrder: buildOrder,
    clean: clean,
    SINGERS: SINGERS,
    song2text: song2text,
    text2song: text2song
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
