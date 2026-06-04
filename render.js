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
    h += '<div class="songartist">' + esc(s.artist || '') + '</div></div></header>';
    var meta = '';
    if (s.tom) meta += '<span class="meta"><b>Tom</b> ' + esc(s.tom) + '</span>';
    if (s.levada) meta += '<span class="meta"><b>Levada</b> ' + esc(s.levada) + '</span>';
    if (s.singers && s.singers.length) meta += '<span class="meta sing">🎤 ' + singersHTML(s.singers) + '</span>';
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

  g.SB = {
    esc: esc,
    renderSongSection: renderSongSection,
    renderIndexBlocks: renderIndexBlocks,
    renderSongsArea: renderSongsArea,
    buildOrder: buildOrder
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
