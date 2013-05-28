FAQ = {

switchTab: function(name, evt) {
  if (evt.button) return true;
  var oldTab = false;
  each(geByClass('active_link', ge('faq_tabs')), function(i, v) {
    if (hasClass(v, 'active_link')) {
      oldTab = v;
      removeClass(v, 'active_link');
    }
  });
  addClass(ge(name + '_tab'), 'active_link');
  if (name == 'new') {
    hide('extra_tab', 'show_tab', 'edit_tab', 'new_link');
    show('new_tab');
    var newLoc = extend(nav.objLoc, {act: 'new'});
    if (cur.langsDD) {
      extend(newLoc, {lang: cur.langsDD.val()});
    }
    return nav.go(newLoc, evt, {onFail: function(text) {
      hide('new_tab');
      show('new_link');
      removeClass(ge(name + '_tab'), 'active_link');
      if (oldTab) {
        addClass(oldTab, 'active_link');
      }
      setTimeout(showFastBox(getLang('global_error'), text).hide, 2000);
      return true;
    }});
  } else if (name == 'edit') {
    show('edit_tab', 'new_link');
    hide('new_tab', 'show_tab', 'extra_tab');
  } else if (name == 'extra') {
    show('extra_tab', 'new_link');
    hide('new_tab', 'show_tab', 'edit_tab');
  } else {
    hide('extra_tab', 'new_tab', 'edit_tab');
    show('new_link');
    var newLoc = extend({0: nav.objLoc[0], lang: nav.objLoc.lang}, {act: name});
    if (cur.section == 'edit' && name == 'all' && cur.langsDD) {
      extend(newLoc, {lang: cur.langsDD.val()});
    }
    return nav.go(newLoc, evt);
  }
},

switchSubTab: function(el, link, evt) {
  if (checkEvent(evt) || hasClass(el, 'active')) return false;
  each(geByClass('faq_subtab1', ge('faq_subtabs')), function(i, v) {
    removeClass(v, 'active');
  });
  addClass(el, 'active');
  return nav.go(link, evt);
},

showMsg: function(text) {
  var msg = ge('faq_msg');
  if (!msg) {
    var parent;
    switch (cur.section) {
      case 'all':
        parent = cur.tlmd ? ge('tickets_faq_list') : ge('faq_list');
        break;
      case 'new':
        parent = ge('faq_msg_p');
        show('faq_msg_p');
        break;
    }
    msg = parent.insertBefore(ce('div', {id: 'faq_msg', className: 'msg'}), parent.firstChild);
  }
  re('faq_error');
  msg.innerHTML = text;
  msg.style.backgroundColor = '#F4EBBD';
  animate(msg, {backgroundColor: '#F9F6E7'}, 2000);
  return true;
},

showError: function(error) {
  var err = ge('faq_error');
  if (!err) {
    var parent;
    switch (cur.section) {
      case 'all':
        parent = ge('faq_list');
        break;
      case 'new':
        parent = ge('faq_msg_p');
        show('faq_msg_p');
        break;
    }
    err = parent.insertBefore(ce('div', {id: 'faq_error', className: 'error'}), parent.firstChild);
  }
  re('faq_msg');
  hide('faq_progress');
  err.innerHTML = error;
  err.style.backgroundColor = '#FACEBB';
  animate(err, {backgroundColor: '#FFEFE8'}, 2000);
  scrollToTop(200);
  return true;
},

handleTagsPos: function() {
  if (!ge('faq_tags_td')) return false;
  var st = scrollGetY(), wh = window.lastWindowHeight || 0, pos = 0,
      filt = ge('faq_tags_td'), filtPos = getXY(filt)[1], filtY = getSize(filt)[1],
      sf = ge('faq_tags'), sfPos = getXY(sf)[1], sfY = getSize(sf)[1],
      bottomPad = Math.max(0, st + wh - filtY - filtPos),
      tooBig = (filtY - sfY < 20),
      lastPos = cur.filterLastPos || 0, lastSt = cur.lastSt || 0;
  if  (st > filtPos && !tooBig) {
    addClass(sf, 'fixed');
    pos = (wh > sfY) ? Math.min(0, wh - sfY - bottomPad) : Math.max(Math.min(0, lastPos + lastSt - st), wh - sfY - bottomPad);
  } else {
    removeClass(sf, 'fixed');
    pos = 0;
  }
  cur.filterLastPos = pos;
  cur.lastSt = st;
  setStyle(sf, {top: pos + 'px'});
},

selectTag: function(tag, event) {
  cur.tagsDD.addTag('#' + tag);
  scrollToTop();
},

toggleAllRows: function(el) {
  cur.faqRowsOpened = !cur.faqRowsOpened;
  each(geByClass('faq_row', ge('tickets_faq_list')), setTimeout.pbind(function(i, el) {
    var id = el.id.substr(7);
    if (id) {
      toggleClass(geByClass1('faq_inner_row', el), 'detailed', cur.faqRowsOpened);
    }
  }, 0));
  toggleClass(el, 'shown');
},

checkTextLength: function(el, maxLen, warn) {
  var v = trim(el.value).replace(/\n\n\n+/g, '\n\n');
  if (el.lastLen === v.length) return;

  var realLen = el.lastLen = v.length;
  var brCount = realLen - v.replace(/\n/g, '').length;

  warn = ge(warn);
  if (realLen > maxLen - 100 || brCount > 10) {
    show(warn);
    if (realLen > maxLen) {
      warn.innerHTML = getLang('global_recommended_exceeded', realLen - maxLen);
    } else if (brCount > 10) {
      warn.innerHTML = getLang('global_recommended_lines', brCount - 10);
    } else {
      warn.innerHTML = getLang('text_N_symbols_remain', maxLen - realLen);
    }
  } else {
    hide(warn);
  }
},

saveFAQ: function(hash) {
  var title = trim(val('faq_title')),
      text = trim(val('faq_text')),
      keywords = trim(val('faq_keywords')),
      description = trim(val('faq_description'));
  if (!title) {
    return notaBene('faq_title');
    return;
  }
  var imgs = [];
  if (cur.screens) {
    for (var i in cur.screens) {
      imgs.push(cur.screens[i][0]);
    }
  }
  if (!text && !imgs.length) {
    notaBene('faq_text');
    return;
  }
  var language = cur.langsDD && cur.langsDD.val() || 0;
  ajax.post(nav.objLoc[0], {act: 'save', title: title, text: text, keywords: keywords, description: description, hash: hash, imgs: imgs, faq_id: cur.id, fixed: cur.fixFAQ.val(), urgent: cur.urgentFAQ.val(), server: trim(val('faq_server')), id_mask: trim(val('faq_id_mask')), language: language, parent_id: (language ? cur.parentId : 0)}, {
    onFail: FAQ.showError,
    showProgress: lockButton.pbind(ge('faq_send')),
    hideProgress: unlockButton.pbind(ge('faq_send'))
  });
},

// screenshot attachment

addScreen: function(forEdit) {
  showFastBox({title: getLang('support_adding_screen'), width: 440, bodyStyle: 'padding: 0px'}, '\
<div class="fis_box">\
  <div class="info_msg fis_about">' + getLang('support_screen_you_can') + '</div>\
  <div id="fis_add_data"></div>\
  <div class="fis_warn_text">' + getLang('support_screen_warn') + '</div>\
  <div id="fis_dropbox" class="dropbox">\
    <div class="dropbox_wrap">\
      <div class="dropbox_area">' + getLang('drop_files_here') + '</div>\
    </div>\
  </div>\
</div>\
  ');
  stManager.add('upload.js', FAQ.initUpload.pbind(forEdit));
},
attachCount: function(forEdit) {
  var previewEl = ge('fis_preview' + (forEdit ? '_edit' : '')),
      progressNode = ge('fis_prg_preview' + (forEdit ? '_edit' : ''));
  return (previewEl.childNodes.length + progressNode.childNodes.length);
},
unchoose: function(ind, forEdit) {
  re('fis_preview' + ind);
  if (forEdit) {
    delete(cur.screensEdit[ind]);
  } else {
    delete(cur.screens[ind]);
  }
  toggle('fis_add_lnk' + (forEdit ? '_edit' : ''), FAQ.attachCount(forEdit) < 5);
},
choose: function(ind, forEdit, media, data) {
  var preview = '',
      previewEl = ge('fis_preview' + (forEdit ? '_edit' : '')),
      prgNode = ge('fis_prg_preview' + (forEdit ? '_edit' : ''));

  if (!isObject(data)) {
    data = {
      thumb_m: data[0] || '',
      thumb_s: data[1] || '',
      list: data[2] || '',
      view_opts: data[3] || '',
      upload_ind: data.upload_ind || undefined
    };
  }

  vkImage().src = data.thumb_s;
  preview = '<div onclick="return showPhoto(\'' + media + '\', \'' + data.list + '\', ' + data.view_opts.replace(/"/g, '&quot;') + ');" class="fl_l fis_preview"><img class="fis_photo" src="' + data.thumb_s + '" /></div>';
  var mediaEl = ce('div', {innerHTML: '<div id="fis_preview' + ind + '" class="fis_preview_wrap">' + preview + '<div class="fis_x fl_l" ' + (browser.msie ? 'title' : 'tooltip') + '="' + getLang('dont_attach') + '" onmouseover="if (browser.msie) return; showTooltip(this, {text: this.getAttribute(\'tooltip\'), shift: [6, 3, 3]})" onclick="FAQ.unchoose(\'' + ind + '\'' + (forEdit ? ', 1' : '') + ')"></div></div>'}).firstChild;

  addClass(mediaEl, 'fl_l');
  re('upload' + ind + '_progress_wrap');
  previewEl.appendChild(mediaEl);

  if (forEdit) {
    cur.screensEdit[ind] = [media, mediaEl];
  } else {
    cur.screens[ind] = [media, mediaEl];
  }
  if (!cur.fileApiUploadStarted) {
    boxQueue.hideLast();
  }
  toggle('fis_add_lnk' + (forEdit ? '_edit' : ''), FAQ.attachCount(forEdit) < 5);
},
chooseUploaded: function(info, params) {
  var i = info.ind !== undefined ? info.ind : info,
      fileName = info.fileName ? info.fileName : info,
      ind = info.fileName ? i + '_' + info.fileName : info;
  if (ge('upload' + ind + '_progress_wrap')) {
    var x = geByClass1('fis_prg_x', ge('upload' + ind + '_progress_wrap'));
    if (x) hide(x);
  }
  ajax.post('al_photos.php', extend({act: 'choose_uploaded_support'}, params), {
    onDone: FAQ.choose.pbind(ind, Upload.options[i].forEdit),
    onFail: FAQ.chooseFail.pbind(info),
    progress: (Upload.types[i] == 'form' && curBox()) ? curBox().progress : null
  });
},
chooseFail: function(info, code) {
  var i = info.ind !== undefined ? info.ind : info, fileName = info.fileName ? info.fileName : info;
  var forEdit = Upload.options[i].forEdit;
  if (Upload.types[i] == 'fileApi') {
    var ind = info.fileName ? i + '_' + info.fileName : info;
    re('upload' + ind + '_progress_wrap');
    FAQ.unchoose(ind, forEdit);
  }
  if (curBox()) hide(curBox().progress);
  topError('Upload failed', {dt: -1, type: 102, url: (ge('file_uploader_form' + i) || {}).action});
  Upload.embed(i);
  toggle('fis_add_lnk' + (forEdit ? '_edit' : ''), FAQ.attachCount(forEdit) < 5);
},
showScreenProgress: function(i, data) {
  var forEdit = Upload.options[i].forEdit,
      prgNode = ge('fis_prg_preview' + (forEdit ? '_edit' : '')),
      percent = intval(data.loaded / data.total * 100),
      fileName = data.fileName || data.name || '',
      ind = fileName ? i + '_' + fileName : i,
      label = fileName ? (fileName.length > 33 ? fileName.substr(0, 30) + '...' : fileName) : '';

  if (!prgNode) return;

  if (!ge('upload' + ind + '_progress_wrap')) {
    var progress = '\
<div class="fis_progress_wrap">\
  <div id="upload' + ind + '_progress" class="fis_progress" style="width: ' + percent + '%;"></div>\
</div></div>';
    var progressEl = ce('div', {id: 'upload' + ind + '_progress_wrap', innerHTML: '<div class="fl_l">' + progress + '</div>' + (label ? '<div class="fis_label fl_l">' + label + '</div>' : '') + '<div class="fis_prg_x fl_l" onmouseover="animate(this, {opacity: 1}, 200); showTooltip(this, {text: \'' + getLang('dont_attach') + '\', shift: [6, 3, 3]})" onmouseout="animate(this, {opacity: 0.6}, 200);" onclick="Upload.terminateUpload(' + i + ', \'' + (fileName || i) + '\');"></div>', className: 'clear_fix'}, {marginTop: '6px'});
    prgNode.appendChild(progressEl);
    show(prgNode);
    toggle('fis_add_lnk' + (forEdit ? '_edit' : ''), FAQ.attachCount(forEdit) < 5);
    if (!percent) {
      hide('upload' + ind + '_progress');
    }
  } else {
    setStyle(ge('upload' + ind + '_progress'), {width: percent + '%'});
    show('upload' + ind + '_progress');
  }
  return false;
},

initUpload: function(forEdit) {
  if (!ge('fis_add_data')) return;

  if (!cur.screens) cur.screens = {};
  var opts = cur.uploadData.options;
  Upload.init('fis_add_data', cur.uploadData.url, cur.uploadData.vars, {
    file_name: 'photo',

    file_size_limit: 1024*1024*5, // 5Mb
    file_types_description: 'Image files (*.jpg, *.png, *.gif)',
    file_types: '*.jpg;*.JPG;*.png;*.PNG;*.gif;*.GIF',
    accept: 'image/jpeg,image/png,image/gif',
    file_match: '\.(gif|jpg|png)$',
    lang: opts.lang,

    onUploadStart: function(info, res) {
      var i = info.ind !== undefined ? info.ind : info, options = Upload.options[i];
      if (Upload.types[i] == 'form') {
        if (curBox()) show(curBox().progress);
        geByClass1('file', ge('fis_add_data')).disabled = true;
      }
      if (Upload.types[i] == 'fileApi') {
        if (cur.notStarted) {
          curBox().hide();
          delete cur.notStarted;
        }
        if (options.multi_progress) this.onUploadProgress(info, 0, 0);
      }
    },
    onUploadComplete: function(info, res) {
      var params, i = info.ind !== undefined ? info.ind : info, fileName = info.fileName ? info.fileName : info;
      try {
        params = eval('(' + res + ')');
      } catch(e) {
        params = q2ajx(res);
      }
      if (!params.photos) {
        Upload.onUploadError(info);
        return;
      }
      var options = Upload.options[i];
      FAQ.chooseUploaded(info, params);
    },
    onUploadProgress: function(info, bytesLoaded, bytesTotal) {
      var i = info.ind !== undefined ? info.ind : info;
      if (Upload.types[i] == 'fileApi') {
        var data = {loaded: bytesLoaded, total: bytesTotal};
        if (info.fileName) data.fileName = info.fileName;
        FAQ.showScreenProgress(i, data);
      }
    },
    onUploadError: FAQ.chooseFail,

    noFlash: 1,
    multiple: 1,
    multi_progress: 1,
    max_files: 5 - FAQ.attachCount(forEdit),
    clear: 1,
    type: 'photo',
    max_attempts: 3,
    server: opts.server,
    error: opts.default_error,
    error_hash: opts.error_hash,
    dropbox: 'fis_dropbox',
    forEdit: forEdit
  });
},

deleteFAQ: function(faq_id, hash) {
  var box = showFastBox({title: cur.lang['delete_title'], width: 430}, cur.lang['delete_confirm'], cur.lang['delete'], function() {
    ajax.post(nav.objLoc[0], {act: 'delete', faq_id: faq_id, hash: hash}, {
      progress: box.progress,
      onFail: function(text) {
        box.hide();
        FAQ.showError(text);
        return true;
      }
    });
  }, getLang('global_cancel'));
  return false;
},

toggleRow: function(id, el, evt) {
  if (!evt.target) {
    evt.target = evt.srcElement || document;
  }
  if (evt.target.tagName.toLowerCase() == 'a') return true;
  toggle('faq_short_text'+id, !isVisible('faq_short_text'+id));
  toggle('faq_full_text'+id, !isVisible('faq_full_text'+id));
  if (isVisible('faq_full_text'+id)) {
    addClass(el, 'detailed');
    if (cur.tlmd) {
      ajax.post(nav.objLoc[0], {act: 'faq_clicked', faq_id: id, hash: cur.faq_hash}, {cache: 1});
    }
  } else {
    removeClass(el, 'detailed');
  }
  return false;
},

_eof: 1};try{stManager.done('faq.js');}catch(e){}
