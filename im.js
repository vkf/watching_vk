var IM = {
  updateCounts: function (cnts) {
    if (!cnts || !cnts.length) {
      return;
    }

    handlePageCount('msg', cnts[0]);

    val('im_important_count', cnts[1] ? cnts[1] : '');
    toggle('im_important_btn', cnts[1] && cur.peer == -1);

    val('im_spam_cnt', cnts[2] ? ' +' + cnts[2] : '');
    toggle('im_spam_link', cnts[3]);
  },
  updateUnreadMsgs: function () {
    cur.unreadMsgs = 0;
    var peer, unread;
    for (peer in cur.tabs) {
      unread = intval(cur.tabs[peer].unread);
      if (unread > 0 && cur.peer != peer) {
        val('im_unread' + peer, '&nbsp;<span class="im_unread">+' + unread + '</span>');
      } else {
        val('im_unread' + peer, '');
      }
      cur.unreadMsgs += unread;
    }
    val('im_unread_count', cur.unreadMsgs ? '+' + cur.unreadMsgs : '');
    toggleClass(ge('tab_conversation'), 'count', IM.r() && cur.unreadMsgs);
  },
  peerToId: function(peer) {
    if (peer > 2e9) {
      return 'c' + (peer - 2e9);
    } else if (!IM.r(peer) && peer < -2e9) {
      return 'e' + (-peer - 2e9);
    } else {
      return peer;
    }
  },
  idToPeer: function(peer) {
    var pref = (peer + '').charAt(0);
    if (pref == 'c') {
      return 2e9 + intval(peer.substr(1));
    } else if (pref == 'e') {
      return -2e9 - intval(peer.substr(1));
    } else {
      return intval(peer);
    }
  },
  fullQ: function() {
    return (cur.qPeer ? ('in:' + IM.peerToId(cur.qPeer) + ' ') : '') + (cur.qDay ? ('day:' + cur.qDay + ' ') : '') + cur.searchQ;
  },
  setFullQ: function(q) {
    q = q || '';
    var qpeer = q.match(/^in\:([ce]?\d+)\s+/);
    if (qpeer) {
      cur.qPeer = IM.idToPeer(qpeer[1]);
      val('im_filter', cur.lastSearchQ = cur.searchQ = q = q.replace(/^in\:[ce]?\d+\s+/, ''));
    } else {
      cur.qPeer = false;
    }
    var qday = q.match(/^day\:(\d{8})\s*/);
    if (qday) {
      cur.qDay = qday[1];
      val('im_filter', cur.lastSearchQ = cur.searchQ = q = q.replace(/^day\:\d{8}\s*/, ''));
    } else {
      cur.qDay = false;
    }
  },
  dayFromVal: function(v) {
    var n = v.split('.');
    return (n[0] < 10 ? '0' : '') + n[0] + (n[1] < 10 ? '0' : '') + n[1] + n[2];
  },
  updateLoc: function (ret) {
    var peers = [], newLoc = {'0': 'im'};
    if (cur.peer == -2) {
      newLoc.q = IM.fullQ();
    } else {
      if (cur.peer != -1) {
        newLoc.sel = IM.peerToId(cur.peer);
      }
    }
    var curLoc = nav.strLoc;
    for (var i in cur.tabs) {
      if (cur.peer == i) continue;
      peers.push(IM.peerToId(i));
    }
    if (peers.length) {
      newLoc.peers = peers.join('_');
    }
    if (ret) {
      return nav.toStr(newLoc);
    }

    if (newLoc == curLoc) return;
    clearTimeout(cur.setLocTO);
    cur.setLocTO = setTimeout(function () {
      if (nav.strLoc == curLoc) {
        nav.setLoc(newLoc);
      }
    }, 500);
  },
  scroll: function(toTop, toMsg, hl) {
    if (!cur.fixedScroll && !IM.r()) {
      cur.imEl.rows.scrollTop = toTop ? 0 : cur.imEl.rows.scrollHeight;
    } else {
      var st = 0, to = toMsg ? ge('mess' + toMsg) : false;
      if (cur.tabs[cur.peer] && cur.tabs[cur.peer].q_offset && !to) return;
      if (!toTop) {
        var winH = Math.max(intval(window.innerHeight), intval(document.documentElement.clientHeight)),
            contOH = cur.imEl.cont.offsetHeight,
            headH = cur.imEl.head.clientHeight,
            imNavH = cur.imEl.nav.offsetHeight,
            visH, toH = to ? to.offsetHeight : 0, toY = getXY(to)[1];
        if (toH > 0) {
          visH = winH - headH - imNavH - cur.imEl.controls.offsetHeight - 34; // to end bar
          if (toH > visH + 20 || visH < 20) {
            st = toY - headH - imNavH - 10;
          } else {
            st = toY - Math.floor((visH - toH) / 2) - headH - imNavH;
          }
          if (hl === true) {
            animate(to, {backgroundColor: '#EDF1F5'}, 200, function() {
              to.hltt = setTimeout(function() {
                animate(to, {backgroundColor: '#FFF'}, 1000, setStyle.pbind(to, {backgroundColor: ''}));
              }, 1000);
            });
          }
        } else {
          st = contOH - winH + headH + imNavH;
        }
      }
      scrollToY(st, 0);
    }
    IM.updateScroll(true);
  },

  scrollAppended: function (appendedH) {
    if (cur.tabs[cur.peer] && cur.tabs[cur.peer].q_offset) return;
    if (!cur.fixedScroll) {
      return IM.scrollOn();
    }
    appendedH = 0;
    var winH = Math.max(intval(window.innerHeight), intval(document.documentElement.clientHeight)),
        contentST = scrollGetY(true),
        contentSH = Math.max(intval(bodyNode.scrollHeight), intval(pageNode.scrollHeight), intval(htmlNode.scrollHeight)),
        atBottom = contentST > contentSH - winH - (appendedH || 0) - 200;
    IM.updateScroll(!atBottom);
  },

  scrollOn: function(toTop, toMsg) {
    if (cur.tabs[cur.peer] && cur.tabs[cur.peer].q_offset && (!toMsg || !ge('mess' + toMsg))) return;

    clearTimeout(cur.scrollTO);
    IM.scroll(toTop, toMsg, true);
    cur.scrollTO = setTimeout(IM.scroll.bind(IM).pbind(toTop, toMsg), 100);
  },

  error: function(error, peer) {
    if (IM.r()) return;
    var errorEl = ge('im_error' + (peer || cur.peer));
    if (!errorEl) return;
    errorEl.innerHTML = error;
    show(errorEl);
    IM.scrollOn();
  },

  mkdate: function(raw) {
    var result = new Date(raw * 1000), now_time = new Date(), pad = function(num) {
      return ((num + '').length < 2) ? ('0' + num) : num;
    }
    if (result.getDay() == now_time.getDay()) {
      return pad(result.getHours()) + ':' + pad(result.getMinutes()) + ':' + pad(result.getSeconds());
      // return trim(result.toLocaleTimeString().match(/([\d.:amp ]+)/)[1]);
    }
    return pad(result.getDate()) + '.' + pad(result.getMonth()+1) + '.' + (result.getFullYear() + '').substr(2);
  },

  mknotonline: function(sex, name) {
    if (!sex || sex == 2) {
      return lang.mail_im_not_online[1].replace('{user}', name).replace(/\..+$/, '.');
    } else {
      return lang.mail_im_not_online[2].replace('{user}', name).replace(/\..+$/, '.')
    }
  },

  updateOnline: function(online, sex) {
    var onl = '';
    if (online) {
      onl = langSex(sex, window.global_online_sm);
      if (online != 1) {
        onl += '<b class="mob_onl im_status_mob_onl" onmouseover="mobileOnlineTip(this, {mid: ' + cur.peer + '})" onclick="mobilePromo()"></b>'
      }
    }
    val('im_status_holder', onl);
    if (online) {
      IM.hideLastAct(cur.peer);
    }
  },

  getTable: function(peer) {
    return ge('im_log' + peer);
  },
  goodTitle: function(title, peer) {
    return peer < 2e9 && title && !title.match(/^\s*(Re(\(\d*\))?\:)?\s*\.\.\.\s*$/);
  },

  addMsg: function(peer_id, after_id, msg_id, status, out, title, message, date, kludges, delayed) {
    re('mess' + msg_id);
    var full_date = date ? IM.mkdate(date) : '',
        peer_data = cur.tabs[peer_id].data,
        actual_peer = kludges.from || false,
        susp = (status == 4 && !out);

    if (cur.tabs[peer_id] && cur.tabs[peer_id].q_offset) {
      var last = intval(domLC(geByTag1('tbody', ge('im_log' + peer_id))).id.replace(/^mess/, ''));
      if (last && last < msg_id) {
        ++cur.tabs[peer_id].q_offset;
        if (!out && status > 1) {
          if (!cur.tabs[peer_id].q_new_cnt) {
            cur.tabs[peer_id].q_new_cnt = 1;
          } else {
            ++cur.tabs[peer_id].q_new_cnt;
          }
          cur.tabs[peer_id].q_new[msg_id] = 1;
        }
        IM.updateMoreNew(peer_id);
      }
      return;
    }

    if (peer_id > 2e9 && actual_peer < 2e9 && actual_peer) {
      if (!peer_data.members[actual_peer]) {
        if (!delayed) {
          cur.tabs[peer_id].delayed.push([peer_id, after_id, msg_id, status, out, title, message, date, kludges, true]);
          IM.updateChat(peer_id);
        }
        return;
      }
    }
    var i = 1, media_html = '';
    while (kludges['attach' + i + '_type']) {
      media_html += '<div class="progress im_media_progress im_' + kludges.attach1_type + '_filler" style="display: block;"></div>';
      i++;
    }
    if (kludges.emoji) {
      message = IM.emojiToHTML(message, kludges.emoji);
      //message = message.replace()
    }
    message = '<div class="im_msg_text">'+message+'</div>';
    if (kludges.geo) {
      media_html += '<div class="progress im_media_progress im_map_filler" style="display: block;"></div>';
    }
    if (kludges.fwd) {
      media_html += '<div class="progress im_media_progress im_forward_filler" style="display: block;"></div>';
    }
    if (media_html) {
      message += '<div id="im_msg_media' + msg_id + '" class="wall_module">' + media_html + '</div>';
    }
    if (msg_id > 0 && !kludges._no_media_load && (media_html || kludges.source_act)) {
      IM.loadMedia(msg_id, peer_id);
    }

    if (IM.goodTitle(title, peer_id)) {
      message = '<div class="im_subj">' + title + '</div>' + message;
    }

    message = message.replace(/(^|[^A-Za-z0-9�-��-���\-\_])(https?:\/\/)?((?:[A-Za-z\$0-9�-��-���](?:[A-Za-z\$0-9\-\_�-��-���]*[A-Za-z\$0-9�-��-���])?\.){1,5}[A-Za-z\$��\-\d]{2,22}(?::\d{2,5})?)((?:\/(?:(?:\&amp;|\&#33;|,[_%]|[A-Za-z0-9�-��-���\-\_#%?+\/\$.~=;:]+|\[[A-Za-z0-9�-��-���\-\_#%?+\/\$.,~=;:]*\]|\([A-Za-z0-9�-��-���\-\_#%?+\/\$.,~=;:]*\))*(?:,[_%]|[A-Za-z0-9�-��-���\-\_#%?+\/\$.~=;:]*[A-Za-z0-9�-��-���\_#%?+\/\$~=]|\[[A-Za-z0-9�-��-���\-\_#%?+\/\$.,~=;:]*\]|\([A-Za-z0-9�-��-���\-\_#%?+\/\$.,~=;:]*\)))?)?)/ig, function () { // copied to notifier.js:3401
      var matches = Array.prototype.slice.apply(arguments),
          prefix = matches[1] || '',
          protocol = matches[2] || 'http://',
          domain = matches[3] || '',
          url = domain + (matches[4] || ''),
          full = (matches[2] || '') + matches[3] + matches[4];

      if (domain.indexOf('.') == -1 || domain.indexOf('..') != -1) return matches[0];
      var topDomain = domain.split('.').pop();
      if (topDomain.length > 6 || indexOf('info,name,aero,arpa,coop,museum,mobi,travel,xxx,asia,biz,com,net,org,gov,mil,edu,int,tel,ac,ad,ae,af,ag,ai,al,am,an,ao,aq,ar,as,at,au,aw,ax,az,ba,bb,bd,be,bf,bg,bh,bi,bj,bm,bn,bo,br,bs,bt,bv,bw,by,bz,ca,cc,cd,cf,cg,ch,ci,ck,cl,cm,cn,co,cr,cu,cv,cx,cy,cz,de,dj,dk,dm,do,dz,ec,ee,eg,eh,er,es,et,eu,fi,fj,fk,fm,fo,fr,ga,gd,ge,gf,gg,gh,gi,gl,gm,gn,gp,gq,gr,gs,gt,gu,gw,gy,hk,hm,hn,hr,ht,hu,id,ie,il,im,in,io,iq,ir,is,it,je,jm,jo,jp,ke,kg,kh,ki,km,kn,kp,kr,kw,ky,kz,la,lb,lc,li,lk,lr,ls,lt,lu,lv,ly,ma,mc,md,me,mg,mh,mk,ml,mm,mn,mo,mp,mq,mr,ms,mt,mu,mv,mw,mx,my,mz,na,nc,ne,nf,ng,ni,nl,no,np,nr,nu,nz,om,pa,pe,pf,pg,ph,pk,pl,pm,pn,pr,ps,pt,pw,py,qa,re,ro,ru,rs,rw,sa,sb,sc,sd,se,sg,sh,si,sj,sk,sl,sm,sn,so,sr,ss,st,su,sv,sx,sy,sz,tc,td,tf,tg,th,tj,tk,tl,tm,tn,to,tp,tr,tt,tv,tw,tz,ua,ug,uk,um,us,uy,uz,va,vc,ve,vg,vi,vn,vu,wf,ws,ye,yt,yu,za,zm,zw,��,cat,pro,local'.split(','), topDomain) == -1) return matches[0];

      if (matches[0].indexOf('@') != -1) {
        return matches[0];
      }
      try {
        full = decodeURIComponent(full);
      } catch (e){}

      if (full.length > 55) {
        full = full.substr(0, 53) + '..';
      }
      full = clean(full).replace(/&amp;/g, '&');

      if (!susp && domain.match(/^([a-zA-Z0-9\.\_\-]+\.)?(vkontakte\.ru|vk\.com|vkadre\.ru|vshtate\.ru|userapi\.com|vk\.me)$/)) {
        url = replaceEntities(url).replace(/([^a-zA-Z0-9#%;_\-.\/?&=\[\]])/g, encodeURIComponent);
        var tryUrl = url, hashPos = url.indexOf('#/'), mtch, oncl = '';
        if (hashPos >= 0) {
          tryUrl = url.substr(hashPos + 1);
        } else {
          hashPos = url.indexOf('#!');
          if (hashPos >= 0) {
            tryUrl = '/' + url.substr(hashPos + 2).replace(/^\//, '');
          }
        }
        mtch = tryUrl.match(/^(?:https?:\/\/)?(?:vk\.com|vkontakte\.ru)?\/([a-zA-Z0-9\._]+)\??$/);
        if (mtch) {
          if (mtch[1].length < 32) {
            oncl = ' mention_id="' + mtch[1] + '" onclick="return mentionClick(this, event)" onmouseover="mentionOver(this)"';
          }
        }
        return prefix + '<a href="'+ (protocol + url).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '" target="_blank"' + oncl + '>' + full + '</a>';
      }
      return prefix + '<a href="away.php?utf=1&to=' + encodeURIComponent(protocol + replaceEntities(url)) + '" target="_blank" onclick="return goAway(\''+ clean(protocol + url) + '\', {}, event);">' + full + '</a>';
    });

    message = message.replace(/([a-zA-Z\-_\.0-9]+@[a-zA-Z\-_0-9]+\.[a-zA-Z\-_\.0-9]+[a-zA-Z\-_0-9]+)/g, function(url) {
      return '<a href="/write?email='+url+'" target="_blank">'+url+'</a>'
    });

    if (susp) {
      message = rs(cur.susp_msg, {msg_id: msg_id, message: message});
    }

    var hist = IM.getTable(peer_id), maxIndex = hist.rows.length, index;
    if (after_id == -1) {
      index = maxIndex;
    } else {
      if (after_id) {
        var prev_row = ge('mess' + after_id);
        index = Math.min(maxIndex, prev_row.rowIndex + 1);
      } else {
        index = 0;
      }
    }

    var img_class = 'img',
        fromId = actual_peer || (out ? cur.id : cur.peer);
    var classNames = [out ? 'im_out' : 'im_in'];
    if (status > 1) classNames.push('im_new_msg');

    var msgInfo = IM.getMsgInfo(msg_id, kludges);
    if (index && hist.rows[index - 1].getAttribute('data-from') == fromId && (date - intval(hist.rows[index - 1].getAttribute('data-date')) < 300) && !msgInfo) {
      classNames.push('im_add_row');
    }
    if (index < hist.rows.length && hist.rows[index].getAttribute('data-from') == fromId && (intval(hist.rows[index].getAttribute('data-date')) - date < 300)) {
      removeClass(hist.rows[index], 'im_add_row');
    }

    var row = hist.insertRow(index), user, author_html;

    row.setAttribute('data-date', date);
    row.setAttribute('data-from', fromId);
    row.id = 'mess' + msg_id;
    row.className = classNames.join(' ');

    if (peer_data && actual_peer && (user = peer_data.members[actual_peer])) {
      author_html = '<div class="im_log_author_chat_thumb"><a href="' + user.link + '"><img src="' + user.photo + '" class="im_log_author_chat_thumb" width="32" height="32"/></a></div>';
      message = '<div class="im_log_author_chat_name"><a href="' + user.link + '" class="mem_link">'+ user.name + '</a>' + msgInfo + '</div>' + message;
      user = [user.link, user.photo, user.name];
    } else {
      if (out) {
        user = ['/id' + cur.id, cur.photo, cur.name]
      } else {
        if (peer_id < -2e9) {
          if (cur.peer > 2e9) {
            var link = '/im?email='+encodeURIComponent(user.name);
          } else {
            var link = '/im?sel=e'+(-peer_id - 2e9);
          }
        } else {
          var link = '/id' + peer_id;
        }
        user = [link, cur.tabs[peer_id].photo, cur.tabs[peer_id].name];
      }
      author_html = '<div class="im_log_author_chat_thumb"><a href="' + user[0] + '"><img src="' + user[1] + '" class="im_log_author_chat_thumb" width="32" height="32"/></a></div>';
      message = '<div class="im_log_author_chat_name"><a href="' + user[0] + '" class="mem_link">'+ user[2] + '</a>' + msgInfo + '</div>' + message;
    }
    var actions_html = '';
    if (msg_id > 0) {
      actions_html = '<div id="ma'+msg_id+'" class="im_log_check_wrap"><div class="im_log_check" id="mess_check'+msg_id+'"></div></div>';
      addEvent(row, 'mouseover', IM.logMessState.pbind(1, msg_id));
      addEvent(row, 'mouseout', IM.logMessState.pbind(0, msg_id));
      row.onclick = function (e) {if (!IM.checkLogClick(this, e || window.event)) IM.checkLogMsg(msg_id)};
    } else {
      actions_html  = '<div id="ma' + msg_id + '" style="visibility: visible;"><div class="progress" id="mprg' + msg_id + '"></div></div>';
    }

    row.insertCell(0).innerHTML = actions_html;
    row.insertCell(1).innerHTML = author_html;
    row.insertCell(2).innerHTML = '<div class="wrapped">' + message + '</div>';

    var dateLink = msg_id > 0 ? '<a class="im_important_toggler" onclick="return IM.toggleImportant(' + msg_id + ');" onmouseover="IM.showImportantTT(this);"></a><a class="im_date_link" href="/mail?act=show&id=' + msg_id + '">' + full_date + '</a>' : '<span>' + full_date + '</span>';
    row.insertCell(3).innerHTML = dateLink;

    row.insertCell(4).className = 'im_log_rspacer';

    row.cells[0].className = 'im_log_act';
    row.cells[1].className = 'im_log_author';
    row.cells[2].className = 'im_log_body';
    row.cells[3].className = 'im_log_date';

    if (status > 1 && !out) {
      addEvent(row, 'mouseover', IM.onNewMsgOver.pbind(peer_id, msg_id));
    }
    if (index == maxIndex && cur.peer == peer_id) {
      IM.scrollAppended(row.offsetHeight);
    }

    hide('im_none' + peer_id);
    show('im_log' + peer_id);
    if (!out) {
      IM.hideLastAct(peer_id);
    }
  },

  receivePeerData: function(peer_id, data) {
    if (data.hash) {
      data.hash = IM.decodehash(data.hash);
    }
    extend(cur.tabs[peer_id], data);
    if (cur.peer == peer_id) {
      IM.applyPeer();
    }
    el = ge('im_dialog' + peer_id);
    if (el) el = geByClass1('dialogs_photo', el);
    if (el) val(el, cur.tabs[peer_id].data.members_grid_small);
  },
  loadMedia: function (msg_id, peer_id) {
    ajax.post('al_im.php', {act: 'a_get_media', id: msg_id}, {
      onDone: function (content, msgInfo, opts) {
        if (msgInfo) {
          val('im_msg_info' + msg_id, msgInfo);
          val('im_dialogs_msginfo' + msg_id, msgInfo);
        }
        if (opts && opts.peer && ge('mess' + msg_id)) {
          IM.receivePeerData(peer_id, opts.peer);
        }

        var cont = ge('im_msg_media' + msg_id), el;
        if (cont) {
          val(cont, content);
          if (opts) {
            if (opts.gift) {
              var msgObj = ge('mess' + msg_id);
              addClass(msgObj, 'im_gift_msg');
              var textObj = geByClass1('im_msg_text', msgObj);
              textObj.parentNode.appendChild(textObj);
            }
          }
        }
        if (cur.peer == peer_id) {
          IM.scrollAppended(0);
        }
      },
      onFail: function (a) {
        debugLog('load media fail', msg_id, peer_id);
        topError('IM media fail: ' + a + '; ' + peer_id + '_' + msg_id, {dt: -1});
        var cont = ge('im_msg_media' + msg_id);
        hide(cont);
      }
    });
  },
  chatPhotoSaved: function(res) {
    if (curBox()) curBox().hide();

    var peer = (res || {})[1];
    if (!peer) return nav.reload();
    if (cur.pvShown) layers.fullhide(true, true);
    if (cur.module != 'im' || cur.peer != peer) {
      return nav.go('/im?sel=c' + (peer - 2e9));
    }

    IM.updateUnread(res[3]);
    IM.receivePeerData(peer, res[4]);

    var msg_id = res[0];
    if (!msg_id) return;
    if (!ge('mess' + msg_id)) IM.addMsg(peer, -1, msg_id, 2, 1, '', '', res[2], {source_act: res[5] ? 'chat_photo_update' : 'chat_photo_removed', from: cur.id, attach1_type: 'photo', _no_media_load: 1});

    val('im_msg_media' + msg_id, res[5]);
    val('im_msg_info' + msg_id, res[6]);
    val('im_dialogs_msginfo' + msg_id, res[6]);
    IM.scroll();
  },

  setLastAct: function(peerId, str) {
    var lastact = ge('im_lastact' + peerId);
    lastact.innerHTML = str;
    show(lastact);
    hide('im_typing' + peerId);
  },

  hideLastAct: function(peerId) {
    hide('im_lastact' + peerId);
  },

  loadHistory: function(peer_id, more, msgId) {
    if (!cur.tabs[peer_id] || cur.tabs[peer_id].loadingHistory) return false;
    cur.tabs[peer_id].loadingHistory = true;
    if (!more) more = 0;

    var loadingTimeout = setTimeout(function() {
      if (cur.tabs) cur.tabs[peer_id].loadingHistory = false;
    }, 5000), offset = 0, moreEl = 'im_more' + peer_id;

    if (more < 0) {
      offset = cur.tabs[peer_id].q_offset;
      moreEl = 'im_morenew' + peer_id;
    } else if (more) {
      offset = cur.tabs[peer_id].q_offset + cur.tabs[peer_id].msg_count;
    }
    ajax.post('al_im.php', {
      act: 'a_history',
      peer: peer_id,
      msg: msgId,
      offset: offset,
      rev: (more < 0) ? 1 : 0,
      whole: more == 2 ? 1 : 0
    }, {
      showProgress: addClass.pbind(moreEl, 'im_more_loading'),
      hideProgress: removeClass.pbind(moreEl, 'im_more_loading'),
      onDone: function (html, msgs, all_shown, cnts, data) {
        if (!cur.tabs[peer_id]) {
          return;
        }
        var table = ge('im_log' + peer_id);
        if (!table) {
          debugLog('table#im_log' + peer_id + ' not found');
          return;
        }
        if (!more) {
          table = IM.clearHistory(peer_id, table);
        }
        if (msgId) {
          cur.tabs[peer_id].q_offset = data.q_offset;
        }

        var cur_rows = geByTag1('tbody', table),
            new_t = se(html),
            new_rows = geByTag1('tbody', new_t),
            before_row = cur_rows.firstChild, add_row, row_id;

        domPN(table).insertBefore(new_t, (more < 0) ? domNS(table) : table);

        if (more < 0) {
          all_shown = cur.tabs[peer_id].all_shown;
        } else if (all_shown) {
          hide('im_more' + peer_id);
        }
        IM.updateScroll(more < 0, !more);
        if (data && data.lastact) {
          if (!cur.friends || !cur.friends[peer_id + '_'] || !cur.friends[peer_id + '_'][0]) {
            IM.setLastAct(peer_id, data.lastact);
          }
        }
        setTimeout(function () {
          while (add_row = new_rows.firstChild) {
            if (!add_row.id.match(/^mess\d+/)) {
              re(add_row);
              continue;
            }
            row_id = add_row.id;
            add_row.id = '';
            if (ge(row_id)) {
              re(add_row);
              continue;
            }
            add_row.id = row_id;
            if (more < 0) {
              cur_rows.appendChild(add_row);
            } else {
              cur_rows.insertBefore(add_row, before_row);
            }
          }
          re(new_t);
          IM.updatePeer(peer_id, msgs, all_shown, (more < 0) ? -1 : 0);
          delete cur.tabs[peer_id].loadingHistory;
          clearTimeout(loadingTimeout);
          if (cur.focused == peer_id) {
            IM.readLastMsgs();
          }
          if (cur.peer == peer_id) IM.applyPeer();
          IM.updateScroll(more < 0, !more);
          if (!more) IM.scrollOn(false, msgId);
          if (!cur.fixedScroll && !more) IM.scrollOn();
        }, 0);
        IM.updateCounts(cnts);
        if (!cur.fixedScroll && !more) IM.scrollOn();
      },
      onFail: function () {
        cur.tabs[peer_id].loadingHistory = false;
        clearTimeout(loadingTimeout);
      }
    });
    return false;
  },
  deleteHistory: function (peer, hash) {
    hash = hash || cur.tabs[peer].hash;
    var box = false, succ = function () {
      cur.flushing_peer = peer;
      ajax.post('/al_mail.php', {act: 'a_flush_history', hash: hash, id: peer, from: 'im'}, {
        onDone: function (res, text) {
          cur.flushing_peer = false;
          if (cur.tabs[peer]) {
            IM.closeTab(peer);
          }
          re('im_dialog' + peer);
          if (!geByClass1('dialogs_row', ge('im_dialogs'))) {
            show('im_rows_none');
            hide('im_dialogs_summary');
          }
          box && box.hide();
          if (peer < -2e9) {
            delete cur.emails[peer+'_'];
            IM.cacheFriends();
          }
          showDoneBox(text);
        },
        showProgress: box && box.showProgress,
        hideProgress: box && box.hideProgress
      });
    };
    box = showFastBox(getLang('mail_deleteall1'), peer > 2e9 ? getLang('mail_chat_sure_to_delete_all') : getLang('mail_sure_to_delete_all'), getLang('mail_delete'), succ, getLang('mail_close'), box.hide);
  },
  deleteDialog: function (peer, hash) {
    re('im_deleted_dialog' + peer);
    var tab = cur.tabs[peer],
        del = geByClass1('dialogs_del', ge('im_dialog' + peer), 'div');

    if (del && del.tt && del.tt.el) {
      del.tt.destroy();
    }
    if (tab) {
      var foundMine = false;
      each(tab.msgs || [], function (id, msg) {
        if (id && msg && (foundMine = msg[0])) {
          return false;
        }
      });
      if (foundMine) {
        IM.deleteHistory(peer);
        return;
      }
      if (!hash) {
        hash = tab.hash || '';
      }
    }
    ajax.post('al_im.php', {act: 'a_delete_dialog', peer: peer, hash: hash}, {
      onDone: function (result, hash) {
        if (result) {
          var el = ge('im_dialog' + peer),
              newEl = se('<div class="dialogs_row dialogs_deleted_row" id="im_deleted_dialog' + peer + '">' + val(el) + '</div>');
          cur.deletedDialogs[peer] = el;
          el.parentNode.replaceChild(newEl, el);
          val(geByClass1('dialogs_msg_body', newEl, 'div'), result);
        } else {
          IM.deleteHistory(peer, hash);
        }
      }
    });
  },
  spamDialog: function (peer, hash) {
    ajax.post('al_im.php', {act: 'a_spam_dialog', peer: peer, hash: hash}, {
      onDone: function (result) {
        val(geByClass1('dialogs_msg_body', ge('im_deleted_dialog' + peer), 'div'), result);
      }
    });
  },
  restoreDialog: function (peer, hash, spam) {
    ajax.post('al_im.php', {act: 'a_restore_dialog', peer: peer, hash: hash, spam: spam}, {
      onDone: function (result) {
        var el = ge('im_deleted_dialog' + peer);
        el.parentNode.replaceChild(cur.deletedDialogs[peer], el);
        delete cur.deletedDialogs[peer];
      }
    });
  },

  startChatWith: function (peer) {
    IM.activateTab(0, 1);
    cur.multi = true;
    cur.multi_friends = {};
    cur.multi_friends[peer] = 1;
    IM.updateTopNav();
    IM.updateFriends(true);
    !browser.mobile && setTimeout("if (!cur.peer) elfocus('im_filter')", browser.msie ? 100 : 0);
  },

  showMediaHistory: function (peer, mediaType) {
    return showWiki({w: 'history' + IM.peerToId(peer) + '_' + mediaType});
  },

  onUploadDone: function () {
    unlockButton(ge('im_send'));
    if (cur.sendOnUploadDone) {
      delete cur.sendOnUploadDone;
      IM.send();
    }
  },
  extractEmoji: function(txt, peer) {
    var emjs = geByClass('emoji', txt);
    var newRc = {};
    for(var i in emjs) {
      newRc[emjs[i].getAttribute('emoji')] = 1;
    }
    var rcCont = ge('im_rcemoji');
    var rchtml = '';
    var ml = 0;
    for (var code in newRc) {
      var codeEl = ge('im_rc_em_'+code);
      if (codeEl) {
        if (peer > 2e9 && !codeEl.nextSibling) {
          re(codeEl);
        } else {
          continue;
        }
      }
      if (ge('im_rc_em_'+code)) continue;
      rchtml += '<a id="im_rc_em_'+code+'" class="im_rc_emojibtn" onmousedown="IM.addEmoji(\''+code+'\', this); return cancelEvent(event);">'+IM.getEmojiHTML(code, false, true)+'</a>';
      ml -= 22;
    }
    rcCont.insertBefore(cf(rchtml), rcCont.firstChild);
    setStyle(rcCont, {marginLeft: ml});
    animate(rcCont, {marginLeft: 0}, {duration: 150, transition: Fx.Transitions.easeOutCubic, onComplete: function() {
      var emjs = geByClass('im_rc_emojibtn', rcCont).slice(7);
      for(var i in emjs) {
        re(emjs[i]);
      }
    }});
  },
  getMedias: function(peer) {
    if (!peer) peer = cur.peer;
    if (!peer || !cur.imPeerMedias || !cur.imPeerMedias[peer]) return [];

    var res = [], already = {};
    each(cur.imSortedMedias[peer] || [], function(k, v) {
      if (!cur.imPeerMedias[peer][v]) return;
      res.push(cur.imPeerMedias[peer][v]);
      already[v] = true;
    });
    each(cur.imPeerMedias[peer], function(k, v) {
      if (!v || !isArray(v) || already[k]) return;
      res.push(v);
    });
    return res;
  },
  saveMedias: function(peer) {
    if (!peer) peer = cur.peer;
    if (!peer || !cur.imPeerMedias || !cur.imPeerMedias[peer]) return;

    var res = [], m;
    each(ge('im_media_preview').childNodes, function(k, v) {
      if (m = (v.className || '').match(/im_preview_ind(\d+)/)) {
        res.push(intval(m[1]));
      }
    });
    each(ge('im_media_dpreview').childNodes, function(k, v) {
      if (m = (v.className || '').match(/im_preview_ind(\d+)/)) {
        res.push(intval(m[1]));
      }
    });
    each(ge('im_docs_preview').childNodes, function(k, v) {
      if (m = (v.className || '').match(/im_preview_ind(\d+)/)) {
        res.push(intval(m[1]));
      }
    });
    cur.imSortedMedias[peer] = res;
  },
  emojiRegEx: /([\uE000-\uF8FF\u270A-\u2764\u2122\u25C0\u25FB-\u25FE\u2615\u263a\u2648-\u2653\u2660-\u2668\u267B\u267F\u2693\u261d\u26A0-\u26FA\u2708]|\uD83C[\uDC00-\uDFFF]|[\u2600\u26C4\u26BE\u23F3\u2764]|\uD83D[\uDC00-\uDFFF]|\uD83C[\uDDE8-\uDDFA]\uD83C[\uDDEA-\uDDFA])/g,
  getPlainText: function() {
    var txt = IM.editableVal(ge('im_editable' + cur.peer));
    txt = txt.replace(IM.emojiRegEx, '');
    return txt;
  },
  send: function(btn, ev, sendPeer) {
    var peer = cur.peer;
    if (sendPeer) {
      peer = sendPeer;
    }
    var peerMedia = cur.imPeerMedias[peer] || [],
        sortedMedia = cur.imSortedMedias[peer] || [],
        peerTab = cur.tabs[peer],
        txt = ge('im_txt' + peer),
        progressNode = ge('im_progress_preview'),
        urlAttachmentLoading = cur.imMedia && cur.imMedia.urlAttachmentLoading,
        sendMedia = IM.getMedias(peer);
    if (cur.editable) {
      txt = ge('im_editable' + peer);
    }
    if (!peer || !txt || txt.disabled) return;

    if (progressNode.childNodes.length || urlAttachmentLoading && vkNow() - urlAttachmentLoading[0] < 3000) {
      lockButton(ge('im_send'));
      cur.sendOnUploadDone = true;
      return;
    } else {
      delete cur.sendOnUploadDone;
    }

    if (cur.editable) {
      if (cur.textSendCut) {
        msg = cur.textSendCut;
        cur.textSendCut = false;
      } else {
        var msg = IM.editableVal(txt);
      }
      if (msg.length > 3980) {
        var ind = msg.substr(0, 3980).lastIndexOf(' ');
        cur.textSendCut = msg.substr(ind);
        msg = msg.substr(0, ind);
      }
      IM.extractEmoji(txt, peer);
    } else {
      var msg = val(txt);
    }

    var title = isVisible('im_title_wrap' + peer) && val('im_title' + peer) || '';
    if (!trim(msg).length && !sendMedia.length) {
      if (cur.editable) {
        IM.editableFocus(txt, false, true);
      } else {
        ge('im_txt' + peer).focus();
      }
      return;
    }
    if (peerTab.sending) {
      return;
    }
    peerTab.sending = true;

    var msg_id = --peerTab.sent,
        params = {act: 'a_send', to: peer, hash: peerTab.hash, msg: msg, title: title, ts: cur.ts},
        media = [], kludges = {}, i = 1;

    if (sendMedia) {
      each(sendMedia, function (k, v) {
        media.push(v[0] + ':' + v[1]);
        if (v[0] == 'mail') {
          kludges.fwd = v[1];
        } else if (v[0] == 'map') {
          kludges['geo'] = 'GEO';
        } else {
          kludges['attach' + i + '_type'] = v[0];
          kludges['attach' + i] = v[1];
        }
        if (v[4] && trim(msg) == v[4]) {
          params.msg = msg = txt.innerHTML = '';
        }
      });
      params.media = media.join(',');
      cur.imPeerMedias[peer] = false;
      cur.imSortedMedias[peer] = false;
      IM.restorePeerMedia(peer);
    }

    if (cur.imMedia) {
      var lnk = cur.imMedia.lnkId;
      show(geByClass('add_media_type_'+lnk+'_map', ge('add_media_menu_'+lnk))[0]);
    }

    hide('im_error' + peer, 'im_title_wrap' + peer);
    if (cur.editable) {
      IM.cleanCont(txt);
      var rowMsg = txt.innerHTML;
      rowMsg = rowMsg.replace(new RegExp('src="'+location.protocol+'//'+location.host, 'g'), 'src="');
      rowMsg = trim(rowMsg.replace(/[ ]+/, ' '));
    } else {
      var rowMsg = clean(msg).replace(/\n/g, '<br>'), rowTitle = clean(title).replace(/\n/g, '<br>');
    }

    ajax.post('al_im.php', params, {
      onDone: function(response) {
        if (cur.textSendCut) {
          setTimeout(IM.send.pbind(false, false, cur.peer), 0);
        }
        peerTab.sending = false;
        delete cur.myTypingEvents[peer];
        if (response.version && intval(response.version) > cur.version) {
          document.location = IM.updateLoc(true);
          return;
        }

        if (peerTab.q_offset) {
          IM.toEnd();
          return;
        }

        var msg_row = ge('mess' + msg_id), new_msg_id = response.msg_id;
        if (!msg_row || peer == vk.id) return;

        ++peerTab.msg_count;

        var i = peerTab.new_msgs.length;
        while (i--) {
          if (peerTab.new_msgs[i] == msg_id) {
            peerTab.new_msgs[i] = peerTab.new_msgs.pop();
            break;
          }
        }

        msg_row.cells[3].innerHTML = '<a class="im_important_toggler" onclick="return IM.toggleImportant(' + new_msg_id + ');" onmouseover="IM.showImportantTT(this);"></a><a class="im_date_link" href="/mail?act=show&id=' + new_msg_id + '">' + IM.mkdate(response.date + cur.tsDiff) + '</a><input type="hidden" id="im_date' + new_msg_id + '" value="' + response.date + '" />';
        msg_row.id = 'mess' + new_msg_id;
        msg_row.cells[0].innerHTML = '<div id="ma'+new_msg_id+'" class="im_log_check_wrap"><div class="im_log_check" id="mess_check'+new_msg_id+'"></div></div>';
        addEvent(msg_row, 'mouseover', IM.logMessState.pbind(1, new_msg_id));
        addEvent(msg_row, 'mouseout', IM.logMessState.pbind(0, new_msg_id));
        msg_row.onclick = function (e) {if (!IM.checkLogClick(this, e || window.event)) IM.checkLogMsg(new_msg_id)};

        if (ge('im_msg_media' + msg_id)) {
          val('im_msg_media' + msg_id, response.media || '');
          if (!response.media) {
            debugLog('MEDIA FAIL', msg_id, new_msg_id, response, params);
          }
          IM.scrollOn();
        }

        peerTab.msgs[new_msg_id] = [1, 1, 0];
        if (cur.peer == peer) IM.updateOnline(response.online, response.sex);
        IM.updateCounts(response.cnts);
      },
      onFail: function(error) {
        peerTab.sending = false;
        IM.error(error || getLang('global_unknown_error'));

        if (cur.editable) {
          ge('im_editable' + peer).innerHTML = rowMsg;
          IM.editableFocus(ge('im_editable' + peer), false, true);
        } else {
          ge('im_txt' + peer).focus();
          ge('im_txt' + peer).value = msg;
        }
        if (title) {
          show('im_title_wrap' + peer);
        }

        if (peerMedia) {
          cur.imPeerMedias[peer] = peerMedia;
          cur.imSortedMedias[peer] = sortedMedia;
          IM.restorePeerMedia(peer);
        }
        if (!cur.editable) {
          peerTab.txt.update();
        }

        clearTimeout(peerTab.saveDraftTO);
        IM.saveDraft(peer);

        var msg_row = ge('mess' + msg_id);
        if (!msg_row) return;
        re('mprg' + msg_id);
        msg_row.cells[3].innerHTML = '<span class="im_log_date_error">' + getLang('global_error') + '</span><input type="hidden" id="im_date' + msg_row.id.substr(4) + '" value="0" />';
        IM.scroll();

        IM.updateMoreNew(peer);

        return true;
      }
    });

    if (cur.emoji) {
      rowMsg = IM.emojiToHTML(rowMsg, cur.emoji);
    }
    if (peerTab.data) {
      kludges.from = cur.id;
    }

    if (peerTab.q_offset) {
      val('im_to_end_wrap', '<span data-for="' + peer + '" class="progress_inline"></span>');
    } else {
      peerTab.new_msgs.push(msg_id);
      IM.addMsg(peer, -1, msg_id, 2, 1, rowTitle, rowMsg, Math.floor((new Date()).getTime() / 1000), kludges);
      setTimeout(function () {
        var prg = ge('mprg' + msg_id);
        if (prg) {
          setStyle(prg, {visibility: 'visible', display: 'block'});
        }
      }, 5000);
      IM.scroll();
    }
    if (cur.editable) {
      txt.innerHTML = '';
      IM.editableFocus(txt, false, true);
      IM.checkEditable(txt);
    } else {
      txt.value = '';
      peerTab.txt.update();
      elfocus(txt);
    }
    IM.panelUpdate(false);
    IM.panelUpdate(true);
    IM.updateTopNav();
    IM.updateScroll();

    if (cur.imMedia) {
      cur.imMedia.urlsCancelled = [];
    }

    clearTimeout(peerTab.saveDraftTO);
    IM.saveDraft(peer);
  },

  feed: function(peer, events) {
    // console.trace();
    // debugLog('feed', peer, clone(events));
    var show_new = false, lastMsg = false;
    if (!cur.tabs[peer] || cur.tabs[peer].msgs === undefined) {
      return;
    }
    for (var i in events) {
      var msg = events[i], row = ge('mess' + i);
      if (cur.debug) debugLog('new update', msg, 'ex msg', row);
      if (!msg[0] && row) { // Existing message was deleted
        if (cur.deletedRows[i]) {
          continue;
        }
        var hist = IM.getTable(peer);
        var index = row.rowIndex;
        hist.deleteRow(index);

        if (!cur.tabs[peer].msgs[i][0] && cur.tabs[peer].msgs[i][1]) {
          --cur.tabs[peer].unread;
        }
        --cur.tabs[peer].msg_count;
        cur.tabs[peer].msgs[i] = false;
      } else if (!msg[0]) {
        if (cur.tabs[peer].q_offset) {
          if (cur.tabs[peer].q_new[i]) {
            delete(cur.tabs[peer].q_new[i]);
            --cur.tabs[peer].q_new_cnt;
            if (!cur.tabs[peer].msgs[i][0] && cur.tabs[peer].msgs[i][1]) {
              --cur.tabs[peer].unread;
            }
            cur.tabs[peer].msgs[i] = false;
          }
          var last = intval(domLC(geByTag1('tbody', ge('im_log' + peer))).id.replace(/^mess/, ''));
          if (last && last < i) {
            --cur.tabs[peer].q_offset;
          }
          IM.updateMoreNew(peer);
        }
      } else {
        var new_unread = (!msg[1] && msg[0] > 1),
            cur_msg = cur.tabs[peer].msgs[i];
        if (cur_msg && new_unread && (cur_msg[0] || cur_msg[1])) {
          new_unread = false;
        }
        show_new = show_new || new_unread;
        // debugLog(clone(cur_msg), new_unread, row);

        if (!row && !cur.tabs[peer].q_new[i]) { // New message appeared
          if (!cur.tabs[peer].history && cur.tabs[peer].loadingHistory) {
            continue;
          }
          if (cur.tabs[peer].new_msgs.length) {
            each (cur.tabs[peer].new_msgs, function (k, v) {
              re('mess' + v);
            });
          }

          var table = IM.getTable(peer);
          var j, after_id, first = 0, last = table.rows.length;
          while (last - first > 1) {
            var middle = Math.floor((last + first) / 2);
            var msg_id = intval(table.rows[middle].id.substr(6));
            if (msg_id < i) {
              first = middle;
            } else {
              last = middle;
            }
          }
          after_id = -1;
          if (table.rows[first])
            after_id = intval(table.rows[first].id.substr(4));
          lastMsg = [i, msg[0], msg[1], msg[2], msg[3], msg[4], msg[5]];
          IM.addMsg(peer, after_id, i, msg[0], msg[1], msg[2], msg[3], msg[4] + cur.tsDiff, msg[5]);
          ++cur.tabs[peer].msg_count;
          if (new_unread) {
            ++cur.tabs[peer].unread;
            if (cur.notify_on && cur.focused != peer) {
              IM.notify(peer, msg);
            }
          }
          cur.tabs[peer].msgs[i] = [msg[1], (msg[0] > 1) ? 1 : 0, 0];
          if (peer == cur.peer) {
            delete cur.typingEvents[peer];
            IM.updateTyping(false);
          }
        } else if (cur_msg) { // Existing message changed read status
          var out = cur_msg[0],
              unread = cur_msg[1],
              imporant = cur_msg[2],
              dialogs_row = geByClass1('dialogs_msg' + i, ge('im_dialogs'), 'div');

          if (out && dialogs_row) {
            dialogs_row = geByClass1('dialogs_msg_body', dialogs_row);
          }
          if (msg[0] > 1 && !unread && row) { // Existing message became unread
            addClass(row, 'im_new_msg');
            addClass(dialogs_row, 'dialogs_new_msg');
            if (!out) {
              addEvent(row, 'mouseover', IM.onNewMsgOver.pbind(peer, i));
              ++cur.tabs[peer].unread;
            }
            cur_msg[1] = 1;
          } else if (msg[0] < 2 && unread) { // Existing message became read
            if (row) {
              removeClass(row, 'im_new_msg');
              removeClass(dialogs_row, 'dialogs_new_msg');
            }
            if (!out) {
              if (row) {
                removeEvent(row, 'mouseover');
                addEvent(row, 'mouseover', IM.logMessState.pbind(1, i));
              }
              --cur.tabs[peer].unread;
            }
            cur_msg[1] = 0;
            if (cur.tabs[peer].q_offset) {
              if (cur.tabs[peer].q_new[i]) {
                delete(cur.tabs[peer].q_new[i]);
                --cur.tabs[peer].q_new_cnt;
              }
              IM.updateMoreNew(peer);
            }
          }

          // debugLog('imp check', row, msg, cur_msg);
          if (row && msg[6] != imporant) {
            cur_msg[2] = msg[6];
            toggleClass(row, 'im_important_msg', msg[6]);
          }
        }
      }
    }
    if (cur.tabs[peer].msg_count) {
      hide('im_none' + peer);
      show('im_log' + peer);
    } else {
      show('im_none' + peer);
      hide('im_log' + peer);
    }
    IM.updateUnreadMsgs();
    if (!cur.focused) {
      if (!cur.titleTO && cur.unreadMsgs) {
        cur.titleTO = setInterval(IM.changeTitle, 1000);
      }
    }
    if (cur.focused != peer && show_new && cur.sound && !cur.sound_off && ls.get('sound_notify_off') !== 1) {
      cur.sound.play();
    }
    if (cur.tabs[peer].unread) {
      if (cur.peer != peer) {
        if (show_new) {
          addClass(ge('im_tab' + peer), 'im_tab_over');
        }
        IM.updateScroll();
      } else if (show_new && cur.friends[peer + '_']) {
        IM.updateOnline(cur.friends[peer + '_'][0] || 1, cur.friends[peer + '_'][5]);
      }
    } else {
      if (cur.peer != peer && cur.tabs[peer].auto) {
        IM.closeTab(peer);
      } else {
        removeClass(ge('im_tab' + peer), 'im_tab_over');
      }
    }

    var tab;
    if (lastMsg && (tab = cur.tabs[peer]) && !tab.loading) { // Updating dialogs rows
      var repls = {
            msg_id: lastMsg[0],
            peer: peer,
            timestamp: lastMsg[5],
            body_class: lastMsg[1] && lastMsg[2] && 'dialogs_new_msg' || '',
            row_class: lastMsg[1] && !lastMsg[2] && 'dialogs_new_msg' || '',
            online: ''
          },
          ampm = '',
          date = new Date(repls.timestamp * 1000),
          hours = date.getHours(),
          minutes = date.getMinutes(),
          susp = lastMsg[1] == 4 && !lastMsg[2],
          title = lastMsg[3],
          body = lastMsg[4],
          kludges = lastMsg[6],
          inlineAuthor = '',
          numhours;

      // Date
      if (cur.time_system) {
        ampm = cur.time_system[hours > 11 ? 1 : 0];
        hours = (hours % 12) || 12;
      }
      numhours = hours > 9 ? hours : ('0' + hours);
      repls.date = getLang('mail_im_row_date_format').replace('{am_pm}', ampm).replace('{hour}', hours).replace('{num_hour}', numhours).replace('{minute}', (minutes < 10 ? '0' : '') + minutes);

      body = body.replace(/(<br\s?\/?>){3,}/gi, '<br/><br/>');
      var brMatches = body.match(/^(.*?<br>)(.*<br>.*)$/);
      if (brMatches) {
        body = brMatches[1] + brMatches[2].replace(/<br>/g, ' ');
      }

      // Msg body
      var prevLen = 90;
      title = IM.goodTitle(title, peer) ? title : '';
      if (title) {
        if (title.length > 48) {
          title = title.substr(0, 48) + '..';
        }
        title = '<div class="im_subj">' + title + '</div>';
        prevLen = 40;
        body = body.replace(/<br>/g, ' ');
      }
      if (body.length > prevLen) {
        body = body.substr(0, prevLen) + '..';
      }
      if (kludges.emoji) {
        body = IM.emojiToHTML(body, kludges.emoji);
      }
      body = title + body;
      // Attachment
      if (lastMsg[6].attach1_type) {
        body += '<div class="im_row_attach"><div class="im_attach_' + lastMsg[6].attach1_type + '"></div>' + getLang('mail_added_' + lastMsg[6].attach1_type) + '</div>';
      } else if (lastMsg[6].fwd) { // Forwarded mail
        body += '<div class="im_row_attach"><div class="im_attach_mail"></div>' + (lastMsg[6].fwd.match(/,\(/) ? getLang('mail_added_msgs') : getLang('mail_added_msg')) + '</div>';
      } else if (lastMsg[6].source_act && !body) {
        body += '<div class="im_row_attach" id="im_dialogs_msginfo' + lastMsg[0] + '"></div>';
      }
      if (susp) {
        body = getLang('mail_message_susp_title');
      }
      // Inline author
      if (lastMsg[2] || lastMsg[6].from) {
        if (!lastMsg[2]) {
          body = '<div class="dialogs_chat_title">' + tab.data.members[lastMsg[6].from].name + '</div>' + body;
        }
        inlineAuthor = '<img class="dialogs_inline_author fl_l" src="' + (lastMsg[2] ? cur.photo : tab.data.members[lastMsg[6].from].photo) + '" width="32" height="32"/>';
      }

      if (peer < 2e9) {
        repls.photo = '<a href="/id'+peer+'" target="_blank" onclick="event.cancelBubble = true; return nav.go(this, event);" onmousedown="event.cancelBubble = true;"><img src="' + tab.photo + '" width="50" height="50" /></a>';
        repls.user_link = '<a href="/id'+peer+'" target="_blank" onclick="event.cancelBubble = true; return nav.go(this, event);" onmousedown="event.cancelBubble = true;">' + tab.tab_text.replace('&nbsp;', ' ') + '</a>';
        if (!lastMsg[2] || cur.friends[peer + '_'] && cur.friends[peer + '_'][0]) {
          var onl = langSex((cur.tabs[cur.peer] || {}).sex || (cur.friends[cur.peer + '_'] || {})[5], window.global_online);
          if (cur.friends[peer + '_'] && (cur.friends[peer + '_'][0] != 1)) {
            onl += '<b class="mob_onl dialogs_mob_onl" onmouseover="mobileOnlineTip(this, {mid: ' + peer + '})" onclick="mobilePromo(); return cancelEvent(event);"></b>';
          }
          repls.online = '<div class="dialogs_online">' + onl + '</div>';
        }
      } else {
        // Complicated photo and user link
        repls.user_link = '<a href="/im?sel='+peer+'" onclick="event.cancelBubble = true; if (!checkEvent(event)) {IM.addPeer('+peer+'); return false;}">' + tab.name + '</a>';
        repls.photo = tab.data.members_grid_small;
        if (tab.data.count > 0) {
          repls.online = '<div class="dialogs_online">' + getLang('mail_im_n_chat_members', tab.data.count) + '</div>';
        }
      }
      repls.body = body;
      repls.inline_author = inlineAuthor;
      re('im_dialog' + peer);
      var dRow = se(rs(cur.drow_template, repls)),
          cont = ge('im_dialogs'),
          insBefore = cont && cont.firstChild;
      while (insBefore) {
        if (hasClass(insBefore, 'dialogs_row') &&
            repls.timestamp > intval(insBefore.getAttribute('data-date'))) {
          break;
        }
        insBefore = insBefore.nextSibling;
      }
      if (insBefore) {
        cont.insertBefore(dRow, insBefore);
      } else {
        cont.appendChild(dRow);
      }
      hide('im_rows_none');
      show('im_dialogs_summary');
    }
  },

  getKey: function() {
    cur.lastOperation = vkNow();

    cur.key = false;
    if (cur.keyReq) {
      try {
        cur.keyReq.abort();
      } catch (e) {}
    }

    cur.keyReq = ajax.post('al_im.php', {act: 'a_get_key', uid: cur.id}, {
      onDone: function (key, frame, url, cnts) {
        key = trim(key);
        if (/[0-9a-f]{40}/i.test(key)) {
          cur.key = key;
          cur.url = url;
          if (ge('transport_frame').src != frame) {
            ge('transport_frame').src = frame;
            delete IM.makeRequest;
            delete cur.imMakeRequest;
          }
          IM.check();
        } else {
          IM.error(getLang('mail_im_auth_failed'));
        }
        IM.updateCounts(cnts);
      },
      onFail: function (msg) {
        setTimeout(IM.getKey, cur.errorTimeout * 1000);
        debugLog('from getKey delaying getKey for ' + cur.errorTimeout + 'secs');
        if (cur.errorTimeout < 64) {
          cur.errorTimeout *= 2;
        }
      }
    });
  },

  clearHistory: function(peer, table) {
    hide('im_more' + peer);
    extend(cur.tabs[peer], {
      msgs: {},
      all_shown: 0,
      msg_count: 0,
      q_offset: 0,
      q_new: {},
      q_new_cnt: 0,
      tables: 0,
      unread: 0,
      auto: 0,
      sent: 0,
      new_msgs: [],
      delayed: [],
      history: false
    });
    var newT = se('<table cellspacing="0" cellpadding="0" id="im_log' + peer + '" class="im_log_t"><tbody></tbody></table>');
    domPN(table).replaceChild(newT, table);
    IM.updateMoreNew(peer);
    return newT;
  },
  checked: function(response) {
    var failed = response.failed;
    if (failed == 1 || cur.ts >= response.ts + 256 || cur.failedCheck) {
      delete cur.failedCheck;
      cur.ts = response.ts;
      var qoff = IM.r(cur.peer) ? false : cur.tabs[cur.peer].q_offset;
      for (var i in cur.tabs) {
        if (i == cur.peer) continue;

        IM.clearHistory(i, ge('im_log' + i));
      }
      if (!IM.r(cur.peer) && !qoff) {
        IM.loadHistory(cur.peer);
      }
      IM.updateUnreadMsgs();
      if (failed) return true;
    } else if (failed == 2) {
      debugLog('delaying getKey for ' + cur.errorTimeout + 'secs');
      setTimeout(IM.getKey, cur.errorTimeout * 1000);
      if (cur.errorTimeout < 64) {
        cur.errorTimeout *= 2;
      }
      return false;
    } else if (failed) {
      throw getLang('global_unknown_error');
    }

    cur.ts = response.ts;
    var result = {};
    var update_chats = {};
    var modified_flags = {}; // if more than one event for one message
    if (response.updates) {
      for (var i in response.updates) {
        var update = response.updates[i],
            code = intval(update[0]),
            msg_id = intval(update[1]),
            flags = intval(update[2]),
            peer = intval(update[3]);

        if (code == 51) { // chat members or title were updated
          var peer = 2e9 + msg_id, tab = cur.tabs[peer];
          if (tab && !update_chats[peer] && (!(flags & 1) || vkNow() - intval(tab.lastModifiedTime) > 2000)) {
            update_chats[peer] = 1;
          }
          continue;
        }
        if (code == 61 || code == 62) { // peer or chat peer is typing
          if (code == 62) {
            if (cur.peer == 2e9 + flags) {
              IM.onTyping(2e9 + flags, msg_id); //cur.tabs[cur.peer].data.members[msg_id]);
            }
          } else if (cur.peer == msg_id) {
            IM.onTyping(msg_id);
          }
          continue;
        }
        if (!peer) continue;

        if (code == 0 || code == 1 || code == 2 || code == 3) {
          if (result[peer] !== undefined && result[peer][msg_id] !== undefined) {
            if (result[peer][msg_id][0] == 2 && (code == 3 && (flags & 1) || code == 1 && !(flags & 1))) {
              result[peer][msg_id][0] = 1;
            }
            if (code == 0 || (code == 1 || code == 2) && (flags & 192)) {
              result[peer][msg_id][0] = 0;
            }
            if (code == 3 && (flags & 128)) {
              result[peer][msg_id][0] = 0;
            }
          }
          if (!cur.tabs[peer] || !cur.tabs[peer].msgs) continue;
          var prev_msg = cur.tabs[peer].msgs[msg_id];
          if (!prev_msg) {
            if (cur.tabs[peer].q_offset && ((flags & 128) || cur.tabs[peer].q_new[msg_id] && !(flags & 1))) {
              prev_msg = [0, 0];
            } else {
              continue;
            }
          }
          var prev_flags = modified_flags[peer + '_' + msg_id] !== undefined ? modified_flags[peer + '_' + msg_id] : prev_msg[0] * 2 + prev_msg[1];
          // debugLog(update, prev_flags, prev_msg);
          if (code == 0) {
            flags = prev_flags | 128;
          } else if (code == 2) {
            flags = prev_flags | flags;
          } else if (code == 3) {
            flags = prev_flags & (~flags);
          } else {

          }
          modified_flags[peer + '_' + msg_id] = flags;
        }
        if (flags & 4096) { // NO_CHAT
          flags = flags | 128;
        }
        if (flags & 64) { // SPAM
          flags = flags | 128;
        }
        if (!result[peer]) {
          result[peer] = {};
        }
        if (code == 2 && flags == 16384) {
          var status = 3;
        } else {
          var status = (flags & 128) ? 0 : ((flags & 32768) ? 4 : ((flags & 1) ? 2 : 1));
        }
        if (status) {
          var msg = update[6];
          var title = update[5];
          var date = intval(update[4]);
          var out = (flags & 2) ? 1 : 0;
          var imp = (flags & 8) ? 1 : 0;
          if (ge('mess' + msg_id) || (msg !== undefined) || cur.tabs[peer].q_new[msg_id]) {
            result[peer][msg_id] = [status, out, title, msg, date, update[7] || {}, imp];
          }
        } else {
          result[peer][msg_id] = [0];
        }
      }
    } else {
      result = response.result;
    }

    if (response.updates.length) {
      debugLog('checked', response.updates, result);
    }

    if (result) {
      for (var peer in result) {
        if (!intval(peer) || cur.flushing_peer == peer) continue;
        var events = result[peer];
        if (!cur.tabs[peer]) {
          var need_tab = false;
          for (var i in events) {
            if ((events[i][0] == 1 || events[i][0] == 2) && !events[i][1]) {
              need_tab = true;
              break;
            }
          }
          if (need_tab) {
            IM.addPeer(peer, events);
          }
          continue;
        }
        IM.feed(peer, events);
      }
    }
    for (var peer in update_chats) {
      IM.updateChat(peer, true);
    }
    return true;
  },

  check: function() {
    if (cur.imInited !== true) {
      return;
    }
    cur.lastOperation = vkNow();

    var makeRequest = cur.imMakeRequest || IM.makeRequest;
    if (!makeRequest) {
      setTimeout(IM.check, 1000);
      return;
    }
    try {
      makeRequest(function(obj, text) {

        if (cur.id == 13033 || cur.id == 2943) {
          var success = IM.checked(eval('(' + text + ')'));
          if (success) {
            IM.check();
            cur.errorTimeout = 1;
          }
        } else {
        try {
          var success = IM.checked(eval('(' + text + ')'));
          if (success) {
            IM.check();
            cur.errorTimeout = 1;
          }
        } catch (e) {
          IM.error('Error: ' + e.message);
          try {
            debugLog('error', e.message || 'no message', e.type || 'no type', e.stack || 'no stack');
          } catch (e) {}

          setTimeout(IM.check, cur.errorTimeout * 1000);
          if (cur.errorTimeout < 64) {
            cur.errorTimeout *= 2;
          }
        }
        }
      }, function() {
        setTimeout(IM.check, cur.errorTimeout * 1000);
        if (cur.errorTimeout < 64) {
          cur.errorTimeout *= 2;
        }
      });
    } catch (e) {
      debugLog('makeRequest failed', e)
    }
  },

  checkConnection: function() {
    var timePassed = vkNow() - cur.lastOperation;
    if (timePassed > 60000 && timePassed > cur.errorTimeout * 1500) {
      if (!cur.key) {
        debugLog('gkey from check conn');
        IM.getKey();
      } else {
        debugLog('check from check conn');
        IM.check();
      }
    }
  },

  changeTitle: function() {
    if (!cur.unreadMsgs) return IM.restoreTitle();
    if (!cur.old_title) {
      cur.old_title = document.title.toString();
      document.title = getLang('mail_im_new_messages', cur.unreadMsgs);
      var icon_num = cur.unreadMsgs > 9 ? 10 : cur.unreadMsgs;
      setFavIcon('/images/icons/fav_im' + icon_num + '.ico');
    } else {
      document.title = cur.old_title;
      cur.old_title = false;
      setFavIcon('/images/fav_chat'+(window.devicePixelRatio >= 2 ? '_2x' : '')+'.ico?1');
    }
  },

  restoreTitle: function() {
    if (cur.old_title) {
      var t = cur.old_title;
      setTimeout(function() { document.title = t; }, 200);
      setFavIcon('/images/fav_chat'+(window.devicePixelRatio >= 2 ? '_2x' : '')+'.ico?1');
      cur.old_title = false;
    }
    clearInterval(cur.titleTO);
    cur.titleTO = false;
  },

  markRead: function(peer, unread) {
    if (!unread.length) return;
    var curTab = peer == -4 ? cur.spam : cur.tabs[peer];
    curTab.markingRead = true;

    // debugLog('reading', unread, peer, IM.r(peer));
    // console.trace();
    ajax.post('al_im.php', {act: 'a_mark_read', peer: peer, ids: unread, hash: curTab.hash}, {
      onDone: function (res, cnts) {
        curTab.markingRead = false;

        each (unread, function (k, msg_id) {
          if (peer == -4) msg_id = 's' + msg_id; // spam
          if (IM.r(peer) || curTab.msgs[msg_id] && !curTab.msgs[msg_id][0] && curTab.msgs[msg_id][1]) {
            if (!IM.r(peer)) {
              curTab.msgs[msg_id][1] = 0;
              --curTab.unread;
            }
            var row = ge('mess' + msg_id),
                dialogs_row = geByClass1('dialogs_msg' + msg_id, ge('im_dialogs'), 'div');
            removeClass(row, 'im_new_msg');
            removeEvent(row, 'mouseover');
            removeClass(dialogs_row, 'dialogs_new_msg');
            addEvent(row, 'mouseover', IM.logMessState.pbind(1, msg_id));
          }
        });

        if (!IM.r(peer) && cur.peer == peer) {
          IM.updateScroll();
        }

        IM.updateCounts(cnts);
        if (!IM.r(peer)) {
          IM.updateUnreadMsgs();
        }
      },
      onFail: function () {
        curTab.markingRead = false;
      }
    });
  },

  getNewTxt: function() {
    return IM.getTxt(-3);
  },
  getTxt: function (peer) {
    peer = peer || cur.peer;
    if (peer == -3) {
      return ge(cur.editable ? 'imw_editable' : 'imw_text');
    }
    return ge((cur.editable ? 'im_editable' : 'im_txt') + peer);
  },
  initTxt: function(peer) {
    try {
      var txt = IM.getTxt(peer),
          tab = cur.tabs[peer];
      if (!cur.editable && !tab.txt && !browser.mobile) {
        autosizeSetup(txt, {minHeight: 42, maxHeight: 100, exact: 1, onResize: IM.updateScroll, preventEnter: true});
        tab.txt = txt.autosize;
      }
      if (cur.editable) {
        setTimeout(function() {
          placeholderSetup(txt, {editable: 1, editableFocus: IM.editableFocus});
          if (peer == cur.peer) {
            IM.editableFocus(txt, false, true);
          }
        }, 0);
        if (browser.mozilla) {
          document.execCommand("enableObjectResizing", false, false);
          cur.destroy.push(function() {
            document.execCommand("enableObjectResizing", false, true);
          })
        }
        addEvent(txt, browser.opera ? 'click' : 'mousedown', function(e) {
          if (e.target && e.target.tagName == 'IMG') {
            if (e.target.getAttribute('emoji')) {
              IM.editableFocus(txt, e.target, e.offsetX > 8);
              return cancelEvent(e);
            }
          }
          cur.emojiFocused = false;
        });
      } else {
        placeholderSetup(txt);
      }
      addEvent(txt, 'keypress keydown keyup paste', function(e) {
        if (e.type == 'keydown' && (e.keyCode == KEY.RETURN || e.keyCode == 10)) {
          if (cur.ctrl_submit && (e.ctrlKey || browser.mac && e.metaKey) ||
              !cur.ctrl_submit && !e.shiftKey && !(e.ctrlKey || browser.mac && e.metaKey)) {
            if (!IM.emojiEnter(e)) {
              return false;
            }
            IM.send();
            return cancelEvent(e);
          }
        }
        if (e.type == 'keydown' && e.ctrlKey && e.keyCode == KEY.RETURN) {
          var val = this.value;
          if (cur.editable) {
            if (browser.msie) {
              var r = document.selection.createRange();
              if (r.pasteHTML) {
                r.pasteHTML('<div><br/></div>');
              }
            } else {
              document.execCommand('insertHTML', false, '<div><br/></div>');
            }
          } else {
            if (typeof this.selectionStart == "number" && typeof this.selectionEnd == "number") {
              var start = this.selectionStart;
              this.value = val.slice(0, start) + "\n" + val.slice(this.selectionEnd);
              this.selectionStart = this.selectionEnd = start + 1;
            } else if (document.selection && document.selection.createRange) {
              this.focus();
              var range = document.selection.createRange();
              range.text = "\r\n";
              range.collapse(false);
              if (browser.opera) {
                range.moveEnd('character', 0);
                range.moveStart('character', 0);
              }
              range.select();
            }
            txt.autosize.update();
            setTimeout(function () {
              txt.autosize.update();
            }, 0);
          }
          return false;
        }

        if (e.type == 'keyup') {
          IM.readLastMsgs();
          if (cur.editable) {
            if (!e.ctrlKey && !e.metaKey && (e.keyCode > 40 && !inArray(e.keyCode, [91, 92]) && !(e.keyCode >= 112 && e.keyCode <= 125) || e.keyCode == 32 || e.keyCode == 8)) {
              IM.onMyTyping(peer);
            }
          } else {
            var lastVal = tab.lastVal || '';
            var curVal = this.value;
            if (curVal.length != lastVal.length ||
                curVal != lastVal) {
              IM.onMyTyping(peer);
              tab.lastVal = curVal;
            }
          }
        }

        if (e.type == 'paste') {
          if (cur.editable) {
            IM.onEditablePaste(txt);
          }
        }
        clearTimeout(tab.saveDraftTO);
        tab.saveDraftTO = setTimeout(IM.saveDraft.pbind(cur.peer, e.type), e.type == 'paste' ? 0 : 300);
        if (cur.editable && e.type == 'keyup') {
          IM.checkEditable(txt);
        }
        return true;
      });
      addEvent(txt, 'focus', function () {
        cur.focused = cur.peer;
        IM.panelUpdate(true);
        IM.restoreTitle();
      });
      addEvent(txt, 'blur', function () {
        cur.focused = 0;
        IM.panelUpdate(false);
      });
      if (peer == cur.peer) {
        if (!cur.editable) {
          ge('im_txt' + peer).focus();
        }
      }
    } catch (e) {
      debugLog('err', e.message, e);
      setTimeout('IM.initTxt(' + peer + ')', 100);
    }
  },
  saveDraft: function (peer, evType) {
    var tab = cur.tabs[peer],
        txt = IM.getTxt(peer);
    if (!txt || !tab || cur.peer != peer) return;

    var message = IM.editableVal(txt),
        data = {txt: trim(message), medias: []},
        m = IM.getMedias(peer);

    for (var i = 0, l = m.length; i < l; ++i) {
      if (m[i]) data.medias.push([m[i][0], m[i][1]]);
    }
    if (!data.medias.length && !data.txt.length) {
      data = false;
    }
    ls.set('im_draft' + vk.id + '_' + peer, data);

    if (data && data.txt.length && cur.imMedia && (evType == 'paste' || evType == 'keyup')) {
      cur.imMedia.checkMessageURLs(message, evType != 'keyup');
    }
  },
  restoreDraft: function(peer) {
    var tab = cur.tabs[peer],
        draft = ls.get('im_draft' + vk.id + '_' + peer) || {},
        draftv = draft.txt || '',
        txt = IM.getTxt(peer),
        curv = IM.editableVal(txt);
    if (browser.mobile || !txt || !tab || !draftv && !draft.medias || cur.peer != peer ||
        curv.length > draftv.length ||
        (cur.imPeerMedias[peer] || []).length > (draft.medias || []).length) {
      return false;
    }
    if (curv.length < draftv.length) {
      if (cur.editable) {
        val(txt, IM.emojiToHTML(clean(draftv), true).replace(/\n/g, '<br/>'));
        IM.editableFocus(txt, false, true);
      } else {
        val(txt, draftv);
      }
    }
    IM.checkEditable(txt);
    if ((draft.medias || []).length && !(cur.imPeerMedias[peer] || []).length) {
      var m = [];
      for (var i in draft.medias) {
        if (!draft.medias[i]) continue;
        m.push(draft.medias[i].slice(0, 2).join(','));
      }
      ajax.post('al_im.php', {act: 'draft_medias', media: m.join('*')}, {onDone: function(resp) {
        if ((cur.imPeerMedias || []).length || cur.peer != peer || !(resp || []).length) return;
        each (resp, function () {
          IM.onMediaChange.apply(IM, this);
        });
      }});
      return true;
    }
    return false;
  },
  onNewMsgOver: function (peer, msg_id) {
    if (!cur.tabs[peer].markingRead) {
      var suspWrap = ge('im_susp_wrap' + msg_id);
      if (suspWrap && !hasClass(suspWrap, 'im_msg_susp_wrap_done')) {
        return false;
      }
      IM.markRead(peer, [msg_id]);
    }
  },
  onMediaChange: function(type, media, data, url) {
    debugLog('onchange', type, media, data);
    if (!isArray(cur.imPeerMedias[cur.peer])) {
      cur.imPeerMedias[cur.peer] = [];
      cur.imSortedMedias[cur.peer] = [];
    }
    var preview = '',
        postview = '',
        attrs = '',
        conts = [
      ge('im_docs_preview'),
      ge('im_media_preview'),
      ge('im_media_dpreview'),
      ge('im_media_mpreview'),
      ge('im_sdocs_preview')
    ], tgl = {}, len = 0, i,
        progressNode = ge('im_progress_preview'),
        curPeerMedia = cur.imPeerMedias[cur.peer];

    if (type) {
      for (i in curPeerMedia) {
        if (curPeerMedia[i][0] == type && (curPeerMedia[i][1] == media || type == 'mail')) {
          if ((!cur.fileApiUploadStarted || data.upload_ind === undefined) && !cur.preventBoxHide) {
            boxQueue.hideLast();
          }
          return false;
        }
      }
    }

    var contIndex = 0, cont, cls;
    switch (type) {
      case 'photo':
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
        preview = '<div onclick="if (cur.cancelClick) return (cur.cancelClick = false); return showPhoto(\'' + media + '\', \'' + data.list + '\', ' + data.view_opts.replace(/"/g, '&quot;') + ');" class="im_preview_photo"><img class="im_preview_photo" src="' + data.thumb_s + '" onload="IM.refr()" />';
        postview = '</div>';
        contIndex = 1;
        attrs = ' id="iam_photo' + media + '"';
        cls = 'inl_bl';
        break;

      case 'video':
        if (!isObject(data)) {
          data = {
            thumb: data || ''
          };
        }
        preview = '<div onclick="if (cur.cancelClick) return (cur.cancelClick = false); return showVideo(\'' + media + '\');" class="im_preview_video"><img class="im_preview_video" src="' + data.thumb + '" onload="IM.refr()" />';
        postview = '</div>';
        contIndex = 1;
        attrs = ' id="iam_video' + media + '"';
        cls = 'inl_bl';
        break;

      case 'audio':
        if (!data.info) return false;
        preview = Page.addAudioPreview(media, data);
        contIndex = 0;
        cls = 'clear_fix';
        attrs = ' id="iam_audio' + media + '"';
        break;

      case 'doc':
        if (!data.lang) return false;
        if (data.thumb && data.thumb_s) {
          preview = '<a target="_blank" href="' + data.href + '" class="fl_l pam_dpic" onclick="if (cur.cancelClick) return (cur.cancelClick = false);"><div class="im_preview_photo_doc"><img src="' + data.thumb_s + '" align="middle"></div><div class="im_preview_doc_photo_hint">' + data.title + '</div>';
          postview = '</a><div class="pam_bg">&nbsp;</div>';
          contIndex = 2;
          cls = 'fl_l';
        } else {
          preview = '<a target="_blank" href="' + data.href + '" class="medadd_h medadd_h_doc inl_bl" onclick="if (cur.cancelClick) return (cur.cancelClick = false);">' + data.lang.profile_choose_doc + '</a>';
          postview = '<div class="medadd_c medadd_c_doc"><a target="_blank" href="' + data.href + '">' + data.title + '</a></div>';
          contIndex = 0;
          cls = 'clear_fix';
        }
        attrs = ' id="iam_doc' + media + '"';
        break;

      case 'mail':
        preview = '<div class="medadd_h medadd_h_mail inl_bl">' + getLang('mail_im_forward') + '</div>';
        postview = '<div class="medadd_c medadd_c_mail">' + getLang('mail_title_X_msgs', data[0]) + '</div>';
        contIndex = 4;
        cls = 'clear_fix';
        break;

      case 'map':
        preview = '<div class="fl_l"><a onclick="return showBox(\'al_places.php\', {act: \'geo_box\', lat: '+data[0]+', long: '+data[1]+'}, {dark: 1});"><div class="page_media_map_point"></div><img class="page_preview_map" width="180" height="70" src="'+locProtocol+'//maps.googleapis.com/maps/api/staticmap?center='+data[0]+','+data[1]+'&zoom=11&size='+(window.devicePixelRatio >= 2 ? '360x140' : '180x70')+'&sensor=false&language='+data[2]+'" /></a></div>';
        contIndex = 3;
        cls = 'fl_l';
        var lnk = cur.imMedia.lnkId;
        hide(geByClass('add_media_type_' + lnk + '_map', ge('add_media_menu_' + lnk))[0]);
        break;

      case false:
        break;

      default:
        IM.onUploadDone();
        return false;
    }
    if (type) {
      var ind = curPeerMedia.length,
          mediaHtml = '<div class="im_preview_' + type + '_wrap im_preview_ind%ind% ' + cls + '"' + attrs + '>' + preview + '<div nosorthandle="1" class="im_media_x inl_bl" '+ (browser.msie ? 'title' : 'tooltip') + '="' + getLang('dont_attach') + '" onmouseover="if (browser.msie) return; showTooltip(this, {text: this.getAttribute(\'tooltip\'), shift: [14, 3, 3], black: 1})" onclick="cur.addMedia[%lnkId%].unchooseMedia(%ind%); return cancelEvent(event);"><div class="im_x" nosorthandle="1"></div></div>' + postview + '</div>',
          mediaEl = se(rs(mediaHtml, {lnkId: cur.imMedia.lnkId, ind: ind}));
      if (data.upload_ind !== undefined) re('upload' + data.upload_ind + '_progress_wrap');
      (cont = conts[contIndex]).appendChild(mediaEl);
      curPeerMedia.push([type, media, contIndex, mediaHtml, url]);

      var ev = window.event;
      var noboxhide = ev && ev.type == 'click' && (ev.ctrlKey || ev.metaKey || ev.shiftKey);

      if ((!cur.fileApiUploadStarted || data.upload_ind === undefined) && !noboxhide && !cur.preventBoxHide) {
        boxQueue.hideLast();
      }
      if (data.upload_ind !== undefined) {
        delete data.upload_ind;
      }
      show(cont);
    } else { // Media was deleted, media = ind
      if (curPeerMedia[media]) {
        cont = conts[contIndex = curPeerMedia[media][2]];
        if (cont.sorter) cont.sorter.destroy();
        if (cont.qsorter) cont.qsorter.destroy();
        if (cont.usorter) cont.usorter.destroy();
        if (curPeerMedia[media][0] == 'map') {
          var lnk = cur.imMedia.lnkId;
          show(geByClass('add_media_type_' + lnk + '_map', ge('add_media_menu_' + lnk))[0]);
        }
        var mediaEl = geByClass1('im_preview_ind' + media, cont, 'div'),
            x = geByClass1('im_media_x', mediaEl, 'div');
        if (x && x.tt && x.tt.el) {
          x.tt.destroy();
        }
        re(mediaEl);
        curPeerMedia[media] = false;
        if (!domFC(cont)) hide(cont);
      }
    }
    if (cont && (!browser.msie || browser.version > 8)) {
      if (contIndex === 0 && cont.childNodes.length > 1) {
        stManager.add(['sorter.js'], function() {
          if (cont.sorter) {
            sorter.added(cont);
          } else if (cont.childNodes.length > 1) {
            sorter.init(cont, {noscroll: 1, onReorder: IM.saveMedias.pbind(cur.peer)});
          }
        });
      } else if (contIndex === 1 && cont.childNodes.length > 1) {
        stManager.add(['usorter.js'], function() {
          if (cont.usorter) {
            usorter.added(cont);
          } else if (cont.childNodes.length > 1) {
            usorter.init(cont, {clsUp: 'im_preview_up', onReorder: IM.saveMedias.pbind(cur.peer)});
          }
        });
      } else if (contIndex === 2 && cont.childNodes.length > 1) {
        stManager.add(['qsorter.js'], function() {
          if (cont.qsorter) {
            qsorter.added(cont);
          } else if (cont.childNodes.length > 1) {
            qsorter.init(cont, IM.qsorterOpts());
          }
        });
      }
    }
    IM.saveMedias();
    toggle('im_add_media', this.attachedCount() < cur.attachments_num_max);
    if (!!domFC(progressNode)) {
      show(progressNode);
    } else {
      hide(progressNode);
      IM.onUploadDone();
    }
    IM.scrollOn();
    clearTimeout(cur.tabs[cur.peer].saveDraftTO);
    IM.saveDraft(cur.peer);
    return false;
  },
  refr: function() {
    var addim = ge('im_media_preview');
    if (addim && addim.usorter && (!browser.msie || browser.version > 8)) {
      usorter.added(addim);
    }
  },
  qsorterOpts: function() {
    return {
      xsize: Math.floor(ge('im_media_dpreview').offsetWidth / 110),
      width: 110,
      height: 83,
      noscroll: 1,
      onReorder: IM.saveMedias.pbind(cur.peer),
      clsUp: 'pam_dpic_up'
    };
  },
  onMediaProgress: function(type, i, data) {
    debugLog('onProgress', type, i, data);
    var preview = '', len = 0,
        progressNode = ge('im_progress_preview'),
        percent = intval(data.loaded / data.total * 100),
        fileName = data.fileName || data.name || '',
        ind = fileName ? i + '_' + fileName : i,
        label = fileName ? (fileName.length > 33 ? fileName.substr(0, 30) + '...' : fileName) : '';

    if (!ge('upload' + ind + '_progress_wrap')) {
      var progress = '<div class="page_attach_progress_wrap">\
        <div id="upload' + ind + '_progress" class="page_attach_progress" style="width: ' + percent + '%;"></div>\
      </div></div>';
      var progressEl = ce('div', {id: 'upload' + ind + '_progress_wrap', innerHTML: '<div class="fl_l">' + progress + '</div>' + (label ? '<div class="attach_label fl_l">' + label + '</div>' : '') + '<div class="progress_x fl_l" style="margin-top: 0px;" onmouseover="animate(this, {opacity: 1}, 200); showTooltip(this, {text: \'' + getLang('dont_attach') + '\', shift: [6, 3, 3]})" onmouseout="animate(this, {opacity: 0.6}, 200);" onclick="Upload.terminateUpload(' + i + ', \'' + (fileName || i) + '\');"></div>', className: 'clear_fix upload_' + i + '_progress'}, {marginTop: '6px'});
      progressNode.appendChild(progressEl);
      show(progressNode);
      toggle('im_add_media', this.attachedCount() < cur.attachments_num_max);

      if (!percent) {
        hide('upload' + ind + '_progress');
      }
    } else {
      setStyle(ge('upload' + ind + '_progress'), {width: percent + '%'});
      show('upload' + ind + '_progress');
    }
    return false;
  },
  onMyTyping: function (peer) {
    peer = intval(peer);
    var tab = cur.tabs[peer];
    if (peer <= 0 || !tab) return;
    var ts = vkNow();
    if (cur.myTypingEvents[peer] && ts - cur.myTypingEvents[peer] < 5000) {
      return;
    }
    cur.myTypingEvents[peer] = ts;
    ajax.post('al_im.php', {act: 'a_typing', peer: peer, hash: tab.hash});
  },
  onTyping: function (peer, mid) {
    if (!cur.tabs[peer]) return;
    var ts = vkNow();

    if (peer > 2e9) {
      if (!cur.typingEvents[peer]) {
        cur.typingEvents[peer] = {};
      }
      cur.typingEvents[peer][mid] = ts;
    } else {
      cur.typingEvents[peer] = ts;
    }
    IM.updateTyping(false);
  },
  updateTyping: function (forced) {
    var peer = cur.peer,
        tab = peer && cur.tabs && cur.tabs[peer],
        typings = [],
        lastEv = peer && cur.typingEvents && cur.typingEvents[peer],
        sex,
        ts = vkNow(),
        el = ge('im_typing' + peer);

    if (!peer || !tab || IM.r(peer)) {
      return;
    }
    if (peer < 2e9) {
      if (lastEv && ts - lastEv < 6000) {
        typings.push(tab.name);
        sex = tab.sex;
      }
    } else {
      var mems = tab.data.members;
      each (lastEv || {}, function (k, v) {
        if (mems[k] && v && ts - v < 6000) {
          typings.push(mems[k].name);
          sex = mems[k].sex;
        }
      });
    }
    if (!typings.length) {
      if (forced) {
        setStyle(el, {opacity: 0});
        hide(el);
      } else {
        fadeTo(el, 1000, 0);
      }
      return;
    }
    if (typings.length == 1) {
      val(el, langSex(sex, cur.lang.mail_im_typing).replace('{user}', typings[0]));
    } else {
      var lastUser = typings.pop();
      val(el, getLang('mail_im_multi_typing').replace('{users}', typings.join(', ')).replace('{last_user}', lastUser));
    }
    IM.hideLastAct(peer);
    if (forced) {
      show(el);
      setStyle(el, {opacity: 1});
    } else {
      fadeTo(el, 200, 1);
    }
    IM.scrollAppended();
  },

  attachedCount: function() {
    var previewEl = ge('im_media_preview'),
        dpreviewEl = ge('im_media_dpreview'),
        mpreviewEl = ge('im_media_mpreview'),
        docsEl = ge('im_docs_preview'),
        sdocsEl = ge('im_sdocs_preview'),
        progressNode = ge('im_progress_preview');
    return (previewEl.childNodes.length + dpreviewEl.childNodes.length + mpreviewEl.childNodes.length + docsEl.childNodes.length / (docsEl.sorter ? 2 : 1) + sdocsEl.childNodes.length + progressNode.childNodes.length);
  },
  toEnd: function() {
    IM.loadHistory(cur.peer);
    var toEndWrap = ge('im_to_end_wrap');
    if (domFC(toEndWrap).className != 'progress_inline') {
      val('im_to_end_wrap', '<span data-for="' + cur.peer + '" class="progress_inline"></span>');
    }
  },
  updateMoreNew: function(peer) {
    if (!cur.tabs[peer]) {
      removeClass(cur.imEl.controls, 'im_to_end_controls');
      return;
    }
    toggle('im_morenew' + peer, cur.tabs[peer].q_offset);
    if (cur.peer == peer && cur.tabs[peer].q_offset) {
      var teWrap = ge('im_to_end_wrap'),
          newcnt = cur.tabs[peer].q_new_cnt || 0,
          newtxt = newcnt ? ('(' + getLang('mail_im_new_messages', newcnt) + ')') : '',
          newval = trim(getLang('mail_goto_history_end').replace('{new}', newtxt));
      if (
        domFC(teWrap).className == 'progress_inline' &&
        domFC(teWrap).getAttribute('data-for') == peer &&
        isVisible(teWrap)
      ) {
        return;
      }
      val(teWrap, '<span class="im_to_end">' + newval + '</span>');
      addClass(cur.imEl.controls, 'im_to_end_controls');
    } else {
      removeClass(cur.imEl.controls, 'im_to_end_controls');
    }
  },
  // from: 1 - initial, -1 - more new messages loaded, by q_offset (down-scroll)
  updatePeer: function(peer, msgs, all_shown, from) {
    cur.tabs[peer].history = 1;

    var count = 0,
        unread = 0,
        newmsgs = 0,
        row,
        prev;
    for (var i in msgs) {
      ++count;
      if (from < 0) {
        ++newmsgs;
      }
      prev = cur.tabs[peer].msgs[i];
      cur.tabs[peer].msgs[i] = msgs[i];

      row = ge('mess' + i);

      addEvent(row, 'mouseover', IM.logMessState.pbind(1, i));
      addEvent(row, 'mouseout', IM.logMessState.pbind(0, i));

      if (!msgs[i][0] && msgs[i][1] && (!prev || !prev[1] || from > 0)) {
        ++unread;
        addEvent(row, 'mouseover', IM.onNewMsgOver.pbind(peer, i));
      }
    }
    cur.tabs[peer].msg_count += count;
    cur.tabs[peer].unread += unread;
    cur.tabs[peer].all_shown = all_shown;
    cur.tabs[peer].q_offset -= newmsgs;
    if (cur.tabs[peer].q_offset < 0) {
      cur.tabs[peer].q_offset = 0;
    }

    toggle('im_more' + peer, !all_shown);
    toggle('im_log' + peer, cur.tabs[peer].msg_count);
    toggle('im_none' + peer, !cur.tabs[peer].msg_count);
    IM.updateMoreNew(peer);
  },
  readLastMsgs: function () {
    var peer = cur.peer, curTab = cur.tabs[peer];
    if (IM.r(peer)) return;

    if (!curTab.markingRead && curTab.unread) {
      var unread = [], suspWrap;
      for (var i in curTab.msgs) {
        if (!curTab.msgs[i][0] && curTab.msgs[i][1] &&
            (!(suspWrap = ge('im_susp_wrap' + i)) || hasClass(suspWrap, 'im_msg_susp_wrap_done'))) {
          unread.push(i);
        }
      }
      IM.markRead(peer, unread);
    }
  },
  decHash: function(hash) {
    (function(_){cur.decodedHashes[_]=(function(__){var ___=ge?'':'___';for(____=0;____<__.length;++____)___+=__.charAt(__.length-____-1);return geByClass?___:'___';})(_.substr(_.length-5)+_.substr(4,_.length-12));})(hash);
  },
  decodehash: function(hash) {
    if (!cur.decodedHashes)
      cur.decodedHashes = {};
    if (!cur.decodedHashes[hash]) {
      IM.decHash(hash);
    }
    return cur.decodedHashes[hash];
  },

  init: function(options) {
    setFavIcon('/images/fav_chat'+(window.devicePixelRatio >= 2 ? '_2x' : '')+'.ico?1');

    ge('content').appendChild(ce('iframe', {id: 'transport_frame', src: options.transport_frame}));

    extend(cur, options, {
      deletedRows: {},
      module: 'im',
      unreadMsgs: 0,
      lastOperation: 0,
      errorTimeout: 1,
      filterTO: 0,
      titleTO: 0,
      wasFocused: 0,
      lastDialogsY: 0,
      lastDialogsPeer: 0,
      multi_friends: {},
      lpMode: vk.id == 13033 ? 10 : 2,
      selMsgs: [],
      selSpam: [],
      selSpamSingle: false,
      hiddenChats: {},
      deletedDialogs: {},
      myTypingEvents: {},
      typingEvents: {},
      tsDiff: options.timestamp ? Math.round((vkNow() / 1000 - options.timestamp) / 900.0) * 900 : 0,
      imInited: true,
      imEl: {
        rowsWrap: ge('im_rows_wrap'),
        rows: ge('im_rows'),
        friends: ge('im_friends'),
        head: ge('page_header'),
        nav: ge('im_nav_wrap'),
        bar: ge('im_bar'),
        cont: ge('im_content'),
        controls: ge('im_controls_wrap'),
        resizable: ge('im_footer_filler')
      },
      hideReferrer: true
    });

    if (options.left_menu) {
      var msgA = geByTag1('a', ge('l_msg'));
      if (msgA) {
        msgA.href = '/im';
      }
    }

    for (var i in cur.tabs) {
      if (i == -4) continue;
      cur.tabs[i] = extend(cur.tabs[i], {
        hash: IM.decodehash(cur.tabs[i].hash),
        msg_count: 0,
        q_offset: 0,
        q_new: {},
        q_new_cnt: 0,
        history: 0,
        unread: 0,
        auto: 0,
        new_msgs: [],
        sent: 0,
        delayed: []
      });
    }

    cur.fixedScroll = !(browser.msie && browser.version < 8 || browser.mobile);
    cur.scrollNode = browser.msie6 ? pageNode : window;
    cur.withUpload = !(browser.msie111 || browser.safari_mobile) && cur.upload_options;

    var sendBtn = ge('im_send');
    createButton(sendBtn, IM.send);
    if (!browser.mobile && sendBtn) sendBtn.onmouseover = function () {
      showTooltip(sendBtn, {
        text: cur.ctrl_submit_hint,
        className: 'im_submit_side_tt',
        slideX: -15,
        shift: cur.fixedScroll ? [244, -36, -123] : [244, -31, 500],
        hasover: 1,
        toup: 1,
        showdt: 700,
        hidedt: 700,
        onCreate: function () {
          if (radioBtns.im_submit === undefined) {
            radioBtns.im_submit = {
              els: Array.prototype.slice.apply(geByClass('radiobtn', ge('im_submit_hint_opts'))),
              val: cur.ctrl_submit ? 1 : 0
            };
          }
        }
      });
    };

    if (cur.withUpload) {
      ImUpload.init();
    }

    var r = IM.r();
    toggle('im_peer_controls_wrap', !r);
    toggle('im_sound_controls', r);
    toggle('im_more-2', cur.peer == -2 && cur.searchOffset);
    toggle('im_none-2', cur.peer == -2 && !geByTag1('tr', ge('im_log_search')));
    toggle('im_more-4', cur.peer == -4 && cur.spamOffset);
    toggle('im_none-4', cur.peer == -4 && !geByTag1('tr', ge('im_log_spam')));
    toggle(cur.imEl.bar, cur.peer != -3);
    toggle(cur.imEl.controls, cur.peer != -3);

    var sound_button = ge('im_sound');
    if (cur.sound_off = !!ls.get('sound_notify_off')) {
      val('im_sound', getLang('mail_im_sound_off'));
    }
    addEvent(sound_button, 'click', function() {
      if (cur.sound_off) {
        cur.sound_off = false;
        ls.set('sound_notify_off', 0);
        val('im_sound', getLang('mail_im_sound_on'));
      } else {
        cur.sound_off = true;
        ls.set('sound_notify_off', 1);
        val('im_sound', getLang('mail_im_sound_off'));
      }
      return false;
    });

    cur.uiNotifications = {};
    if (cur.notify_on = (!!window.webkitNotifications)) {
      cur.notify_on = (webkitNotifications.checkPermission() <= 0);
      if (ls.get('im_ui_notify_off')) {
        cur.notify_on = false;
      }
      var notify_button = ge('im_browser_notify');
      show(notify_button);
      notify_button = geByTag1('a', notify_button);
      if (!cur.notify_on) {
        notify_button.innerHTML = getLang('mail_im_notifications_off');
      }
      var enableNotify = function () {
        cur.notify_on = (webkitNotifications.checkPermission() <= 0);
        if (!cur.notify_on) {
          webkitNotifications.requestPermission(enableNotify);
        } else {
          notify_button.innerHTML = getLang('mail_im_notifications_on');
          ls.set('im_ui_notify_off', 0);
        }
      }
      addEvent(notify_button, 'click', function () {
        if (!cur.notify_on) {
          enableNotify();
        } else {
          cur.notify_on = false;
          notify_button.innerHTML = getLang('mail_im_notifications_off');
          ls.set('im_ui_notify_off', 1);
        }
        return false;
      });
    }
    addEvent(window, 'focus', IM.onWindowFocus);
    addEvent(window, 'blur', IM.onWindowBlur);

    for (var i in cur.tabs) {
      cur.tabs[i].elem = ge('im_tab' + i);
      IM.initTabEvents(i);
      IM.initTxt(i);
    }
    IM.initTabEvents(ge('im_tab_cancel_mark'));
    IM.initTabEvents(ge('im_tab_cancel_spam_mark'));

    var filter = ge('im_filter'), filterReset = ge('im_filter_reset');
    placeholderSetup(filter, {back: true});
    addEvent(filter, 'keydown keypress', function(e) {
      if (cur.peer != -2 && IM.r(cur.peer)) {
        IM.activateTab(0);
        clearTimeout(cur.filterTO);
        cur.filterTO = setTimeout(function () {
          IM.filterFriends(true);
        }, 10);
      } else if (e.keyCode == KEY.RETURN && !IM.r(cur.peer)) {
        IM.searchMessages();
      }
    });
    addEvent(filter, 'keyup', function(e) {
      toggle(filterReset, val(this));
    });
    addEvent(filter, 'focus', function() {
      cur.focused = -1;
      IM.restoreTitle();
      clearTimeout(cur.filterTO);
      IM.filterFriends(false, true);
    });
    addEvent(filter, 'blur', function() {
      cur.focused = 0;
    });
    toggle(filterReset, val(filter));
    addEvent(filterReset, 'mouseover mouseout click', function (e) {
      if (e.type != 'click') {
        if (isVisible(filterReset))
          animate(filterReset, {opacity: e.type == 'mouseover' ? 1 : 0.5}, 100);
        return;
      }
      val(filter, '');
      elfocus(filter);
      triggerEvent(filter, 'keyup');
      if (cur.peer == -2) {
        IM.searchMessages();
      }
    });
    IM.cacheFriends();

    if (cur.peer == -2) {
      IM.setFullQ(cur.searchQ);
      if (!isVisible('im_rows-2')) {
        hide('im_more-2');
        show('im_none-2');
      }
      setTimeout(elfocus.pbind('im_filter'), 0);
      IM.calendarUpdTip(cur.searchTip);
    }

    if (!cur.peer) {
      IM.filterFriends();
      setTimeout("if (!cur.peer && !ge('im_dialogs')) ge('im_filter').focus()", 0);
    } else {
      IM.updateFriends();
    }

    IM.initSound();
    IM.initEvents();
    IM.initInts();
    IM.updateTopNav();

    if (window.devicePixelRatio >= 2) {
      var customMenuOpts = {bgsprite: '/images/icons/im_actions_iconset2_2x.png?8', bgSize: '20px 300px'};
    } else {
      var customMenuOpts = {bgsprite: '/images/icons/im_actions_iconset2.png?8'};
    }
    cur.actionsMenu = initCustomMedia('chat_actions', [], customMenuOpts);
    if (!IM.r()) {
      IM.updatePeer(cur.peer, cur.tabs[cur.peer].msgs, cur.tabs[cur.peer].all_shown, 1);
      IM.applyPeer();
      IM.scrollOn();
      var chatTab;
      if (window.curFastChat && curFastChat.inited && (chatTab = curFastChat.tabs[cur.peer]) && chatTab.box && !chatTab.box.minimized) {
        chatTab.box.minimize();
        cur.hiddenChats[cur.peer] = 1;
      }
      show('soviet_im_img');
    } else {
      hide('soviet_im_img');
      if (cur.peer == -2 || cur.peer == -4) {
        IM.scrollOn();
      }
    }

    if (cur.fixedScroll) {
      var els = geByClass('top_info_wrap', ge('page_wrap'));
      each(els, function() { hide(this); });
      hide(_stlSide);
      setTimeout(function() {
        each(els, function() { hide(this); });
        hide(_stlSide);
      }, 110);
      var headH = cur.imEl.head.clientHeight,
          headT = getXY(cur.imEl.head, true)[1],
          headW = cur.imEl.head.clientWidth,
          resizableH = ls.get('im_toggler_attached' + vk.id) ? 0 : IM.getFillerHeight();
      setStyle(cur.imEl.head, {width: headW, top: headT});
      setStyle('side_bar', {top: headH + headT});
      IM.resizableSet(resizableH);
      setStyle(cur.imEl.nav, {top: headH + headT});
      setStyle(cur.imEl.rowsWrap, {height: 'auto'});
      if (cur.peer != -3) {
        addClass(bodyNode, 'im_fixed_nav');
        _fixedNav = true;
      }
      removeClass(bodyNode, 'im_fixed_nav_loading');
      hide('debuglogwrap');
    } else {
      hide('im_footer_sh', 'im_footer_filler');
      setStyle('im_resizer_wrap', {cursor: 'default', visibility: 'hidden'});
    }
    re('im_fixed_nav_progress_wrap');
    if (cur.peer == -3) {
      IM.initWrite();
    }
    IM.updateScroll();

    cur.imPeerMedias = {};
    cur.imSortedMedias = {};
    cur.imMedia = initAddMedia('im_add_media_link', 'im_media_preview', [['photo', getLang('profile_wall_photo')], ['video', getLang('profile_wall_video')], ['audio', getLang('profile_wall_audio')], ['doc', getLang('profile_wall_doc')], ['map', getLang('profile_wall_map')], ['gift', getLang('profile_wall_gift')]], {mail: 1, onCheckURLDone: IM.onUploadDone});
    val('im_media_preview', '');

    cur.imMedia.onChange = IM.onMediaChange;
    cur.imMedia.onProgress = IM.onMediaProgress;
    cur.imMedia.attachedCount = IM.attachedCount;

    cur.nav.push(function(changed, old, n, opts) {
      if (changed[0] !== undefined || n.act) return;
      if (n.sel && !IM.r(n.sel)) {
        IM.addPeer(IM.idToPeer(n.sel));
      } else if (n.email) {
        IM.addEmail(-2e9, n.email);
      } else if (n.q) {
        IM.setFullQ(n.q);
        toggle('im_filter_reset', cur.searchQ);
        IM.searchMessages();
      } else if (n.sel == -4) {
        IM.spamMessages();
      } else if (n.sel == -5) {
        IM.importantMessages();
      } else if (changed.sel !== undefined) {
        var n = changed.sel;
        IM.activateTab((n === '0' || n === '-3') ? intval(n) : -1, opts.back ? 3 : 0);
      }
      return false;
    });

    placeholderSetup('im_chat_title_input');

    cur.destroy.push(function () {
      setFavIcon('/images/favicon' + (vk.intnat ? '_vk' : 'new') + '.ico');
      clearInterval(cur.checkConnectionInt);
      clearTimeout(cur.checkTO);
      clearTimeout(cur.updateScrollTO);
      clearTimeout(cur.updateFriendsTO);
      clearTimeout(cur.filterTO);
      clearInterval(cur.titleTO);
      clearTimeout(cur.setLocTO);
      clearInterval(cur.scrollInt);
      clearInterval(cur.updateNotifierInt);
      clearTimeout(cur.scrollTO);
      clearTimeout(cur.notifyTO);
      clearTimeout(cur.correspondentsTO);
      clearInterval(cur.updateTypingInt);
      removeEvent(cur.scrollNode, 'scroll', IM.onScroll);
      removeEvent(cur.scrollNode, 'mousewheel', IM.onWheel);
      removeEvent(document, 'keydown', IM.onKey);
      removeEvent(window, 'focus', IM.onWindowFocus);
      removeEvent(window, 'blur', IM.onWindowBlur);
      removeEvent(window, 'DOMMouseScroll mousewheel', IM.onWheel);
      removeEvent(document, 'DOMMouseScroll', IM.onWheel);
      if (cur.fixedScroll) {
        each(geByClass('top_info_wrap', ge('page_wrap')), function() { show(this); });
        removeEvent(window, 'resize', IM.updateScroll);

        setStyle(cur.imEl.head, {width: '', top: ''});
        setStyle('side_bar', {top: ''});
        setStyle(cur.imEl.nav, {top: ''});
        setStyle(cur.imEl.controls, {bottom: ''});
        setStyle(cur.imEl.cont, {padding: 0});
        setStyle(cur.imEl.rowsWrap, 'height', '');

        removeClass(bodyNode, 'im_fixed_nav');
        _fixedNav = false;

        show(_stlLeft, _stlSide);
        _stlShown = 1;
        hide('im_top_sh', 'im_bottom_sh');
        show('debuglogwrap');
      }
      if (window.curFastChat && curFastChat.inited) {
        var chatTab;
        each (cur.hiddenChats, function (peer) {
          if (chatTab = curFastChat.tabs[peer]) {
            chatTab.box.unminimize();
          }
        });
      }
      delete IM.makeRequest;
      delete cur.imMakeRequest;
    });
    updGlobalPlayer();
    if (options.show_notify) {
      var ttEl = ge('im_switch_btn');
      showTooltip(ttEl, {
        content: '<div class="im_switch_notify"><div class="im_switch_notify_title">' + options.show_notify + '</div>' +
        options.show_notify_cont + '<div class="im_switch_notify_btn"><div class="button_blue">' +
        '<button onclick="ge(\'im_switch_btn\').tt.hide();">'+ options.show_notify_close + '</button>' +
        '</div></div></div><div class="im_switch_notify_pointer"></div>',
        showdt: 0,
        slide: 15,
        slideX: 0,
        shift: [0, 6, 0],
        forceup: true,
        nohide: true,
        nohideover: true,
        noload: 1
      });
      cur.switchTooltip = ttEl;
    }

    if (options.text_data || options.media_data) {
      var txt = IM.getTxt(), text = replaceEntities(options.text_data || '');
      if (cur.editable) {
        val(txt, IM.emojiToHTML(clean(text), true).replace(/\n/g, '<br/>'));
        IM.editableFocus(txt, false, true);
      } else {
        val(txt, text);
      }
      each (options.media_data || {}, function () {
        IM.onMediaChange.apply(IM, this);
      });
    } else if (!IM.r() && IM.restoreDraft(cur.peer)) {
      IM.restorePeerMedia(cur.peer);
    }
    if (browser.opera_mobile || browser.opera_mini) {
      hide('im_smile', 'imw_smile');
    }
  },

  friendOver: function(obj, keyCode) {
    if (cur.multi) {
      if (obj && obj.parentNode.id == 'im_friends_sel') {
        var cont = obj.parentNode;
      } else {
        var cont = ge('im_friends_all');
      }
    } else {
      var cont = cur.imEl.friends;
    }
    var oldEl = geByClass('im_friend_over', cont);
    var up, down;
    if (!obj) {
      obj = oldEl[0];
      if (!obj) {
        obj = cont.firstChild;
      } else do {
        if (keyCode == KEY.DOWN) {
          var objNext = obj.nextSibling;
          if (!objNext && obj.parentNode != cont) {
            obj = obj.parentNode.nextSibling;
            if (obj) {
              objNext = obj.firstChild;
            }
          } else if (objNext && !objNext.id && objNext.tagName.toLowerCase() == 'div') {
            objNext = objNext.firstChild;
          }
          obj = objNext;
          down = true;
        } else if (keyCode == KEY.UP) {
          var objPrev = obj.previousSibling;
          if (!objPrev && obj.parentNode != cont) {
            obj = obj.parentNode.previousSibling;
            if (obj && !obj.id && obj.tagName.toLowerCase() == 'div') {
              objPrev = obj.lastChild;
            } else {
              objPrev = obj;
            }
          }
          obj = objPrev;
          up = true;
        } else {
          return false;
        }
      } while (!hasClass(obj, 'im_friend') && obj);
      if (!obj || !hasClass(obj, 'im_friend')) return;
    }
    if (hasClass(obj, 'im_friend_over')) {
      return;
    }
    var pos = getXY(obj)[1];

    var scrH = window.innerHeight || document.documentElement.clientHeight;
    var scrY = scrollGetY(true);
    if (keyCode && pos > scrY + scrH - 60) {
      scrollToY(pos - scrH + 100, 120);
    }
    if (keyCode && pos < scrY + 130) {
      scrollToY(pos - 130, 120);
    }
    for(var i in oldEl) {
      removeClass(oldEl[i], 'im_friend_over');
    }
    addClass(obj, 'im_friend_over');
  },

  onWindowFocus: function () {
    // debugLog('focus', __afterFocus);
    if (!__afterFocus) return; // opera fix
    if (cur.id != vk.id) {
      nav.reload({force: true});
      return;
    }
    var peer = cur.peer;
    if (cur.wasFocused) {
      cur.focused = cur.wasFocused;
    } else if (peer) {
      cur.focused = peer;
    } else {
      cur.focused = -1;
    }
    // debugLog(peer, scrollGetY(true), cur.deletedDialogs);
    if (peer == -1 && scrollGetY(true) < 100) {
      var hasDel = false;
      each (cur.deletedDialogs, function (k, v) {
        if (v) {
          hasDel = true;
          return false;
        }
      });
      // debugLog(hasDel);
      if (!hasDel) IM.updateDialogs();
    } else if (!IM.r() && IM.restoreDraft(peer)) {
      IM.restorePeerMedia(peer);
    } else if (cur.peer == -3) {
      IM.restoreWriteDraft();
    }
    IM.restoreTitle();
    IM.updateScroll();
    IM.readLastMsgs();
  },
  onWindowBlur: function (e) {
    debugLog('blur');
    cur.wasFocused = cur.focused;
    cur.focused = 0;
  },

  getFillerHeight: function () {
    var winH = lastWindowHeight,
        headH = cur.imEl.head.clientHeight,
        imNavH = cur.imEl.nav.offsetHeight;

    // debugLog(winH, headH, imNavH);

    return Math.max(0, Math.min(winH - headH - imNavH - 350, winH * 0.4) - 100);
  },

  initEvents: function () {
    addEvent(cur.scrollNode, 'scroll', IM.onScroll);

    addEvent(window, 'DOMMouseScroll mousewheel', IM.onWheel);
    addEvent(document, 'DOMMouseScroll', IM.onWheel);

    addEvent(document, browser.opera ? 'keypress' : 'keydown', IM.onKey);
    if (cur.fixedScroll) {
      addEvent(window, 'resize', IM.updateScroll);
      addEvent('im_resizer_wrap', 'mousedown', IM.onResizeStart);
      addEvent('im_resizer_wrap', 'dblclick', IM.toggleResize);
    } else {
      addEvent(cur.imEl.rows, 'scroll', IM.onScrollIE);
      addEvent(cur.imEl.rows, 'mousewheel', function (e) {
        if (this.scrollHeight <= this.clientHeight) return;
        if (!this.scrollTop && e.wheelDeltaY > 0 ||
            this.scrollTop + this.clientHeight >= this.scrollHeight && e.wheelDeltaY < 0) {
          cancelEvent(e);
          return false;
        }
        e.cancelBubble = true;
      });
    }
  },
  initInts: function () {
    cur.checkConnectionInt = setInterval(IM.checkConnection, 5000);
    cur.checkTO = setTimeout(IM.check, 1000);
    cur.updateScrollTO = setTimeout(IM.updateScroll.pbind(true), 2000);
    clearTimeout(cur.updateFriendsTO);
    cur.updateFriendsTO = setTimeout(IM.updateFriends, 300000);
    cur.updateTypingInt = setInterval(IM.updateTyping.pbind(false), 5000);
    cur.updateNotifierInt = setInterval(function () {
      ls.set('im_opened' + vk.id, vkNow());
    }, 1000);
  },

  initSound: function() {
    if (!window.Sound) {
      cur.sound = {play: function () {}, stop: function() {}};
    } else {
      cur.sound = new Sound('mp3/bb2');
    }
  },

  addEmail: function(mid, email) {
    if (!cur.peer) {
      val('im_filter', '');
      hide('im_filter_reset');
    }
    var params = {act: 'a_email_start', peer: mid};
    if (email) {
      params['email'] = email;
    }

    ajax.post('al_im.php', params, {
      onDone: function (res) {
        if (res.peer && cur.tabs[res.peer]) {
          IM.activateTab(res.peer);
        } else {
          IM.addTab(res.peer, res.tab, res.name, res.photo, res.hash, 0, res.data);
          IM.updateScroll();
          cur.tabs[res.peer].history = false;
          IM.activateTab(res.peer);
        }
        cur.emails[res.peer+'_'] = res.name;
        IM.cacheFriends();
        IM.attachMsgs();
      },
      onFail: function (text) {
        setTimeout(showFastBox({title: getLang('global_error')}, text, getLang('global_close')).hide, 4500);
        return true;
      }
    });
  },

  getTextForPeer: function(peer) {
    val(IM.getTxt(peer), val(IM.getNewTxt()));
    var title = val('imw_title'), meds = cur.imwMedia ? cur.imwMedia.getMedias() : [];
    if (title) {
      show('im_title_wrap' + peer);
      val('im_title' + peer, title);
    }
    cur.mediaToAdd = [];
    for (var i = 0, l = meds.length; i < l; ++i) {
      var m = meds[i], media = cur.imwMediaSaved[m[0] + m[1]];
      if (media) {
        cur.mediaToAdd.push(media);
      }
    }
    IM.clearWrite();
    if (cur.mediaToAdd.length) {
      setTimeout(function() {
        for (var i in cur.mediaToAdd) {
          var media = cur.mediaToAdd[i];
          IM.onMediaChange(media[0], media[1], media[2]);
        }
        cur.mediaToAdd = false;
      }, 0);
    }
  },
  addPeer: function(mid, events, dont_activate, getText, msgId) {
    if (IM.r(mid) || cur.tabs === undefined) {
      return;
    }
    if (!cur.peer) {
      val('im_filter', '');
      hide('im_filter_reset');
    }

    if (cur.tabs[mid] && cur.tabs[mid].loading) {
      if (!events && !dont_activate) {
        cur.tabs[mid].activate = true;
      }
      if (isArray(events) && events.length) {
        cur.tabs[mid].events = (cur.tabs[mid].events || []).concat(events);
      }
      return;
    }
    if (cur.peer == -1) {
      cur.lastDialogsY = scrollGetY(true);
      cur.lastDialogsPeer = mid;
    }
    if (cur.tabs[mid] && !events) {
      if (getText) {
        IM.getTextForPeer(mid);
      }
      if (!dont_activate) {
        IM.activateTab(mid, false, msgId);
        IM.attachMsgs();
      }
      return;
    }
    var activate = !events && !dont_activate;
    var start = vkNow();
    var doAdd = function(mid, tab, name, photo, hash, sex, data) {
      if (cur.debug) debugLog('fetched in ', vkNow() - start);
      var r = ge('im_dialog' + mid);
      if (r) removeClass(r, 'dialogs_row_over');
      var wasBottom = cur.bottom;
      IM.addTab(mid, tab, name, photo, hash, sex, data);
      IM.updateScroll();
      if (getText) {
        IM.getTextForPeer(mid);
      }
      if (events) {
        IM.feed(mid, events);
      }
      cur.tabs[mid].history = false;
      if (activate) {
        IM.activateTab(mid, false, msgId);
        IM.attachMsgs();
        IM.scrollOn(false);
      } else if (wasBottom) {
        IM.scrollOn(false);
      }
      if (!cur.prev_peer && cur.peer != mid) {
        cur.prev_peer = mid;
        IM.updateTopNav();
      }
    }
    if (cur.friends[mid + '_']) {
      var mem = cur.friends[mid + '_'];
      doAdd(mid, mem[1], mem[3], mem[2], mem[4], mem[5]);
    } else {
      cur.tabs[mid] = {loading: 1, activate: activate, events: events};
      ajax.post('al_im.php', {act: 'a_start', peer: mid}, {
        onDone: function (response) {
          activate = cur.tabs[mid].activate;
          events = cur.tabs[mid].events;
          delete cur.tabs[mid];
          doAdd(mid, response.tab, response.name, response.photo, response.hash, response.sex, response.data);
        },
        onFail: function () {
          delete cur.tabs[mid];
        }
      });
    }
  },

  initTabEvents: function(tabEl) {
    if (!tabEl) {
      return;
    }
    if (!tabEl.className) {
      var mid = tabEl;
      tabEl = cur.tabs[mid].elem;
      addEvent(tabEl, 'click', function() { IM.activateTab(mid); });
    }
    var labelEl = geByClass1('im_tab2', tabEl), xEl = geByClass1('im_tabx', labelEl);

    addEvent(tabEl, 'mouseover', function () {
      addClass(tabEl, 'im_tab_over');
    });
    addEvent(tabEl, 'mouseout', function () {
      removeClass(tabEl, 'im_tab_over');
    });

    addEvent(xEl, 'mouseover', function () {
      addClass(this, 'im_tabx_over');
    });
    addEvent(xEl, 'mouseout', function () {
      removeClass(this, 'im_tabx_over');
    });
  },

  closeTab: function(peer) {
    if (cur.peer == peer) {
      if (cur.prev_peer && cur.prev_peer != peer && cur.tabs[cur.prev_peer]) {
        IM.activateTab(cur.prev_peer);
      } else {
        var sibling = ge('im_tab' + peer).previousSibling;
        while (sibling && (!sibling.tagName || sibling.tagName.toLowerCase() != 'div')) {
          sibling = sibling.previousSibling;
        }
        if (!sibling) {
          var sibling = ge('im_tab' + peer).nextSibling;
          while (sibling && (!sibling.tagName || sibling.tagName.toLowerCase() != 'div')) {
            sibling = sibling.nextSibling;
          }
        }
        IM.activateTab(sibling ? intval(sibling.id.substr(6)) : -1);
      }
    }
    if (cur.tabs[peer]) {
      delete cur.tabs[peer].txt;
      delete cur.tabs[peer];
    }
    re('im_tab' + peer);
    re('im_txt_wrap' + peer);
    re('im_rows' + peer);
    if (cur.prev_peer == peer) {
      cur.prev_peer = 0;
    }
    IM.updateUnreadMsgs();
    IM.updateTopNav();
    IM.updateScroll();
    IM.updateLoc();
  },

  updateTopNav: function () {
    var cl = 'active_link', p = cur.peer;

    toggleClass('tab_friends', cl, (p == 0));

    toggleClass('tab_dialogs', cl, (p == -1));

    toggleClass('tab_search', cl, (p == -2));
    setStyle('tab_search', {display: cur.lastSearchQ ? 'block' : ''});

    toggleClass('tab_write', cl, (p == -3));
    setStyle('tab_write', {display: cur.lastWasIMW ? 'block' : ''});

    toggleClass('tab_spam', cl, (p == -4));
    toggleClass('tab_important', cl, (p == -5));

    toggleClass('tab_conversation', cl, !IM.r(p));

    var top_peer = !IM.r() ? p : cur.prev_peer || 0;
    if (IM.r(top_peer)) {
      for (top_peer in cur.tabs) {
        break;
      }
    }
    if (!IM.r(top_peer) && ge('im_tab' + top_peer)) {
      var conversationEl = ge('tab_conversation');
      show(conversationEl);
      ge(conversationEl).onclick = function () {
        if (IM.r()) {
          if (!IM.r(top_peer)) {
            if (cur.peer == -1) {
              cur.lastDialogsY = scrollGetY(true);
            }
            IM.activateTab(top_peer);
          } else {
            setStyle(conversationEl, 'display', '');
          }
        }
        return false;
      };
    } else {
      setStyle('tab_conversation', 'display', '');
    }
    val('im_write', getLang(p || cur.multi ? 'mail_show_flist' : 'mail_im_write_multi'));
    toggle('im_filter_out', p != -4 && IM.r() || !!cur.qPeerShown);
    toggle('im_write_btn', p != -2 && !cur.qPeerShown);
    toggle('im_search_cancel', (p == -2) || !!cur.qPeerShown);
    val('im_search_cancel', getLang(cur.qPeer ? ((cur.qPeer > 2e9) ? 'mail_back_to_conv' : 'mail_back_to_dialog') : 'global_cancel'));
    toggle('im_search_btn', (p == -2) || !!cur.qPeerShown);
    toggle('im_datesearch_wrap', (p == -2) || !!cur.qPeerShown);
    toggle('im_tabs', !IM.r() && !cur.selMsgs.length && !cur.qPeerShown);
    toggle('im_log_controls', !IM.r() && cur.selMsgs.length);
    toggle('im_spam_controls', p == -4 && cur.selSpam.length);
    toggle('im_spam_flush', p == -4 && !cur.selSpam.length);
    toggle('im_write', p != 0 || !cur.multi && !cur.multi_appoint);
    toggle('im_top_multi', p > 2e9 && cur.tabs[p].data.top_controls);
    toggle('im_important_btn', p == -1 && intval(val('im_important_count')));
    showBackLink(p != -1 ? 'im?sel=-1' : false, getLang('mail_im_back_to_dialogs'), 1);
    cur._noUpLink = (p > 0 || p < -2e9);
  },
  resetStyles: function() {
    cur.imEl.head.style.left = ge('side_bar').style.left =
    cur.imEl.nav.style.left = cur.imEl.controls.style.left = '';
  },
  updateScroll: function (e, noev) {
    var winH = Math.max(intval(window.innerHeight), intval(document.documentElement.clientHeight)),
        headH = cur.imEl.head.clientHeight,
        imNavH = cur.imEl.nav.offsetHeight,
        imControlsH = cur.imEl.controls.offsetHeight,
        contentY = headH + imNavH;

    if (!cur.fixedScroll) {
      if (IM.r()) {
        setStyle(cur.imEl.rows, {height: '', overflow: ''});
      } else {
        setStyle(cur.imEl.rows, {
          height: 500,
          overflow: 'auto'
        });
        setStyle('im_peer_controls', {
          paddingLeft: 68 - (cur.imEl.rows.scrollHeight > cur.imEl.rows.clientHeight ? sbWidth() : 0)
        });
      }
    } else {
      var st = scrollGetY(true),
          stUpd = false;

      if (!IM.r(cur.peer) || cur.peer == -2 || cur.peer == -4 || cur.peer == -5) { // spam and search
        var curHeight = cur.imEl.rows.clientHeight,
            rowsEl = ge('im_rows' + (cur.peer == -5 ? -2 : cur.peer)),
            newHeight = rowsEl.clientHeight;

        newHeight = Math.max(newHeight, winH - imControlsH - contentY - 1);

        setStyle(cur.imEl.rows, {height: newHeight});
        if (e !== true && newHeight != curHeight) {
          st += newHeight - curHeight;
          stUpd = true;
        }

        if (IM.r(cur.peer)) {
          setStyle(rowsEl, {minHeight: winH - imControlsH - contentY - 21});
        }
      } else {
        setStyle(cur.imEl.rows, {height: 'auto'});
      }

      var paddingBottom = Math.max(imControlsH, winH - contentY - cur.imEl.rowsWrap.offsetHeight - 1),
          prevPaddTop = getStyle(cur.imEl.cont, 'paddingTop'),
          prevPaddBottom = getStyle(cur.imEl.cont, 'paddingBottom'),
          prevPadd = (getStyle(cur.imEl.cont, 'padding') || '').split(' ');

      if (prevPadd.length == 3) {
        if (!prevPaddTop) {
          prevPaddTop = prevPadd[0];
        }
        if (!prevPaddBottom) {
          prevPaddBottom = prevPadd[2];
        }
      }
      prevPaddTop = intval(prevPaddTop);
      prevPaddBottom = intval(prevPaddBottom);

      cur.lastContentH = contentY + imControlsH + 20;
      if (cur.peer != -3) {
        setStyle(cur.imEl.cont, {padding: contentY + 'px 0 ' + paddingBottom + 'px'});
      } else {
        setStyle(cur.imEl.cont, {padding: ''});
      }

      if (prevPaddTop && prevPaddTop != contentY && (!cur.bottom || contentY > prevPaddTop)) { // Chrome workaround
        st += contentY - prevPaddTop;
        stUpd = true;
      }

      if (stUpd) {
        scrollToY(st, 0);
      }

      if (!browser.mozilla && !browser.msie && cur.lastWW !== lastWindowWidth) {
        cur.lastWW = lastWindowWidth;
        var goodLeft1 = ge('page_layout').offsetLeft, goodLeft2 = goodLeft1 + cur.imEl.cont.offsetLeft;
        cur.imEl.head.style.left = ge('side_bar').style.left = goodLeft1 + 'px';
        cur.imEl.nav.style.left = cur.imEl.controls.style.left = goodLeft2 + 'px';
        setTimeout(IM.resetStyles, 0);
      }

      if (!noev) {
        if (e && e !== true && e.type == 'resize') {
          IM.panelToTop();
        } else {
          IM.onScroll();
        }
      }
    }
  },
  panelToTop: function (noReset) {
    // debugLog('panel to top', noReset, cur.isPanelToTop);
    if (!noReset) {
      clearTimeout(cur.panelResetTo);
      cur.panelResetTo = setTimeout(IM.panelReset, 1000);
    }

    if (cur.isPanelToTop) {
      var diff = (lastWindowHeight - cur.lastWinH), h = Math.max(0, cur.oldResizableH + diff);
      if (diff) {
        IM.resizableSet(h);
      }
      return;
    }
    cur.oldResizableH = cur.imEl.resizable.clientHeight;
    if (!cur.oldResizableH) {
      if (cur.wasBottom === undefined) {
        cur.wasBottom = cur.bottom;
      }
      if (cur.wasBottom) {
        IM.scroll();
      }
      return;
    }
    cur.isPanelToTop = true;
    var winH = Math.max(intval(window.innerHeight), intval(document.documentElement.clientHeight));
    cur.lastWinH = winH;
    setStyle(cur.imEl.controls, {
      bottom: '',
      top: winH - cur.imEl.controls.offsetHeight + 2
    });
  },
  panelReset: function () {
    // debugLog('panel reset', cur.isPanelToTop);
    if (!cur.isPanelToTop) return;
    cur.isPanelToTop = false;
    delete cur.wasBottom;
    var winH = Math.max(intval(window.innerHeight), intval(document.documentElement.clientHeight)),
        diff = winH - cur.lastWinH,
        h = Math.max(0, Math.min(0.4 * winH, winH + cur.oldResizableH + diff - cur.lastContentH, cur.oldResizableH + diff));
    if (diff) {
      IM.resizableSet(h);
    }
    setStyle(cur.imEl.controls, {
      bottom: '-2px',
      top: ''
    });
    setTimeout(IM.updateScroll, 0);
  },
  panelUpdate: function (active) {
    if (IM.r() || cur.resizableH === undefined) {
      IM.panelReset();
      return;
    }
    var txt = IM.getTxt(),
        peerTxtH = txt.clientHeight,
        offset = peerTxtH - 48,
        resizableH = Math.max(0, cur.resizableH - offset);

    cur.oldResizableH += resizableH - cur.imEl.resizable.clientHeight;
    // debugLog('panel update set h', resizableH, cur.resizableH, offset);
    setStyle(cur.imEl.resizable, 'height', resizableH);
    if (active && offset < cur.resizableH) {
      IM.panelToTop(true);
    } else {
      IM.panelReset();
    }
  },
  onScroll: function () {
    var winH = lastWindowHeight,
        contentST = scrollGetY(true),
        contentSH = Math.max(bodyNode.scrollHeight, pageNode.scrollHeight, scrollNode.scrollHeight),
        cont = cur.imEl.cont,
        contOH = cont.offsetHeight,
        controlsH = cur.imEl.controls.offsetHeight;

    if (IM.r() && cur.peer != -2 && cur.peer != -3 && cur.peer != -4 && cur.peer != -5) { // Show more in case of friends or dialogs
      var moreEl = cur.peer ? ge('im_more_dialogs') : ge('im_more_friends');
      if (moreEl && isVisible(moreEl) && moreEl.offsetTop < contentST + winH + 200) {
        moreEl.onclick();
      }
    }
    if (!cur.fixedScroll) {
      hide('im_top_sh', 'im_bottom_sh');
      return;
    }
    if ((!IM.r() || cur.peer == -2 || cur.peer == -4 || cur.peer == -5) && !curBox() && !isVisible(layerBG)) {
      var moreEl = ge('im_more' + (cur.peer == -5 ? -2 : cur.peer)), moreNewEl = (cur.tabs[cur.peer] || {}).q_offset ? ge('im_morenew' + cur.peer) : false;
      if (moreEl && isVisible(moreEl) && contentST < 300) {
        moreEl.onclick();
      } else if (moreNewEl && isVisible(moreNewEl) && moreNewEl.offsetTop < contentST + winH + 200) {
        moreNewEl.onclick();
      }
    }
    toggle('im_top_sh', contentST > 2);
    cur.bottom = contentST >= contentSH - winH - 2;
    toggle('im_bottom_sh', !cur.bottom);
    if (contentST > 30 && cur.switchTooltip && cur.switchTooltip.tt && cur.switchTooltip.tt.hide) {
      cur.switchTooltip.tt.hide();
    }
  },
  onWheel: function () {
    clearInterval(cur.scrollInt);
    clearTimeout(cur.scrollTO);
  },

  onScrollIE: function () {
    if (IM.r()) return;

    var sh = cur.imEl.rows.scrollHeight,
        ch = cur.imEl.rows.clientHeight,
        st = cur.imEl.rows.scrollTop,
        scrollable = ch < sh;
    toggle('im_top_sh', scrollable && st);
    toggle('im_bottom_sh', scrollable && st + ch < sh);
  },
  toggleResize: function (e) {
    var curH = cur.imEl.resizable.clientHeight,
        newH = curH ? 0 : IM.getFillerHeight(),
        curSt = scrollGetY(true),
        newSt = curSt + 2 * (newH - curH);

    IM.resizableSet(newH);
    scrollToY(newSt, 0);
    triggerEvent(document, 'mouseup');
    IM.updateScroll();
    IM.scroll();
  },

  onResizeStart: function (e) {
    if (IM.r()) return;
    if (cur.focused == cur.peer) {
      try {
        IM.getTxt().blur();
      } catch (e) {}
    }
    cur.resizeStartY = e.clientY;
    cur.resizeStartH = cur.imEl.resizable.clientHeight;
    cur.resizeStartScroll = scrollGetY(true);
    cur.emMove = undefined;

    var cb = function (e) {
      setStyle(bodyNode, 'cursor', '');
      removeEvent(document, 'mouseup', cb);
      removeEvent(document, 'mousemove', IM.onResize);
      removeEvent(document, 'drag', IM.onResize);
      // IM.onResize(e);
    };
    setStyle(bodyNode, 'cursor', 's-resize');
    addEvent(document, 'mouseup', cb);
    addEvent(document, 'mousemove', IM.onResize);
    addEvent(document, 'drag', IM.onResize);
    return cancelEvent(e);
  },

  onResize: function (e) {
    var diff = e.clientY - cur.resizeStartY,
        h = cur.resizeStartH - diff,
        scroll = !!diff;

    if (h < 20) {
      h = 0;
      scroll = false;
    } else if (h > 0.4 * lastWindowHeight) {
      h = 0.4 * lastWindowHeight;
      scroll = false;
    }

    IM.resizableSet(h);
    if (scroll) {
      scrollToY(cur.resizeStartScroll - diff, 0);
    }
    IM.updateScroll();

    cancelEvent(e);
    return false;
  },

  resizableSet: function (h) {
    // debugLog('resizable set', h);
    setStyle(cur.imEl.resizable, 'height', h);
    if (!IM.r()) {
      h -= IM.getTxt().clientHeight - 48;
    }
    cur.resizableH = h;
    ls.set('im_toggler_attached' + vk.id, !h);
  },

  onKey: function (e) {
    var inputActive = (e.target.tagName == 'INPUT' || e.target.tagName == 'TEXTAREA' || hasClass(e.target, 'im_editable') || e.target.getAttribute('contenteditable'));

    if (e.keyCode > 47 && e.keyCode < 58) { // 0 - 9 keys for tab switching
      var num = e.keyCode - 49, i = 0;
      e = e.originalEvent || e;
      if (browser.safari ? e.ctrlKey : (browser.mac ? (e.metaKey || e.ctrlKey) : (e.altKey || e.metaKey || e.ctrlKey))) {
        if (num == -1) num = 9;
        each(ge('im_tabs').childNodes, function () {
          if (this.className.indexOf('im_tab')) return;
          if (i == num) {
            IM.activateTab(this.id.match(/-?\d+/)[0]);
            return false;
          }
          i++;
        });
        return cancelEvent(e);
      }
    }
    if (e.keyCode == KEY.UP || e.keyCode == KEY.DOWN) {
      if (!IM.emojiMove(e)) {
        return false;
      }
      if (cur.peer == 0) {
        IM.friendOver(false, e.keyCode);
        return cancelEvent(e);
      }
    } else if (e.keyCode == 13 && (cur.peer == 0 || cur.peer == -2)) {
      var el = geByClass1('im_friend_over', cur.multi ? ge('im_friends_all') : cur.imEl.friends, 'div');
      if (cur.peer == -2 || (cur.searchQ || cur.qDay) && !el) {
        if (!cur.peer) {
          cur.qDay = cur.qPeer = cur.qPeerShown = false;
        }
        IM.searchMessages();
      } else if (el) {
        if (e.target.blur) {
          e.target.blur();
        }
        setTimeout(el.onclick, 0);
        return cancelEvent(e);
      }
    } else if ((e.keyCode == KEY.PAGEUP || e.keyCode == KEY.PAGEDOWN) && !e.ctrlKey && !e.metaKey && !browser.opera) {
      var scrollStep = lastWindowHeight - cur.imEl.head.clientHeight - cur.imEl.nav.offsetHeight - cur.imEl.controls.offsetHeight,
          st = scrollGetY(true);

      scrollToY(st + (e.keyCode == KEY.PAGEUP ? -1 : 1) * scrollStep, 0);
      return cancelEvent();

    } else if (e.keyCode > 40 && !e.ctrlKey && !e.metaKey && !inputActive) {
      if (cur.editable && !IM.r()) {
        IM.editableFocus(ge('im_editable' + cur.peer), false, true);
      } else {
        var el = ge(!IM.r() ? 'im_txt' + cur.peer : 'im_filter');
        !el.active && elfocus(el);
      }
    } else if (e.keyCode == 9 && !e.ctrlKey) {
      var editableId = (cur.peer == -3) ? 'imw_editable' : 'im_editable' + cur.peer;
      if (e.target.id == editableId && !cur.emojiShown) {
        IM.ttEmoji(ge((cur.peer == -3) ? 'imw_smile' : 'im_smile'), false, true);
        cur.emojiFocused = true;
        return cancelEvent(e);
      } else if (cur.emojiShown) {
        IM.editableFocus(ge(editableId), false, true);
        IM.ttEmoji(ge((cur.peer == -3) ? 'imw_smile' : 'im_smile'), true);
        return cancelEvent(e);
      }
    } else if (e.keyCode == KEY.LEFT || e.keyCode == KEY.RIGHT) {
      if (!IM.emojiMove(e)) {
        return false;
      }
    } else if (e.keyCode == KEY.ESC) {
      if (cur.emojiShown) {
        IM.editableFocus(IM.getTxt(cur.peer), false, true);
        IM.ttEmoji(ge((cur.peer == -3) ? 'imw_smile' : 'im_smile'), true);
        cur.emojiFocused = false;
      }
    } else if (e.keyCode == KEY.ENTER) {
      if (!IM.emojiEnter(e)) {
        return false;
      }
    }
    return true;
  },
  emojiEnter: function(e) {
    if (cur.emojiFocused && cur.emojiOvered) {
      var img = geByTag1('img', cur.emojiOvered);
      IM.addEmoji(img.getAttribute('emoji'), cur.emojiOvered);
      cur.emojiFocused = true;
      IM.ttEmoji(ge((cur.peer == -3) ? 'imw_smile' : 'im_smile'), true);
      return cancelEvent(e);
    }
    return true;
  },
  emojiMove: function(e) {
    if (cur.emojiShown && cur.emojiFocused) {
      var el = cur.emojiOvered;
      switch (e.keyCode) {
        case KEY.LEFT:
          el = el.previousSibling;
          break;
        case KEY.RIGHT:
          el = el.nextSibling;
          break;
        case KEY.UP:
          var i = 9;
          while (el.previousSibling && --i > 0) {
            el = el.previousSibling;
          }
          if (i > 1) {
            return cancelEvent(e);
          }
          break;
        case KEY.DOWN:
          var i = 9;
          while (el.nextSibling && --i > 0) {
            el = el.nextSibling;
          }
          if (i > 1) {
            return cancelEvent(e);
          }
          break;
      }
      if (el) {
        if (!cur.emojiList) {
          cur.emojiList = ge('im_emoji_list')
        }
        var diff = el.offsetTop - cur.emojiList.scrollTop;
        debugLog('offset', diff);
        if (diff > 72) {
          animate(cur.emojiList, {scrollTop: cur.emojiList.scrollTop + (diff - 72)}, 80, function() {
            cur.emojiScroll.update(true, true)
          });
        } else if (diff < 0) {
          animate(cur.emojiList, {scrollTop: cur.emojiList.scrollTop + diff}, 80, function() {
            cur.emojiScroll.update(true, true)
          });
        }
        IM.emojiOver(el);
      }
      return cancelEvent(e);
    }
    return true;
  },

  activateTab: function(peer, from, msgId) {
    // from 1 - click, 2 - create multichat with current peer, 3 - from back
    var txtFocus = cur.editable ? "IM.editableFocus(ge('im_editable' + cur.peer), false, true)" : "elfocus('im_txt' + cur.peer)";
    if (!IM.r(peer)) {
      if (cur.uiNotifications[peer]) {
        cur.uiNotifications[peer].cancel();
        cur.uiNotifications[peer] = false;
      }
    }
    if (cur.peer == peer) {
      if (peer == -1) {
        if (scrollGetY(true) > 100) {
          scrollToY(0, 0);
        }
        IM.updateDialogs(true);
      } else if (!peer && from) {
        cur.multi = true;
        cur.multi_friends = {};
        IM.updateTopNav();
        IM.updateFriends(true);
        setTimeout("if (!cur.peer) ge('im_filter').focus()", browser.msie ? 100 : 0);
      } else if (msgId) {
        IM.loadHistory(peer, 0, msgId);
      }
      return;
    }

    cur.multi = false;
    cur.multi_friends = {};
    cur.multi_appoint = from == 2 ? cur.peer : false;

    clearTimeout(cur.scrollTO);
    var old_peer = cur.peer;
    cur.prev_tab = old_peer;

    if (peer != -2 && (cur.qPeerShown || old_peer == -2)) {
      val(geByClass1('input_back_content', domPS(ge('im_filter'))), getLang('mail_im_filter_friend_intro'));
    } else if (peer == -2) {
      val(geByClass1('input_back_content', domPS(ge('im_filter'))), getLang('mail_search_placeholder'));
    }
    if (cur.qPeerShown && cur.qPeerShown != peer) {
      delete(cur.qPeerShown);
    }

    if (!IM.r(old_peer)) {
      var progressNode = ge('im_progress_preview');
      if (progressNode.childNodes.length > 0) {
        showFastBox(getLang('global_error'), getLang('mail_message_wait_until_uploaded'));
        return false;
      }
      cur.prev_peer = old_peer;
      if (!cur.fwdFromPeer && cur.selMsgs.length) {
        IM.uncheckLogMsgs();
      }
      var tab = cur.tabs[old_peer] || {};
      if (cur.bottom) {
        delete tab.lastScrollTop;
      } else {
        tab.lastScrollTop = scrollGetY(true);
      }
      IM.panelUpdate(false);
    } else if (old_peer == -4) {
      IM.uncheckSpamMsgs();
    } else if (old_peer == -2) {
      cur.lastSearchScroll = scrollGetY(true);
    } else if (old_peer == -5) {
      cur.lastImportantScroll = scrollGetY(true);
    }

    if (!IM.r(old_peer)) {
      geByClass('im_tabx', cur.tabs[old_peer].elem)[0].style.backgroundColor = '';
      ge('im_tab' + old_peer).className = 'im_tab';
    }

    if (!IM.r(peer)) {
      geByClass('im_tabx', cur.tabs[peer].elem)[0].style.backgroundColor = '';
      ge('im_tab' + peer).className = 'im_tab_selected';
    }

    var r = IM.r(peer);
    if (r || IM.r(old_peer)) {
      toggle('im_peer_controls_wrap', !r);
      toggle('im_sound_controls', r);
      try {
        __adsUpdate('force');
      } catch (e) {
        topError(e, {dt: -1, type: 5, answer: ''});
      }
    }

    if (!IM.r(old_peer)) {
      hide('im_txt_wrap' + old_peer);
    } else if (old_peer == -3) {
      IM.deinitWrite();
    }
    if (!IM.r(cur.peer = peer)) {
      cur.tabs[peer].auto = 0;
      show('im_txt_wrap' + peer);
      IM.restoreDraft(peer);
      IM.restorePeerMedia(peer);

      var chatTab;
      if (window.curFastChat && curFastChat.tabs && (chatTab = curFastChat.tabs[peer])) {
        chatTab.box.minimize();
        cur.hiddenChats[peer] = 1;
      }
      !browser.mobile && setTimeout('if (!IM.r()) ' + txtFocus, browser.msie ? 100 : 0);
    } else if (!peer) {
      cur.lastSearchQ = cur.searchQ = '';
      cur.qDay = false;
      if (cur.imDP) cur.imDP.hide();
      val('im_filter', '');
      hide('im_filter_reset');
      setTimeout("if (!cur.peer) ge('im_filter').focus()", browser.msie ? 100 : 0);
      IM.updateFriends(true);
    } else if (peer == -1) {

    } else if (peer == -2 && cur.lastSearchQ) {
      val('im_filter', cur.searchQ = cur.lastSearchQ);
      toggle('im_filter_reset', cur.searchQ);
      !browser.mobile && elfocus('im_filter');
    } else if (peer == -3) {
      IM.initWrite();
    }

    IM.updateMoreNew(peer);

    var oldRowsEl = ge('im_rows' + (old_peer == -5 ? -2 : old_peer));
    var newRowsEl = ge('im_rows' + (peer == -5 ? -2 : peer));

    revertLastInlineVideo(oldRowsEl)
    hide(oldRowsEl);
    show(cur.imEl.rows.appendChild(newRowsEl)); // chrome performance bug workaround

    IM.applyPeer();
    IM.updateTopNav();
    IM.updateUnreadMsgs();
    IM.updateLoc();

    if (!IM.r(peer)) {
      if (!cur.tabs[peer].history || msgId) {
        IM.loadHistory(peer, 0, msgId);
      } else {
        IM.updateScroll(true, true);
      }
      IM.readLastMsgs();
    } else {
      IM.updateScroll(true, (peer == -2 || peer == -5));
      if (peer == -1) {
        var st = cur.lastDialogsY, mid = cur.lastDialogsPeer;
        cur.lastDialogsY = 0;
        cur.lastDialogsPeer = 0;
        if (from == 3 && st > 100) {
          setTimeout(scrollToY.pbind(st, 0), 0);
          return;
        } else {
          IM.updateDialogs();
        }
      }
    }
    if (!IM.r(peer) && cur.tabs[peer].lastScrollTop !== undefined) {
      scrollToY(cur.tabs[peer].lastScrollTop, 0);
      delete cur.tabs[peer].lastScrollTop;
      IM.onScroll();
    } else if (peer == -2 && cur.lastSearchScroll !== undefined && from == 3) {
      scrollToY(cur.lastSearchScroll, 0);
      delete cur.lastSearchScroll;
      IM.onScroll();
    } else if (peer == -5 && cur.lastImportantScroll !== undefined && from == 3) {
      scrollToY(cur.lastImportantScroll, 0);
      delete cur.lastImportantScroll;
      IM.onScroll();
    } else {
      IM.scrollOn(IM.r(peer) && peer != -2 && peer != -4 && peer != -5);
    }

    IM.checkEditable(ge('im_editable' + peer));
  },
  restorePeerMedia: function (peer) {
    var conts = [
      ge('im_docs_preview'),
      ge('im_media_preview'),
      ge('im_media_dpreview'),
      ge('im_media_mpreview'),
      ge('im_sdocs_preview')
    ], tgl = [false, false, false, false, false];
    var peerMedia = cur.imPeerMedias[peer] || [],
        sortedMedia = cur.imSortedMedias[peer] || [],
        already = {}, len = 0;

    if (conts[0].sorter) {
      conts[0].sorter.destroy();
    }
    if (conts[1].usorter) {
      conts[1].usorter.destroy();
    }
    if (conts[2].qsorter) {
      conts[2].qsorter.destroy();
    }

    each(conts, function() { val(this, ''); });
    each(sortedMedia, function(k, v) {
      k = v;
      v = peerMedia[v];
      if (!v) return;
      var mediaEl = se(rs(v[3], {lnkId: cur.imMedia.lnkId, ind: k})), ind = intval(v[2]);
      if (ind < 0 || ind > 4) return;

      if (v[0] == 'audio') stManager.add(['audioplayer.css']);

      conts[ind].appendChild(mediaEl);
      tgl[ind] = true;
      ++len;
      already[k] = true;
    });
    each(peerMedia, function (k, v) {
      if (!v || already[k]) return;
      var mediaEl = se(rs(v[3], {lnkId: cur.imMedia.lnkId, ind: k})), ind = intval(v[2]);
      if (ind < 0 || ind > 4) return;

      if (v[0] == 'audio') stManager.add(['audioplayer.css']);

      conts[ind].appendChild(mediaEl);
      tgl[ind] = true;
      ++len;
    });
    each(tgl, function(k, v) { toggle(conts[k], v); });
    if (!browser.msie || browser.version > 8) {
      stManager.add(['sorter.js', 'usorter.js', 'qsorter.js'], function() {
        if (conts[0].childNodes.length > 0) {
          sorter.init(conts[0], {noscroll: 1, onReorder: IM.saveMedias.pbind(cur.peer)});
        }
        if (conts[1].childNodes.length > 1) {
          usorter.init(conts[1], {clsUp: 'im_preview_up', onReorder: IM.saveMedias.pbind(cur.peer)});
        }
        if (conts[2].childNodes.length > 1) {
          qsorter.init(conts[2], IM.qsorterOpts());
        }
      });
    }
    toggle('im_add_media', len < cur.attachments_num_max);
  },
  applyPeer: function () {
    var peer = cur.peer;

    if (IM.r(peer)) {
      val('im_peer_holders', '');
      hide('im_chat_actions');
      return;
    }
    if (cur.imMedia) {
      var selMedia = ge('add_media_menu_'+cur.imMedia.lnkId);
      var gift = geByClass1('add_media_type_'+cur.imMedia.lnkId+'_gift', selMedia);
      if (gift) {
        var oldH = isVisible(selMedia) ? getSize(selMedia.firstChild)[1] : 0;
        toggle(gift, peer > 0 && peer < 2e9);
        if (oldH && cur.imMedia.menu.reverse) {
          var diff = oldH - getSize(selMedia.firstChild)[1];
          selMedia.style.top = (intval(selMedia.style.top) + diff)+'px';
        }
      }
    }
    var user = cur.tabs[peer], user_data = user.data, acts = {}, opts = {};
    if (user.msg_count) {
      acts['search'] = getLang('mail_im_peer_search');
    }
    if (user.msg_count && !user.all_shown) {
      acts['history'] = getLang('mail_im_load_all_history');
    }
    if (peer < -2e9) {
      acts['clear'] = getLang('mail_im_delete_email_contact');
    } else if (user.msg_count) {
      acts['clear'] = getLang('mail_im_delete_all_history');
    }
    if (peer > 0 && peer < 2e9 && cur.friends[peer + '_']) {
      acts['chat'] = getLang('mail_im_create_chat_with');
    }

    if (peer > 2e9) {
      val('im_peer_holders', user_data.members_grid);
      val('im_rcpt', user_data.members_text);
      addClass(ge('im_peer_controls'), 'im_peer_multi');
      extend(acts, user_data.actions);
      var txt = IM.getTxt(peer);
      if (txt.disabled && !user_data.kicked) {
        txt.disabled = false;
        IM.txtVal(txt, '');
        if (cur.editable) {
          txt.contentEditable = 'true';
        }
        show(txt.previousSibling);
      } else if (!txt.disabled && user_data.kicked) {
        txt.disabled = true;
        IM.txtVal(txt, getLang('mail_chat_youre_kicked'));
        if (cur.editable) {
          txt.contentEditable = 'false';
        }
        hide(txt.previousSibling);
      }
      val(geByClass1('im_tab3', ge('im_tab' + peer), 'div'), user.name + '<span id="im_unread' + peer + '">' + val('im_unread' + peer) + '</span>');
    } else {
      if (peer < -2e9) {
        var peerLink = '/im?sel=e' + (-peer - 2e9);
      } else {
        var peerLink = '/id' + peer;
      }
      val('im_peer_holders', '<div class="im_peer_holder fl_l"><div class="im_photo_holder"><a href="'+peerLink+'" target="_blank"><img src="'+user.photo+'" width="50" height="50"/></a></div><div class="im_status_holder" id="im_status_holder"></div></div>');

      if (cur.friends[peer + '_']) {
        IM.updateOnline(cur.friends[peer + '_'][0], cur.friends[peer + '_'][5]);
      }
    }

    var types = [], bgpos = {'invite': 3, 'topic': -19, 'return': -107, 'leave': -84, 'history': -41, 'search': -171, 'clear': -63, 'chat': 3, 'photos': -213, 'avatar': -192};
    opts.hideItem = -1;
    opts.hideLabel = '';
    if (user.msg_count) {
      acts['photos'] = getLang('mail_im_show_media_history');
    }

    each(['chat', 'invite', 'topic', 'avatar', 'photos', 'search', 'history', 'clear', 'leave', 'return'], function(k, v) {
      if (acts[v]) {
        types.push([v, acts[v], '3px ' + bgpos[v] + 'px', IM.onActionMenu.pbind(v), false, false]);
      }
    });
    cur.actionsMenu.setOptions(opts);
    cur.actionsMenu.setItems(types);

    var hasActs = false;
    for (var i in acts) {hasActs = true; break;}
    toggle('im_chat_actions', hasActs);
    toggle('im_rcpt', peer > 2e9);
    toggleClass(ge('im_peer_controls'), 'im_peer_multi', peer > 2e9);
    IM.updateTyping(true);
  },

  addTab: function(mid, tab_text, name, photo, hash, sex, data) {
    var tab = se(rs(cur.tab_template, {peer_id: mid, peer_name: tab_text.replace(/\s+/g, '&nbsp;')})),
        txtWrap = se(rs(cur.txt_template, {peer_id: mid})),
        txt = geByTag1('textarea', txtWrap);

    cur.tabs[mid] = {name: name, tab_text: tab_text, photo: photo, hash: IM.decodehash(hash), sex: sex, msgs: {}, all_shown: 0, msg_count: 0, q_offset: 0, q_new: {}, q_new_cnt: 0, tables: 0, unread: 0, auto: 1, sent: 0, new_msgs: [], elem: ge('im_tabs').appendChild(tab), data: data || false, delayed: []};
    ge('im_texts').appendChild(txtWrap);

    IM.initTabEvents(mid);

    var text = [
'<a href="/write', mid, '?hist=1&offset=-1" target="_blank" class="im_more" id="im_more', mid, '" onclick="return IM.loadHistory(', mid, ', 1)" style="display: block;"><div class="im_more_text">', getLang('mail_im_more_history'), '</div><div class="im_more_progress">&nbsp;</div></a>',
'<table cellspacing="0" cellpadding="0" id="im_log', mid, '" class="im_log_t"><tbody></tbody></table>',
'<a href="/write', mid, '?hist=1&offset=-1" target="_blank" class="im_morenew" id="im_morenew', mid, '" onclick="return IM.loadHistory(', mid, ', -1)" style="display: none;"><div class="im_more_text">', getLang('mail_im_morenew_history'), '</div><div class="im_more_progress">&nbsp;</div></a>',
'<div class="im_none" id="im_none', mid, '">', getLang('mail_im_here_history'), '</div>',
'<div class="im_typing_wrap"><div class="im_typing" id="im_typing', mid, '"></div><div id="im_lastact', mid, '" class="im_lastact"></div></div>',
'<div class="error" style="margin: 5px; display: none" id="im_error', mid, '"></div>'
    ];
    var rows = ce('div', {className: 'im_rows im_peer_rows', id: 'im_rows' + mid, innerHTML: text.join('')}, {display: 'none'});
    cur.imEl.rows.appendChild(rows);

    IM.initTxt(mid);
    show(ge('im_tab' + mid));
    IM.updateTopNav();
    IM.updateScroll();
  },

  updateFriends: function (upd_multi) {
    if (!cur.imEl) {
      window.console && console.trace && console.trace();
      return;
    }
    if (upd_multi) {
      toggle('im_friends', !cur.multi);
      toggle('im_friends_multi', cur.multi);
      IM.multiFriends();
    }
    if (!cur.peer) IM.filterFriends();
    if (cur.friendsLoaded) {
      ajax.post('al_im.php', {act: 'a_onlines', peer: cur.peer}, {
        onDone: function (friendsOnline, cnts) {
          for (var i in cur.friends) {
            cur.friends[i][0] = intval(friendsOnline[intval(i)]);
          }
          if (!cur.peer) {
            IM.filterFriends();
          } else {
            IM.updateOnline(intval(friendsOnline[cur.peer]), (cur.tabs[cur.peer] || {}).sex || (cur.friends[cur.peer + '_'] || {})[5]);
          }
          IM.updateCounts(cnts);
        }
      });
    } else {
      if (cur.multi) return;
      ajax.post('al_im.php', {act: 'a_friends'}, {
        onDone: function (friends) {
          cur.friendsLoaded = 1;
          cur.friends = friends;
          IM.cacheFriends();
          if (!cur.peer) {
            IM.filterFriends();
          } else if (!IM.r() && cur.friends[cur.peer + '_']) {
            IM.applyPeer();
          }
        }
      });
    }
    if (cur.peer > 2e9) {
      IM.updateChat(cur.peer);
    }
    clearTimeout(cur.updateFriendsTO);
    cur.updateFriendsTO = setTimeout(IM.updateFriends, 300000);
  },

  updateDialogs: function (force) {
    var tabEl = geByClass1('tab_word', ge('tab_dialogs'), 'b');
    ajax.post('al_im.php', {act: 'a_get_dialogs', offset: 0}, {
      onDone: function (options, rows, next_rows) {
        hide('im_progress');
        if (rows) {
          var dlgs = ge('im_dialogs'), moreEl = ge('im_more_dialogs'), noneEl = ge('im_rows_none');
          dlgs.innerHTML = rows;
          dlgs.appendChild(moreEl);
          dlgs.insertBefore(noneEl, domFC(dlgs));
          if (next_rows) {
            dlgs.appendChild(ce('div', {id: 'im_dialogs_next', innerHTML: next_rows}));
            ge('im_more_dialogs').onclick = function () {
              IM.showMoreDialogs(options.offset, options.has_more);
              return false;
            };
            show(moreEl);
          } else {
            hide(moreEl);
          }
          hide(noneEl);
          show('im_dialogs_summary');
          IM.onScroll();
        }
        IM.updateCounts(options.cnts);
        cur.deletedDialogs = {};
      }
    });
    if (force) {
      show('im_progress');
    }
  },

  cacheFriends: function(q) {
    if (q) {
      if (!cur.friends_cache[q]) cur.friends_cache[q] = {};

      var queries = [q], t;
      if (t = parseLatin(q)) {
        queries.push(t);
      }
      if (t = IM.parseLatKeys(q)) {
        queries.push(t);
        if (t = IM.parseCyr(t)) {
          queries.push(t);
        }
      }
      if (t = IM.parseCyr(q)) {
        queries.push(t);
      }
      for (var i in queries) {
        query = queries[i];
        var search_in = cur.friends_cache[query.substr(0, 1).toLowerCase()];
        if (search_in) {
          query = escapeRE(query);
          for (var i in search_in) {
            if (intval(i) > 2e9) {
              var name = cur.chats[i];
            } else if (intval(i) < -2e9) {
              var name = cur.emails[i]
            } else if (cur.friends[i]) {
              var name = cur.friends[i][1].replace('&nbsp;', ' ');
            }
            if ((new RegExp('^' + query + '|\\s' + query + '|\\(' + query, 'gi')).test(name.replace(/�/g, '�'))) {
              cur.friends_cache[q][i] = 1;
            }
          }
        }
      }
    } else {
      cur.friends_cache = {};
      for (var i in cur.friends) {
        var name = cur.friends[i][1].replace('&nbsp;', ' ').replace(/�/g, '�');
        var cursor = 0, letter;
        while (1) {
          letter = name.charAt(cursor).toLowerCase();
          if (!cur.friends_cache[letter]) {
            cur.friends_cache[letter] = {};
          }
          cur.friends_cache[letter][i] = 1;
          cursor = name.indexOf(' ', cursor + 1);
          if (cursor == -1) break;
          ++cursor;
        }
      }
      for (i in cur.chats) {
        var name = cur.chats[i].replace('&nbsp;', ' ').replace(/�/g, '�');
        var cursor = 0, letter;
        while (1) {
          letter = name.charAt(cursor).toLowerCase();
          if (!cur.friends_cache[letter]) {
            cur.friends_cache[letter] = {};
          }
          cur.friends_cache[letter][i] = 1;
          cursor = name.indexOf(' ', cursor + 1);
          if (cursor == -1) break;
          ++cursor;
        }
      }
      for (i in cur.emails) {
        var name = cur.emails[i];;
        var cursor = 0, letter;
        while (1) {
          letter = name.charAt(cursor).toLowerCase();
          if (!cur.friends_cache[letter]) {
            cur.friends_cache[letter] = {};
          }
          cur.friends_cache[letter][i] = 1;
          cursor = name.indexOf(' ', cursor + 1);
          if (cursor == -1) break;
          ++cursor;
        }
      }
    }
  },

  wrapFriends: function(list, online, to_match, simpleOver) {
    var text = [], is_sel, j;
    for (var i in list) {
      j = intval(i);
      if (j > 2e9 || j < -2e9) {
        continue;
      }
      var mem = cur.friends[i] || [0, 'DELETED'];

      if (online !== 1) {
        if (online === true  && !mem[0] ||
            online === false &&  mem[0] ||
            cur.multi_friends[intval(i)])
          continue;

        if (cur.multi_appoint && cur.tabs[cur.multi_appoint].data.members[intval(i)]) {
          continue;
        }
        if (cur.friends_to_pass-- > 0) continue;

        if (++cur.friends_shown > cur.friends_to_show) {
          // var shown_txt = getLang('mail_im_friends_shown', 100);
          var shown_txt = '�������� ������ ������';
          cur.friends_last_list = list;
          cur.friends_last_match = to_match;
          text.push('<a href="#" onclick="IM.showMoreFriends(); return false;" id="im_more_friends">' + shown_txt + '</a>');
          break;
        }
      }

      var name = mem[1].replace('&nbsp;', ' ');
      if (to_match) {
        each(to_match, function() {
          var re = new RegExp("(?![^&;]+;)(?!<[^<>]*)(" + this + ")(?![^<>]*>)(?![^&;]+;)", "gi");
          name = name.replace(re, "<em>$1</em>");
        });
      }

      var txt = '<img src="' + mem[2] + '" class="fl_l" width="32" height="32"/><div class="fl_l"><nobr>' + name + '</nobr></div>';
      if (mem[0]) {
        var onl = langSex(mem[5], window.global_online_sm);
        if (mem[0] != 1) {
          onl += '<b class="mob_onl im_friend_mob_onl" onmouseover="mobileOnlineTip(this, {mid: ' + j + '})" onclick="mobilePromo(); return cancelEvent(event);"></b>'
        }
        txt += '<div class="online fl_l">' + onl + '</div>';
      }
      var cls = '';
      if (cur.isPeerFirst) {
        cls = ' im_friend_over';
        cur.isPeerFirst = false;
      }
      if (simpleOver) {
        var over = 'onmouseover="addClass(this, \'im_friend_over\');" onmouseout="removeClass(this, \'im_friend_over\');"';
      } else {
        var over = 'onmousemove="IM.friendOver(this);"';
      }

      text.push('<div class="im_friend', cls, '" id="im_friend', intval(i), '" ', over, ' onclick="IM.selectPeer(', intval(i), ')">', txt, '</div>');
    }
    return text.join('');
  },

  wrapCorrespondents: function (q, to_match) {
    clearTimeout(cur.correspondentsTO);
    cur.correspondentsTO = setTimeout(function () {
      if (q != cur.searchQ) {return;}
      ajax.post('hints.php', {act: 'a_json_friends', str: q, from: 'im'}, {
        onDone: function (correspondents) {
          if (q != cur.searchQ) {return;}
          var text = [];
          each (correspondents || [], function (i) {
            if (ge('im_friend' + this[3])) {
              return;
            }
            var name = this[1];
            each(to_match, function() {
              var re = new RegExp("(?![^&;]+;)(?!<[^<>]*)(" + this + ")(?![^<>]*>)(?![^&;]+;)", "gi");
              name = name.replace(re, "<em>$1</em>");
            });
            var txt = '<img src="' + this[2] + '" class="fl_l" width="32" height="32" /><div class="fl_l"><nobr>' + name + '</nobr></div>';
            if (this[0]) {
              txt += '<div class="online fl_l">'+langSex(0, getLang('global_online_sm'))+'</div>';
            }
            var cls = '';
            if (cur.isPeerFirst) {
              cls = ' im_friend_over';
              cur.isPeerFirst = false;
            }
            text.push('<div class="im_friend' + cls + '" id="im_friend', this[3], '" ', 'onmousemove="IM.friendOver(this);"', ' onclick="IM.selectPeer(', this[3], ')">', txt, '</div>');
          });

          var el = ge('im_correspondents');
          if (!el) {
            return;
          }
          var wrap = el.parentNode,
              has = text.length > 0,
              frag = cf(text.join(''));
          re(geByClass1('im_friend_not_found', wrap));
          re(geByClass1('im_find_in_mail', wrap));
          if (!has) {
            if (cur.multi && (!correspondents || !correspondents.length)) {
              frag.appendChild(ce('div', {className: 'im_friend_not_found', innerHTML: cur.lang.mail_im_empty_search}));
              return;
            }
          }
          if (!cur.multi) {
            if (cur.multi_appoint) {
              frag.appendChild(ce('div', {className: 'im_friend_not_found', innerHTML: getLang('mail_im_empty_search')}));
            } else {
              var cl = 'im_find_in_mail im_friend' + ((has || cur.friends_shown) ? '' : ' im_friend_over'), srch = ce('a', {
                href: '/im?q=' + encodeURIComponent(q),
                onmousemove: function() { IM.friendOver(this); },
                className: cl,
                innerHTML: getLang('mail_im_search_query').replace('{query}', '<b>' + clean(q) + '</b>'),
                onclick: IM.findClick
              });
              wrap.insertBefore(srch, wrap.firstChild);
//              frag.appendChild(srch);
            }
          }
          wrap.replaceChild(frag, el);
        },
        cache: 1
      })
    }, 100);
  },
  findClick: function(e) {
    e = e || window.event;
    if (checkEvent(e)) {
      return;
    }
    cur.qDay = cur.qPeer = cur.qPeerShown = false;
    IM.searchMessages();
    return cancelEvent(e);
  },

  wrapEmail: function (name, to_match, user_id) {
    if (!user_id) {
      user_id = -2000000000;
      if (name.split('@')[1].indexOf('.') == -1) {
        name += '...';
      }
    }
    var cls = '';
    if (cur.isPeerFirst) {
      cls = ' im_friend_over';
      cur.isPeerFirst = false;
    }
    var text = ['<div class="im_friend im_chat', cls,'" id="im_friend', user_id, '" onmousemove="IM.friendOver(this);" onclick="IM.selectPeer(', user_id, ')"><img src="/images/contact_32.gif" class="fl_l" width="32" height="32" /><div class="fl_l"><nobr>', clean(name), '</nobr></div></div>'];
    return text.join('');
  },

  wrapEmails: function (list, to_match, selected) {
    var text = [];
    var emails_list = to_match ? list : cur.emails;

    for (var i in emails_list) {
      var user_id = intval(i);
      if (to_match && user_id > -2e9) {
        continue;
      }
      if (!selected && cur.multi && cur.multi_friends[user_id]) {
        continue;
      }
      var email = cur.emails[i];

      if (cur.friends_to_pass-- > 0) continue;

      if (!selected && ++cur.friends_shown > cur.friends_to_show) {
        var shown_txt = '�������� ������ ������';
        cur.friends_last_list = list;
        cur.friends_last_match = to_match;
        text.push('<a href="#" onclick="IM.showMoreFriends(); return false;" id="im_more_friends">' + shown_txt + '</a>');
        break;
      }

      if (to_match) {
        each(to_match, function() {
          var re = new RegExp("(?![^&;]+;)(?!<[^<>]*)(" + this + ")(?![^<>]*>)(?![^&;]+;)", "gi");
          email = (email || '').replace(re, "<em>\$1</em>");
        });
      }

      var cls = '';
      if (cur.isPeerFirst) {
        cls = ' im_friend_over';
        cur.isPeerFirst = false;
      }

      if (selected) {
        var over = 'onmouseover="addClass(this, \'im_friend_over\');" onmouseout="removeClass(this, \'im_friend_over\');"';
      } else {
        var over = 'onmousemove="IM.friendOver(this);"';
      }

      text.push('<div class="im_friend im_chat',cls ,'" id="im_friend', user_id, '" ', over,' onclick="IM.selectPeer(', user_id, ')"><img src="/images/contact_32.gif" class="fl_l" width="32" height="32" /><div class="fl_l"><nobr>', email, '</nobr></div></div>');
    }
    return text.join('');
  },

  wrapChats: function (list, to_match) {
    var text = [], is_sel, chat_list = to_match ? list : cur.chats, limit = 20;
    for (var i in chat_list) {
      if (to_match && intval(i) < 2e9) {
        continue;
      }
      var chat_title = cur.chats[i];

      if (cur.friends_to_pass-- > 0) continue;
      if (!to_match && !(limit--)) break;

      if (++cur.friends_shown > cur.friends_to_show) {
        // var shown_txt = getLang('mail_im_friends_shown', 100);
        var shown_txt = '�������� ������ ������';
        cur.friends_last_list = list;
        cur.friends_last_match = to_match;
        text.push('<a href="#" onclick="IM.showMoreFriends(); return false;" id="im_more_friends">' + shown_txt + '</a>');
        break;
      }

      var name = chat_title;
      if (to_match) {
        each(to_match, function() {
          var re = new RegExp("(?![^&;]+;)(?!<[^<>]*)(" + this + ")(?![^<>]*>)(?![^&;]+;)", "gi");
          name = name.replace(re, "<em>\$1</em>");
        });
      }
      var cls = '';
      if (cur.isPeerFirst) {
        cls = ' im_friend_over';
        cur.isPeerFirst = false;
      }
      var txt = '<img src="/images/icons/multichat.png" class="fl_l" width="32" height="32"/><div class="fl_l"><nobr>' + name + '</nobr></div>';
      text.push('<div class="im_friend im_chat', cls, '" id="im_friend' + intval(i) + '" onmousemove="IM.friendOver(this);" onclick="IM.selectPeer(' + intval(i) + ')">' + txt + '</div>');
    }
    return text.join('');
  },

  wrapPeers: function (friends, to_match) {
    var text = '', corresp = '<div id="im_correspondents"></div>';
    cur.isPeerFirst = to_match ? true : false;
    if (!cur.multi) {
      text += IM.wrapFriends(friends, true, to_match);
      if (cur.friends_shown <= cur.friends_to_show) {
        text += IM.wrapFriends(friends, false, to_match);
      }
      if (cur.friends_shown <= cur.friends_to_show && !cur.multi_appoint) {
        text += IM.wrapChats(friends, to_match);
      }
      if (cur.friends_shown <= cur.friends_to_show) {
        text += IM.wrapEmails(friends, to_match);
        if (cur.addEmailPeer && to_match) {
          var i = 0;
          for (i in friends) break;
          if (!i) {
            text += IM.wrapEmail(cur.addEmailPeer, to_match);
          }
        }
      }
      if (cur.friends_shown <= cur.friends_to_show && to_match) {
        re('im_correspondents');
        text += corresp;
        IM.wrapCorrespondents(cur.searchQ, to_match);
      }
      if (trim(cur.searchQ) && !cur.multi_appoint) {
        var cl = 'im_find_in_mail im_friend' + (cur.friends_shown ? '' : ' im_friend_over');
        text = '<a href="/im?q=' + encodeURIComponent(cur.searchQ) + '" class="' + cl + '" onmousemove="IM.friendOver(this)" onclick="return IM.findClick(event)">' + getLang('mail_im_search_query').replace('{query}', '<b>' + clean(cur.searchQ) + '</b>') + '</a>' + text;
      }
    } else {
      var len = false, i;
      for (i in cur.multi_friends || {}) {
        len = true;
        break;
      }
      if (!cur.multi_appoint && !len) {
        text += IM.wrapChats(friends, to_match);
      }
      if (cur.friends_shown <= cur.friends_to_show) {
        text += IM.wrapFriends(friends, true, to_match);
      }
      if (cur.friends_shown <= cur.friends_to_show) {
        text += IM.wrapFriends(friends, false, to_match);
      }
      if (cur.friends_shown <= cur.friends_to_show) {
        text += IM.wrapEmails(friends, to_match);
      }
      if (cur.addEmailPeer && to_match) {
        var i = 0;
        for (i in friends) break;
        if (!i) {
          text += IM.wrapEmail(cur.addEmailPeer, to_match);
        }
      }
      if (to_match && !text) {
        text += '<div class="im_friend_not_found">' + getLang('mail_im_empty_search') + '</div>';
      }
    }
    return text;
  },

  showMoreFriends: function () {
    var friends = cur.friends_last_list;
    var to_match = cur.friends_last_match;
    cur.friends_to_pass = cur.friends_shown;
    cur.friends_to_show += 100;

    var text = IM.wrapPeers(friends, to_match);
    var more_link = ge('im_more_friends');
    more_link.parentNode.removeChild(more_link);
    ge('im_friends').appendChild(ce('div', {innerHTML: text}));
  },

  filterFriends: function(no_force) {
    var q = trim(val('im_filter')).toLowerCase();

    if (no_force && q == cur.searchQ) return;
    cur.searchQ = q;

    var t = parseLatin(q);
    var to_match = t ? [escapeRE(q), escapeRE(t)] : (q ? [escapeRE(q)] : false);

    if (q.length > 1 && !IM.cacheFriends[q] || q.length == 1 && parseLatin(q)) IM.cacheFriends(q);
    var friends = q ? cur.friends_cache[q] : cur.friends;

    cur.addEmailPeer = (q.split('@').length == 2) ? q : false;

    // selUser
    for (var f in friends) break;
    cur.selUser = intval(f);

    cur.friends_shown = 0;
    cur.friends_to_show = 100;
    cur.friends_to_pass = 0;
    var text = IM.wrapPeers(friends, to_match);
    if (!cur.friends_shown) {
      var has_friends = false;
      for (var i in cur.friends) {
        has_friends = true;
        break;
      }
      if (!has_friends && cur.friendsLoaded) {
        text += '<div class="im_none" style="display: block;">' + getLang('mail_im_no_friends') + '</div>';
      }
    }
    val(cur.multi ? 'im_friends_all' : 'im_friends', text);
    val(!cur.multi ? 'im_friends_all' : 'im_friends', '');
    IM.updateScroll();
  },

  multiFriends: function () {
    var len = 0, i;
    for (i in cur.multi_friends) len++;
    toggle('im_friends_none_wrap', !len);
    toggle('im_friends_yes_wrap', len);

    if (!len) return;

    var friends = {}, i;
    for (i in cur.multi_friends) {
      if (i > 0) {
        friends[i + '_'] = cur.friends[i + '_'];
      } else if (i < -2e9) {
        friends[i + '_'] = cur.emails[i + '_'];
      }
    }
    var text = IM.wrapFriends(friends, 1, false, true);
    text += IM.wrapEmails(friends, 1, true);
    val('im_friends_sel', text);
    val('im_friends_sel_count', getLang('mail_im_X_friends_selected', len));
  },

  selectDialog: function(mid, e) {
    if (checkEvent(e)) {
      var wnd = window.open('/im?sel=' + IM.peerToId(mid), '_blank');
      try {wnd.blur(); window.focus();} catch (e) {}
    } else {
      IM.addPeer(mid);
    }
  },

  selectPeer: function(mid, msgId) {
    if (!cur.multi) {
      if (mid == -2e9 && cur.addEmailPeer) {
        if (cur.multi_appoint) {
          IM.updateChat(cur.multi_appoint, true, {new_peer: cur.addEmailPeer});
          IM.activateTab(cur.multi_appoint);
        } else {
          IM.addEmail(mid, cur.addEmailPeer);
        }
        return;
      }
      if (cur.multi_appoint) {
        IM.updateChat(cur.multi_appoint, true, {new_peer: mid});
        IM.activateTab(cur.multi_appoint);
      } else {
        if (!cur.fixedScroll) msgId = 0;
        IM.addPeer(mid, false, false, false, msgId);
        // IM.attachMsgs();
      }
      return;
    }
    if (mid > 2e9) {
      IM.addPeer(mid);
      return;
    }
    var len = 0, row = ge('im_friend' + mid), i;
    for (i in cur.multi_friends) len++;
    if (mid == -2e9) { // custom email address
      var min = -2e9;
      for (i in cur.emails) {
        if (cur.emails[i] == cur.addEmailPeer) {
          var filter = ge('im_filter');
          val(filter, '');
          hide('im_filter_reset');
          filter.focus();
          return;
        }
        if (intval(i) < min) {
          min = intval(i);
        }
      }
      mid = min - 1;
      cur.emails[mid+'_'] = cur.addEmailPeer.replace(/,/g, '');
    }
    if (!cur.multi_friends[mid]) {
      if (len >= cur.multi_peers_max - 1) {
        setTimeout(showFastBox(getLang('global_error'), getLang('mail_im_multi_limit', cur.multi_peers_max)).hide, 5000);
        return;
      }
      re(row);
      cur.multi_friends[mid] = 1;
      if (len && row) {
        ge('im_friends_sel').appendChild(row)
      }
      IM.multiFriends();
    } else {
      re(row);
      delete cur.multi_friends[mid];
      IM.multiFriends();
      IM.filterFriends();
    }
    var filter = ge('im_filter');
    val(filter, '');
    hide('im_filter_reset');
    filter.focus();
  },

  startChat: function (btn) {
    var sel = [], i;
    for (i in cur.multi_friends) {
      if (i < -2e9) { // emails
        sel.push(cur.emails[i + '_']);
      } else { // users
        sel.push(i);
      }
    }
    if (!sel.length) return;

    if (sel.length == 1) {
      IM.addPeer(sel[0]);
      // IM.attachMsgs();
      return;
    }
    if (sel.length >= cur.multi_peers_max) {
      setTimeout(showFastBox(getLang('global_error'), getLang('mail_im_multi_limit', cur.multi_peers_max)).hide, 5000);
      return;
    }
    ajax.post('al_im.php', {act: 'a_multi_start', title: val('im_chat_title_input'), peers: sel.join(','), hash: cur.writeHash}, {
      onDone: function(res) {
        if (res.peer && cur.tabs[res.peer]) {
          IM.activateTab(res.peer);
        } else {
          IM.addTab(res.peer, res.tab, res.name, res.photo, res.hash, 0, res.data);
          IM.updateScroll();
          cur.tabs[res.peer].history = false;
          IM.activateTab(res.peer);
        }
        IM.attachMsgs();
      },
      onFail: function(text) {
        setTimeout(showFastBox({
          title: getLang('global_error'),
          onHide: function() {
            IM.activateTab(-1);
          }
        }, text, getLang('global_close')).hide, 4500);
        return true;
      },
      showProgress: lockButton.pbind(btn),
      hideProgress: unlockButton.pbind(btn)
    });
    val('im_chat_title_input', '');
    val('im_friends_sel', '');
  },
  updateChat: function (peer, force, options) {
    var curTab = cur.tabs[peer], curData = curTab.data, curMems = [];
    if (options) {
      curTab.lastModifiedTime = vkNow();
    }
    if (vkNow() - curTab.lastUpdatedTime < 10000 && !force) {
      return;
    }
    curTab.lastUpdatedTime = vkNow();
    each (curData.members, function (id) {
      curMems.push(id);
    });
    ajax.post('al_im.php', extend({act: 'a_get_chat', chat: peer - 2e9, cur_peers: curMems.join(','), cur_title: replaceEntities(curData.title), hash: curTab.hash}, options || {}), {
      onDone: function (evs, newTab) {
        IM.receivePeerData(peer, newTab);
        var hist = ge('im_log' + peer), len = hist && hist.rows.length, ev;
        if (!hist) {
          debugLog('no chat log found', peer, evs);
          return;
        }
        each(evs, function () {
          var msg_id = --curTab.sent,
              row = extend(hist.insertRow(len++), {className: 'im_in im_chat_event', id: 'mess' + msg_id}),
              date = Math.floor(vkNow() / 1000);

          row.setAttribute('data-date', date);
          row.setAttribute('data-from', 0);

          extend(row.insertCell(0), {className: 'im_log_act'});
          extend(row.insertCell(1), {innerHTML: this.user || '', className: 'im_log_author'});
          extend(row.insertCell(2), {innerHTML: this.message, className: 'im_log_body'});
          extend(row.insertCell(3), {innerHTML: '<span>' + IM.mkdate(date + cur.tsDiff) + '</span>', className: 'im_log_date'});
          extend(row.insertCell(4), {className: 'im_log_rspacer'});

          hide('im_none' + peer);
          show('im_log' + peer);
        });
        while (ev = curTab.delayed.shift()) {
          IM.addMsg.apply(IM, ev);
        }
        if (cur.peer == peer) {
          IM.scrollAppended();
        }
      },
      onFail: function () {
        if (!options) {
          return true;
        }
      }
    });
  },
  inviteToChat: function () {
    if (cur.peer <= 2e9) return;
    var mems = cur.tabs[cur.peer].data.members, len = 0, i;
    for (i in mems) len++;
    if (len >= cur.multi_peers_max) {
      setTimeout(showFastBox(getLang('global_error'), getLang('mail_im_multi_limit', cur.multi_peers_max)).hide, 5000);
      return;
    }
    if (cur.tabs[cur.peer].data.closed) {
      setTimeout(showFastBox(getLang('global_error'), getLang('mail_im_invite_closed')).hide, 5000);
      return;
    }
    IM.activateTab(0, 2);
  },
  chatAva: function() {
    if (cur.peer <= 2e9) return;
    if (cur.tabs[cur.peer].data.closed) {
      setTimeout(showFastBox(getLang('global_error'), getLang('mail_im_invite_closed')).hide, 5000);
      return;
    }
    Page.ownerPhoto(cur.peer);
  },
  leaveChat: function (force) {
    var peer = cur.peer;
    if (peer <= 2e9) return;

    if (!force) {
      var box = showFastBox(getLang('mail_chat_leave_title'), getLang('mail_chat_leave_confirm'), getLang('box_yes'), function () {
        IM.leaveChat(true);
        box.hide();
      }, getLang('box_no'), function () {
        box.hide();
      });
      return;
    }
    ajax.post('al_im.php', extend({act: 'a_leave_chat', chat: peer - 2e9, hash: cur.tabs[peer].hash}), {
      onDone: function () {
        delete cur.chats[peer+'_'];
        IM.cacheFriends();
        IM.closeTab(peer);
      }
    });
  },
  returnToChat: function () {
    var peer = cur.peer;
    if (peer <= 2e9) return;

    ajax.post('al_im.php', extend({act: 'a_return_to_chat', chat: peer - 2e9, hash: cur.tabs[peer].hash}), {
      onFail: function (text) {
        setTimeout(showFastBox({title: getLang('global_error')}, text, getLang('global_close')).hide, 4500);
        return true;
      }
    });
  },
  changeChatTopic: function (force) {
    var peer = cur.peer;
    if (peer <= 2e9) return;

    var onsubmit = function () {
      var topicVal = trim(val(inp));
      if (!topicVal) {
        notaBene(inp);
        return;
      }
      IM.updateChat(peer, true, {new_title: topicVal});
      box.hide();
    },
        box = showFastBox(getLang('mail_chat_topic_change_title'), '<div class="im_change_topic_wrap clear_fix"><div class="im_change_topic_label fl_l ta_r">' + getLang('mail_chat_topic_change_label') + '</div><div class="im_change_topic_labeled fl_l"><input id="im_change_topic_val" class="text" /></div></div>', getLang('global_save'), onsubmit, getLang('global_cancel'), function () {
      box.hide();
    }),
        inp = ge('im_change_topic_val');
    val(inp, replaceEntities(cur.tabs[cur.peer].name));
    elfocus(inp);
    addEvent(inp, 'keydown', function (e) {
      if (e.keyCode == 13) {
        onsubmit();
      }
    });
  },

  showChatMembers: function(ev) {
    var peer = cur.peer;
    if (peer <= 2e9) return;
    return !showBox('al_im.php', {act: 'a_show_members_box', chat: peer - 2e9}, {stat: ['boxes.css']}, ev);
  },

  searchPeer: function() {
    val('im_filter', '');
    hide('im_write_btn', 'im_filter_reset');
    val('im_search_cancel', getLang((cur.peer > 2e9) ? 'mail_back_to_conv' : 'mail_back_to_dialog'));
    show('im_search_btn', 'im_search_cancel', 'im_datesearch_wrap');

    show('im_filter_out');
    hide('im_tabs', 'im_log_controls');
    IM.updateScroll(true);

    cur.qPeer = cur.qPeerShown = cur.peer;
    cur.qDay = false;
    if (cur.imDP) cur.imDP.hide();
    IM.calendarUpdTip();
    val(geByClass1('input_back_content', domPS(ge('im_filter'))), getLang('mail_search_placeholder'));

    setTimeout(elfocus.pbind('im_filter'), 0);
  },
  searchMessages: function () {
    var flt = ge('im_filter'), q = trim(val(flt)), btn = geByTag1('button', ge('im_search_btn')), bck = geByClass1('input_back_content', domPS(flt));
    cur.lastSearchQ = cur.searchQ = q || '';
    if (cur.imDP) cur.imDP.hide();
    if (!q && !cur.qDay) {
      delete(cur.qPeerShown);
      val(bck, getLang('mail_im_filter_friend_intro'));
      if (!IM.r(cur.peer)) {
        toggle('im_tabs', !cur.selMsgs.length);
        toggle('im_log_controls', cur.selMsgs.length);
        hide('im_filter_out');

        delete cur.qPeer;

        IM.updateScroll(true);
      } else if (cur.qPeer) {
        setTimeout(IM.selectPeer.pbind(cur.qPeer, 0), 50);
        delete(cur.qPeer);
      } else {
        setTimeout(IM.activateTab.pbind(-1), 50);
      }
      return;
    }
    val(bck, getLang('mail_search_placeholder'));
    if (buttonLocked(btn)) return;

    IM.activateTab(-2);
    cur.searchOffset = false;
    cur.searchLoading = true;
    delete cur.lastSearchScroll;
    ajax.post('al_im.php', {act: 'a_search', q: IM.fullQ()}, {
      onDone: function (rows, nextOffset, ttip) {
        IM.calendarUpdTip(ttip);
        cur.searchLoading = false;
        cur.searchOffset = nextOffset;
        var none = !rows;
        toggle('im_more-2', rows && nextOffset);
        toggle('im_log_search', !none);
        toggle('im_none-2', none);
        if (!none) {
          var t = ge('im_log_search');
          t.parentNode.replaceChild(se(rows), t);
        }
        IM.scrollOn();
        IM.updateLoc();
        cur.lastSearchQ = q;
      },
      showProgress: lockButton.pbind(btn),
      hideProgress: unlockButton.pbind(btn)
    });
  },

  showMoreSearch: function() {
    if (cur.peer == -5) {
      return IM.showMoreImportant();
    }
    var q = cur.searchQ, p = cur.qPeer, d = cur.qDay;
    if (cur.searchLoading || cur.searchOffset === false || !q && !d) return false;
    cur.searchLoading = true;

    ajax.post('al_im.php', {act: 'a_search', q: IM.fullQ(), offset: cur.searchOffset}, {
      showProgress: addClass.pbind('im_more-2', 'im_more_loading'),
      hideProgress: removeClass.pbind('im_more-2', 'im_more_loading'),
      onDone: function (html, nextOffset) {
        if (q != cur.searchQ || p != cur.qPeer || d != cur.qDay) {
          return;
        }
        if (!html) {
          hide('im_more-2');
          return;
        }
        cur.searchLoading = false;
        var table = ge('im_log_search');
        if (!table) {
          debugLog('table#im_log_search not found');
          return;
        }
        cur.searchOffset = nextOffset;
        var cur_rows = geByTag1('tbody', table),
            new_t = se(html),
            new_rows = geByTag1('tbody', new_t),
            before_row = cur_rows.firstChild, add_row, row_id;

        table.parentNode.insertBefore(new_t, table);
        toggle('im_more-2', nextOffset);
        IM.updateScroll();

        setTimeout(function () {
          while (add_row = new_rows.firstChild) {
            if (!add_row.id.match(/messq\d+/)) {
              new_rows.removeChild(add_row);
              continue;
            }
            row_id = add_row.id;
            add_row.id = '';
            if (ge(row_id)) {
              new_rows.removeChild(add_row);
              continue;
            }
            add_row.id = row_id;
            cur_rows.insertBefore(add_row, before_row);
          }
          re(new_t);
          IM.updateScroll();
        }, 0);
      },
      onFail: function () {
        cur.searchLoading = false;
      }
    });
    return false;
  },

  importantMessages: function () {
    IM.activateTab(-5);
    cur.importantOffset = false;
    cur.importantLoading = true;
    delete cur.lastImportantScroll;

    ajax.post('al_im.php', {act: 'a_important'}, {
      onDone: function (rows, nextOffset) {
        cur.importantLoading = false;
        cur.importantOffset = nextOffset;
        var none = !rows;
        if (!none) {
          var t = ge('im_log_search');
          t.parentNode.replaceChild(se(rows), t);
          toggle('im_more-2', nextOffset);
        } else {
          hide('im_log_search');
        }
        toggle('im_none-2', none);
        IM.scrollOn();
        IM.updateLoc();
      }
    });
  },

  showMoreImportant: function() {
    if (cur.importantLoading) return false;
    cur.importantLoading = true;
    ajax.post('al_im.php', {act: 'a_important', offset: cur.importantOffset}, {
      showProgress: addClass.pbind('im_more-2', 'im_more_loading'),
      hideProgress: removeClass.pbind('im_more-2', 'im_more_loading'),
      onDone: function (html, nextOffset) {
        cur.importantLoading = false;
        var table = ge('im_log_search');
        if (!table) {
          debugLog('table#im_log_search not found');
          return;
        }
        cur.importantOffset = nextOffset;
        var cur_rows = geByTag1('tbody', table),
            new_t = se(html),
            new_rows = geByTag1('tbody', new_t),
            before_row = cur_rows.firstChild, add_row, row_id;

        table.parentNode.insertBefore(new_t, table);
        toggle('im_more-2', nextOffset);
        IM.updateScroll();

        setTimeout(function () {
          while (add_row = new_rows.firstChild) {
            if (!add_row.id.match(/messq\d+/)) {
              new_rows.removeChild(add_row);
              continue;
            }
            row_id = add_row.id;
            add_row.id = '';
            if (ge(row_id)) {
              new_rows.removeChild(add_row);
              continue;
            }
            add_row.id = row_id;
            cur_rows.insertBefore(add_row, before_row);
          }
          re(new_t);
          IM.updateScroll();
        }, 0);
      },
      onFail: function () {
        cur.importantLoading = false;
      }
    });
    return false;
  },

  spamMessages: function () {
    IM.activateTab(-4);
    cur.selSpam = [];
    cur.spamOffset = false;
    cur.spamLoading = true;

    ajax.post('al_im.php', {act: 'a_spam'}, {
      onDone: function (rows, nextOffset) {
        cur.spamLoading = false;
        cur.spamOffset = nextOffset;
        var none = !rows;
        toggle('im_more-4', rows && nextOffset);
        toggle('im_log_spam', !none);
        toggle('im_none-4', none);
        if (!none) {
          var t = ge('im_log_spam');
          t.parentNode.replaceChild(se(rows), t);
        }
        IM.scrollOn();
        IM.updateLoc();
      }
    });
  },

  showMoreSpam: function() {
    if (cur.spamLoading) return false;
    cur.spamLoading = true;
    ajax.post('al_im.php', {act: 'a_spam', offset: cur.spamOffset}, {
      showProgress: addClass.pbind('im_more-4', 'im_more_loading'),
      hideProgress: removeClass.pbind('im_more-4', 'im_more_loading'),
      onDone: function (html, nextOffset) {
        cur.spamLoading = false;
        var table = ge('im_log_spam');
        if (!table) {
          debugLog('table#im_log_spam not found');
          return;
        }
        cur.spamOffset = nextOffset;
        var cur_rows = geByTag1('tbody', table),
            new_t = se(html),
            new_rows = geByTag1('tbody', new_t),
            before_row = cur_rows.firstChild, add_row, row_id;

        table.parentNode.insertBefore(new_t, table);
        toggle('im_more-4', nextOffset);
        IM.updateScroll();

        setTimeout(function () {
          while (add_row = new_rows.firstChild) {
            if (!add_row.id.match(/messs\d+/)) {
              new_rows.removeChild(add_row);
              continue;
            }
            row_id = add_row.id;
            add_row.id = '';
            if (ge(row_id)) {
              new_rows.removeChild(add_row);
              continue;
            }
            add_row.id = row_id;
            cur_rows.insertBefore(add_row, before_row);
          }
          re(new_t);
          IM.updateScroll();
        }, 0);
      },
      onFail: function () {
        cur.spamLoading = false;
      }
    });
    return false;
  },

  showMoreDialogs: function (offset, has_more) {
    var nextDialogsEl = ge('im_dialogs_next');
    if (!nextDialogsEl) {
      return;
    }
    nextDialogsEl.id = '';
    if (has_more) {
      ajax.post('al_im.php', {act: 'a_get_dialogs', offset: offset}, {
        onDone: function (options, rows) {
          if (rows) {
            ge('im_dialogs').appendChild(ce('div', {id: 'im_dialogs_next', innerHTML: rows}));
            ge('im_more_dialogs').onclick = function () {
              IM.showMoreDialogs(options.offset, options.has_more);
              return false;
            };
            ge('im_dialogs').appendChild(ge('im_more_dialogs'));
            IM.onScroll();
          }
          IM.updateCounts(options.cnts);
        }
      });
    } else {
      hide('im_more_dialogs');
    }
  },
  logMessState: function (state, msg_id) {
    if (cur.selSpamSingle) {return true;}
    var pos = indexOf(cur.selMsgs, msg_id), posSp = indexOf(cur.selSpam, msg_id), row = ge('mess' + msg_id);
    if (pos != -1 || posSp != -1 || !row || cur.deletedRows[msg_id]) return;
    toggleClass(row, 'im_msg_over', state);
    // setStyle('ma' + msg_id, 'visibility', state ? 'visible' : 'hidden');

    if (cur.peer == -4 && !cur.spam.markingRead && hasClass('mess' + msg_id, 'im_new_msg')) {
      IM.markRead(-4, [msg_id.substr(1)]);
    }
  },
  checkLogClick: function (el, event) {
    event = event || window.event;
    if (!el && !event) return false;
    var target = event.target || event.srcElement,
        i = 4,
        foundGood = false,
        checkeRE = /wrapped|im_log_act|im_log_ract|im_log_author|im_log_body|im_log_date|im_log_rspacer/;
    do {
      // debugLog(target, debugEl(target));
      if (!target ||
          target == el ||
          target.onclick ||
          target.onmousedown ||
          target.tagName == 'A' ||
          target.tagName == 'IMG' && !hasClass(target, 'emoji') && !hasClass(target, 'im_gift') ||
          target.tagName == 'TEXTAREA' ||
          target.className == 'play_new' ||
          (foundGood = checkeRE.test(target.className))
      ) {
        break;
      }
    } while (i-- && (target = target.parentNode));
    // debugLog(foundGood);
    if (!foundGood) {
      cur.updateScrollTO = setTimeout(IM.updateScroll.pbind(false), 100);
      return true;
    }
    var sel = trim((
      window.getSelection && window.getSelection() ||
      document.getSelection && document.getSelection() ||
      document.selection && document.selection.createRange().text || ''
    ).toString());
    if (sel) {
      return true;
    }
    return false;
  },
  checkLogMsg: function (msg_id) {
    if (cur.selSpamSingle) {
      if (msg_id == cur.selSpamSingle) {
        return IM.uncheckSpamSingle();
      }
      return false;
    }
    var pos = indexOf(cur.selMsgs, msg_id), row = ge('mess' + msg_id);
    if (!row || cur.deletedRows[msg_id]) return;
    if (pos == -1) {
      if (cur.selMsgs.length >= 100) {
        return false;
      }
      if (!cur.selMsgs.length) {
        cur.lastNavHeight = cur.imEl.nav.offsetHeight;
      }
      cur.selMsgs.push(msg_id);
      if (data(row, 'tween')) {
        data(row, 'tween').stop(false);
        setStyle(row, {backgroundColor: ''});
      }
      if (row.hltt) {
        clearTimeout(row.hltt)
        setStyle(row, {backgroundColor: ''});
      }
      addClass(row, 'im_sel_row');
      removeClass(ge('mess_check' + msg_id), 'im_log_check_on');
      setStyle('ma' + msg_id, {visibility: ''});
    } else {
      cur.selMsgs.splice(pos, 1);
      removeClass(row, 'im_sel_row');
      if (!cur.selMsgs.length) {
        cur.lastNavHeight = cur.imEl.nav.offsetHeight;
      }
    }
    toggleClass('im_log_fav_btn', 'im_log_fav_btn__active', IM.checkLogIsImportant());

    val('im_n_marked', getLang('mail_im_X_sel_msgs', cur.selMsgs.length));
    toggle('im_tabs', !cur.selMsgs.length && !cur.qPeerShown);
    toggle('im_log_controls', cur.selMsgs.length && !cur.qPeerShown);

    IM.updateScroll();
  },
  checkLogIsImportant: function () {
    if (!cur.selMsgs.length || IM.r()) return false;

    var isImportant = true,
        msgs = cur.tabs[cur.peer].msgs;

    each (cur.selMsgs, function (k, msg_id) {
      if (msgs[msg_id] && !msgs[msg_id][2]) {
        isImportant = false;
        return false;
      }
    });

    return isImportant;
  },
  markLogMsgsImportant: function (btn) {
    var isImportant = IM.checkLogIsImportant(),
        selMsgs = cur.selMsgs;
    ajax.post('al_im.php', {act: 'a_mark_important', ids: selMsgs, val: isImportant ? 0 : 1, from: 'im', hash: cur.mark_hash}, {
      onDone: function (selMsgs, cnts) {
        var msgs = cur.tabs[cur.peer].msgs;

        isImportant = isImportant ? 0 : 1;
        each (selMsgs, function (k, msg_id) {
          if (msgs[msg_id] !== undefined) {
            msgs[msg_id][2] = isImportant;
          }
          var msgEl = ge('mess' + msg_id);
          toggleClass(msgEl, 'im_important_msg', isImportant);
          IM.updateImportantTT(msgEl, isImportant);

        });
        IM.uncheckLogMsgs();
        IM.updateCounts(cnts);
      },
      showProgress: function () {
        lockButton(btn);
        addClass('im_log_fav_btn', 'im_log_fav_btn__loading');
      },
      hideProgress: function () {
        unlockButton(btn);
        removeClass('im_log_fav_btn', 'im_log_fav_btn__loading');
      }
    });
  },
  showImportantTT: function (btn) {
    if (IM.r()) {
      var msgEl = btn.parentNode.parentNode,
          msg_id = msgEl.id.substr(5), // messq
          isImportant = !intval(msgEl.getAttribute('data-notimportant'));
    } else {
      var msg_id = btn.parentNode.parentNode.id.substr(4), // mess
          isImportant = cur.tabs[cur.peer].msgs[msg_id][2];
    }

    var text = isImportant ? getLang('mail_im_toggle_important_off') : getLang('mail_im_toggle_important');
    showTooltip(btn, {text: text, showdt: 0, black: 1, shift: [10, -2, 0], className: 'im_important_tt'});
  },
  updateImportantTT: function (msgEl, isImportant) {
    var toggler = geByClass1('im_important_toggler', msgEl),
        tt = toggler && toggler.tt,
        text = isImportant ? getLang('mail_im_toggle_important_off') : getLang('mail_im_toggle_important');
    if (!tt) {
      return;
    }

    if (isVisible(tt.container)) {
      var textEl = geByClass1('tt_text', tt.container);
      val(textEl, text);
    } else {
      tt.hide({fasthide: 1});
      tt.destroy();
    }
  },
  toggleImportant: function (msg_id) {
    var isImportant = cur.tabs[cur.peer].msgs[msg_id][2];
    ajax.post('al_im.php', {act: 'a_mark_important', ids: [msg_id], val: isImportant ? 0 : 1, from: 'im', hash: cur.mark_hash}, {
      onDone: function (selMsgs, cnts) {
        var msgs = cur.tabs[cur.peer].msgs;

        isImportant = isImportant ? 0 : 1;
        each (selMsgs, function (k, msg_id) {
          if (msgs[msg_id] !== undefined) {
            msgs[msg_id][2] = isImportant;
          }
          var msgEl = ge('mess' + msg_id);
          toggleClass(msgEl, 'im_important_msg', isImportant);
          IM.updateImportantTT(msgEl, isImportant);
        });
        IM.updateCounts(cnts);
        toggleClass('im_log_fav_btn', 'im_log_fav_btn__active', IM.checkLogIsImportant());
      }
    });
    return false;
  },
  toggleListImportant: function (msg_id) {
    var msgEl = ge('messq' + msg_id),
        notImportant = intval(msgEl.getAttribute('data-notimportant'));
    ajax.post('al_im.php', {act: 'a_mark_important', ids: [msg_id], val: notImportant ? 1 : 0, from: 'im', hash: cur.mark_hash}, {
      onDone: function (selMsgs, cnts) {
        each (selMsgs, function (k, msg_id) {
          msgEl = ge('messq' + msg_id);
          msgEl.setAttribute('data-notimportant', notImportant ? 0 : 1);
          toggleClass(msgEl, 'im_important_msg', notImportant);
          IM.updateImportantTT(msgEl, notImportant);

        });
        IM.updateCounts(cnts);
      }
    });
    return false;
  },
  markLogMsgs: function (act, btn) {
    if (!cur.selMsgs.length || IM.r()) return;
    if (act == 'cancel') {
      IM.uncheckLogMsgs();
      return;
    }
    if (act == 'reply') {
      cur.fwdFromPeer = cur.peer;
      IM.attachMsgs();
      var txt = IM.getTxt(cur.peer);
      if (cur.editable) {
        IM.editableFocus(txt, false, true);
      } else {
        elfocus(txt);
      }
      return;
    }
    if (act == 'fwd') {
      cur.fwdFromPeer = cur.peer;
      IM.activateTab(-1);
      return;
    }
    // So delete or mark as spam
    each (cur.selMsgs, function (k, v) {
      cur.deletedRows[v] = 1;
    });
    ajax.post('al_mail.php', {act: 'a_mark', msgs_ids: cur.selMsgs.join(','), mark: act, from: 'im', hash: cur.mark_hash}, {
      onDone: function (res, restore, actions) {
        each (cur.selMsgs, function (k, msg_id) {
          cur.deletedRows[msg_id] = 1;
          var tr = ge('mess' + msg_id),
              mBody = geByClass1('wrapped', tr),
              mRes = ce('div', {id: 'mres' + msg_id, className: 'im_marked_res', innerHTML: restore.replace(/%s/, msg_id)});
          hide(mBody);
          mBody.parentNode.insertBefore(mRes, mBody);
          addClass(tr, act == 'del' ? 'im_del_row' : 'im_spam_row');
        });
        IM.uncheckLogMsgs();
      },
      showProgress: lockButton.pbind(btn),
      hideProgress: unlockButton.pbind(btn)
    });
  },
  uncheckLogMsgs: function () {
    each (cur.selMsgs, function (k, msg_id) {
      var msgEl = ge('mess' + msg_id);
      removeClass(msgEl, 'im_sel_row');
      removeClass(msgEl, 'im_msg_over');
    });
    cur.selMsgs = [];

    cur.lastNavHeight = cur.imEl.nav.offsetHeight;
    show('im_tabs');
    hide('im_log_controls');

    IM.updateScroll();
  },
  attachMsgs: function () {
    if (!cur.fwdFromPeer || !cur.selMsgs.length) return;

    IM.onMediaChange('mail', cur.selMsgs.join(';'), [cur.selMsgs.length]);
    IM.uncheckLogMsgs();
  },

  checkSpamMsg: function (msg_id) {
    var pos = indexOf(cur.selSpam, msg_id), row = ge('mess' + msg_id);
    if (!row || cur.deletedRows[msg_id]) return;
    if (pos == -1) {
      if (cur.selSpam.length >= 100) {
        return false;
      }
      cur.selSpam.push(msg_id);
      addClass(row, 'im_sel_row');
      removeClass(ge('mess_check' + msg_id), 'im_log_check_on');
      setStyle('ma' + msg_id, {visibility: ''});
    } else {
      cur.selSpam.splice(pos, 1);
      removeClass(row, 'im_sel_row');
    }

    val('im_spam_n_marked', getLang('mail_im_X_sel_msgs', cur.selSpam.length));
    val('im_spam_mark_no', getLang('mail_im_mark_notspam', cur.selSpam.length));
    val('im_spam_mark_del', getLang('mail_im_mark_delspam', cur.selSpam.length));
    toggle('im_spam_controls', cur.selSpam.length);
    toggle('im_spam_flush', !cur.selSpam.length);
  },
  markSpamMsgs: function (act, btn) {
    if (!cur.selSpam.length || !cur.selSpamSingle && cur.peer != -4) return;
    if (act == 'cancel') {
      IM.uncheckSpamMsgs();
      return;
    }
    // So delete or mark as spam
    each (cur.selSpam, function (k, v) {
      cur.deletedRows[v] = 1;
    });
    ajax.post('al_mail.php', {act: 'a_mark', msgs_ids: cur.selSpam.join(',').replace(/s/g, ''), mark: act, from: 'im', hash: cur.mark_hash}, {
      onDone: function (res, restore, cnt, unread) {
        each (cur.selSpam, function (k, msg_id) {
          if (cur.selSpamSingle == msg_id) {
            var suspWrap = ge('im_susp_wrap' + msg_id);
            addClass(suspWrap, 'im_msg_susp_wrap_done');
            if (act == 'nospam') {
              each(geByTag('a', geByClass1('im_msg_susp', suspWrap, 'div')), function () {
                this.href = this.href.replace(/&?h=-1/, '').replace('?&', '?');
                this.setAttribute('onclick', (this.getAttribute('onclick') || '').replace(/,?\s*("|'|)h\1\s*:\s*-\s*1/, ''));
              });
              delete cur.deletedRows[msg_id];
              return;
            }
          }
          cur.deletedRows[msg_id] = 1;
          var tr = ge('mess' + msg_id),
              mBody = geByClass1('wrapped', tr),
              mRes = ce('div', {id: 'mres' + msg_id, className: 'im_marked_res', innerHTML: restore.replace(/%s/, msg_id)});
          hide(mBody);
          mBody.parentNode.insertBefore(mRes, mBody);
          addClass(tr, act == 'delspam' ? 'im_del_row' : 'im_spam_row');
        });
        IM.updateCounts(cnts);
        IM.uncheckSpamMsgs();
      },
      showProgress: lockButton.pbind(btn),
      hideProgress: unlockButton.pbind(btn)
    });
  },
  openMsgDialog: function (msgId) {
    var el = ge('mess' + msgId), peer;
    if (el && (peer = (el.className || '').match(/from(\d+)/))) {
      IM.addPeer(peer[1]);
    }
  },
  uncheckSpamMsgs: function () {
    if (cur.selSpamSingle) {
      return IM.uncheckSpamSingle();
    }
    each (cur.selSpam, function (k, msgId) {
      removeClass(ge('mess' + msgId), 'im_sel_row');
    });
    cur.selSpam = [];
    hide('im_spam_controls');
    show('im_spam_flush');
  },
  checkSpamSingle: function (msgId) {
    addClass('im_susp_wrap' + msgId, 'im_msg_susp_wrap_opened');
    IM.uncheckLogMsgs();
    IM.uncheckSpamMsgs();
    IM.checkSpamMsg(msgId);
    cur.selSpamSingle = msgId;
    hide('im_tabs', 'im_log_controls');
    show('im_spam_controls');

    return false;
  },
  uncheckSpamSingle: function () {
    each (cur.selSpam, function (k, msgId) {
      removeClass(ge('mess' + msgId), 'im_sel_row');
      removeClass('im_susp_wrap' + msgId, 'im_msg_susp_wrap_opened');
    });
    cur.selSpam = [];
    cur.selSpamSingle = false;
    hide('im_spam_controls', 'im_log_controls');
    show('im_tabs');
  },
  flushSpam: function () {
    var onYes = function () {
        ajax.post('/al_mail.php', {act: 'a_flush_spam', hash: cur.spamFlushhash, from: 'im'}, {
          onDone: function (res, text, cnts) {
            box.hide();
            IM.activateTab(-1);
            showDoneBox(text);
            IM.updateCounts(cnts);
          },
          showProgress: box.showProgress,
          hideProgress: box.hideProgress
        });
      },
      box = showFastBox(getLang('mail_deleteall1'), getLang('mail_delete_all_spam'), getLang('mail_delete'), onYes, getLang('mail_close'), onNo),
      onNo = function () {
        box.hide();
      };
  },
  showForwardedBox: function (msg_id, ref_id, hash) {
    showBox('al_im.php', {act: 'a_show_forward_box', id: msg_id, ref_id: ref_id, hash: hash});
  },
  deleteLogMsg: function (msg_id) {
    var ma = ge('ma' + msg_id), tr = ge('mess' + msg_id);
    if (!tr || !ma) return false;
    ma.innerHTML = '<img src="/images/upload.gif" />';
    cur.deletedRows[msg_id] = 1;
    ajax.post('al_mail.php', {act: 'a_delete', id: msg_id, from: 'im', hash: cur.mark_hash}, {onDone: function (res, restore, actions) {
      var mBody = geByClass1('wrapped', tr), mres = ce('div', {id: 'mres' + msg_id, innerHTML: restore});
      hide(mBody);
      mBody.parentNode.insertBefore(mres, mBody);
      addClass(tr, 'im_del_row');
      ma.innerHTML = actions;
    }});
    return false;
  },
  restoreLogMsg: function (msg_id) {
    var ma = ge('ma' + msg_id), tr = ge('mess' + msg_id);
    if (!tr || !ma) return false;
    var mBody = geByClass1('wrapped', tr), mres = ge('mres' + msg_id);
    if  (!mBody || !mres) return false;
    mres.innerHTML = '<img src="/images/upload.gif" />';
    cur.deletedRows[msg_id] = 0;
    ajax.post('al_mail.php', {act: 'a_restore', id: msg_id, from: 'im', hash: cur.mark_hash}, {onDone: function (res, actions) {
      show(mBody);
      re(mres);
      removeClass(tr, 'im_del_row');
    }});
    return false;
  },
  restoreSpamMsg: function (msg_id) {
    var ma = ge('ma' + msg_id), tr = ge('mess' + msg_id);
    if (!tr || !ma) return false;
    var mBody = geByClass1('wrapped', tr), mres = ge('mres' + msg_id);
    if  (!mBody || !mres) return false;
    mres.innerHTML = '<img src="/images/upload.gif" />';
    cur.deletedRows[msg_id] = 0;
    ajax.post('al_mail.php', {act: 'a_restore_spam', id: msg_id, from: 'imspam', hash: cur.mark_hash}, {onDone: function (res, cnts) {
      IM.updateCounts(cnts);
      show(mBody);
      re(mres);
      removeClass(tr, 'im_del_row');
    }});
    return false;
  },
  reportLogMsg: function (msg_id) {
    var ma = ge('ma' + msg_id), tr = ge('mess' + msg_id);
    if (!tr || !ma) return false;
    var mBody = geByClass1('wrapped', tr), mres = ge('mres' + msg_id);
    if  (!mBody || !mres) return false;
    ma.innerHTML = '<img src="/images/upload.gif" />';
    ajax.post('al_mail.php', {act: 'a_report_spam', id: msg_id, from: 'im', hash: cur.mark_hash}, {onDone: function (res, restore) {
      addClass(tr, 'im_spam_row');
      removeClass(tr, 'im_del_row');
      mres.innerHTML = restore;
    }});
    return false;
  },
  restoreSpamLogMsg: function (msg_id) {
    var ma = ge('ma' + msg_id), tr = ge('mess' + msg_id);
    if (!tr || !ma) return false;
    var mBody = geByClass1('wrapped', tr), mres = ge('mres' + msg_id);
    if  (!mBody || !mres) return false;
    mres.innerHTML = '<img src="/images/upload.gif" />';
    cur.deletedRows[msg_id] = 0;
    ajax.post('al_mail.php', {act: 'a_restore_spam', id: msg_id, from: 'im', hash: cur.mark_hash}, {onDone: function (res, actions) {
      show(mBody);
      re(mres);
      removeClass(tr, 'im_spam_row');
    }});
    return false;
  },
  onSubmitSettingsChanged: function (val) {
    var curSettings = intval(getCookie('remixsettings_bits'));
    if (curSettings & 2) {
      curSettings &= (~2);
      setCookie('remixsettings_bits', curSettings, 365);
    }
    ajax.post('al_im.php', {act: 'a_save_ctrl_submit', to: cur.peer, value: val ? 1 : 0, hash: cur.tabs[cur.peer].hash});
    cur.ctrl_submit = !!val;
  },
  onActionMenu: function (val) {
    switch (val) {
      case 'search': IM.searchPeer(); break;
      case 'invite': IM.inviteToChat(); break;
      case 'topic': IM.changeChatTopic(); break;
      case 'return': IM.returnToChat(); break;
      case 'leave': IM.leaveChat(); break;
      case 'history': IM.loadHistory(cur.peer, 2); break;
      case 'clear': IM.deleteHistory(cur.peer); break;
      case 'chat': IM.startChatWith(cur.peer); break;
      case 'photos': IM.showMediaHistory(cur.peer, 'photo'); break;
      case 'videos': IM.showMediaHistory(cur.peer, 'video'); break;
      case 'audios': IM.showMediaHistory(cur.peer, 'audio'); break;
      case 'docs': IM.showMediaHistory(cur.peer, 'doc'); break;
      case 'avatar': IM.chatAva(); break;
    }
  },
  notify: function (peer_id, msg) {
    if (!cur.notify_on) {
      return;
    }
    var peer, peer_photo, peer_name, title = IM.goodTitle(msg[2], peer_id) && msg[2] || '';
        message = ((title ? (title + ' ') : '') + msg[3]) || '',
        peer_data = cur.tabs[peer_id].data,
        actual_peer = msg[3].match(/<\*>from:(\d+)/);

    message = trim(stripHTML(replaceEntities(message).replace(/<br>/g, "\n").replace(/<\*>.*$/, '')));
    actual_peer = actual_peer && actual_peer[1] || msg[5].from || peer_id;

    if (peer_data && peer_data.members[actual_peer]) {
      peer_name = peer_data.members[actual_peer].name;
      if (peer_data.title) {
        peer_name += ' � ' + peer_data.title;
      }
      peer_photo = peer_data.members[actual_peer].photo;
    } else if (peer = cur.friends[actual_peer + '_']) {
      peer_name = peer[1];
      peer_photo = peer[2];
    } else if (peer = cur.tabs[actual_peer]) {
      peer_name = peer.tab_text;
      peer_photo = peer.photo;
    } else {
      return;
    }
    if (msg[5].attach1_type) {
      message += "\n[" + getLang('mail_added_' + msg[5].attach1_type) + "]";
    } else if (msg[5].fwd) {
      message += "\n[" + getLang('mail_added_msgs') + "]";
    }
    peer_name = (peer_name || '').replace('&nbsp;', ' ');
    if (cur.uiNotifications[peer_id]) {
      cur.uiNotifications[peer_id].cancel();
    }

    var notification = cur.uiNotifications[peer_id] = webkitNotifications.createNotification(peer_photo, peer_name, message);
    notification.onclick = function (e) {
      IM.activateTab(peer_id);
      window.focus();
      notification.cancel();
      setTimeout(elfocus.bind('im_txt' + peer_id), 250);
      cur.uiNotifications[peer_id] = false;
      elfocus('im_txt' + peer_id);
    };
    notification.replaceId = 'im_txt' + peer_id;
    cur.notifyTO = setTimeout(function () {
      notification.cancel();
      cur.uiNotifications[peer_id] = false;
    }, 10000);
    notification.show();
  },
  parseLatKeys: function (text) {
    var outtext = text;
    var lat = "qwertyuiop[]asdfghjkl;'zxcvbnm,./`";
    var rus = "��������������������������������.�";
    for(var i=0;i<lat.length;i++){
      outtext = outtext.split(lat.charAt(i)).join(rus.charAt(i));
    }
    return (outtext==text)?null:outtext;
  },
  parseCyr: function (text) {
    var outtext = text;
    var lat1 = ['yo','zh','kh','ts','ch','sch','shch','sh','eh','yu','ya','YO','ZH','KH','TS','CH','SCH','SHCH','SH','EH','YU','YA',"'"];
    var rus1 = ['�', '�', '�', '�', '�', '�',  '�',   '�', '�', '�', '�', '�', '�', '�', '�', '�', '�',  '�',   '�', '�', '�', '�', '�'];
    for (var i = 0; i < rus1.length; i++) {
      outtext = outtext.split(rus1[i]).join(lat1[i]);
    }
    var lat2 = 'abvgdezijklmnoprstufhcyABVGDEZIJKLMNOPRSTUFHCY��';
    var rus2 = '������������������������������������������������';
    for (var i = 0; i < rus2.length; i++) {
      outtext = outtext.split(rus2.charAt(i)).join(lat2.charAt(i));
    }
    outtext = outtext.replace(/��/g, '�');
    return (outtext == text) ? null : outtext;
  },
  r: function(peer) { // is peer reserved
    if (peer === undefined) {
      peer = cur.peer;
    }
    return (peer == 0 || peer == -1 || peer == -2 || peer == -3 || peer == -4 || peer == -5);
  },

  deinitWrite: function() {
    show(cur.imEl.bar, cur.imEl.controls, 'im_write_wrap');
    hide('im_to_dialog');
    cur.imEl.rowsWrap.style.overflow = 'hidden';
    if (cur.fixedScroll) {
      addClass(bodyNode, 'im_fixed_nav');
      _fixedNav = true;
    }
    if (cur.editable && browser.mozilla) {
//      document.execCommand("enableObjectResizing", false, false);
    }
    var tt = ge('im_emoji_block');
    setTimeout(IM.reappendEmoji.pbind(tt), 0);
  },
  showToDialog: function(sel) {
    hide('im_to_dialog');
    var mid = false, sex = 0, text = '';
    for (var i in sel) {
      if (mid) return;
      mid = sel[i][0];
      if (mid != intval(mid)) return;
      sex = sel[i][6];
      text = sel[i][7];
    }
    if (mid > 2e9) {
      val('im_to_dialog', '<a href="/im?sel=c' + (mid - 2e9) + '" onclick="if (checkEvent(event) === false) { IM.addPeer(' + mid + ', false, false, true); return false; }">' + getLang('mail_im_to_multidialog') + '</a>');
      show('im_to_dialog');
    } else {
      if (!mid || !sex || !text) return;
      text = getLang('mail_im_to_dialog', 3 - sex).replace('{user}', text);
      val('im_to_dialog', '<a href="/im?sel=' + mid + '" onclick="if (checkEvent(event) === false) { IM.addPeer(' + mid + ', false, false, true); return false; }">' + text + '</a>');
      show('im_to_dialog');
    }
  },
  initWriteDD: function() {
    if (WideDropdown.init('imw_dd', {
      defaultItems: cur.ddfriends,
      url: 'hints.php',
      params: {act: 'a_json_friends', from: 'imwrite'},
      noResult: getLang('mail_not_found'),
      img: 'imw_ava',
      introText: getLang('mail_choose_recipient'),
      custom: function(q) {
        return (q.split('@').length == 2) ? [[clean(q), clean(q), getLang('mail_enter_email_address'), '/images/pics/contact50.gif', 0, '']] : false;
      },
      chooseOnBlur: function(id) {
        id = trim(id + '');
        return id.length < 64 && id.match(/^[a-z0-9_\-\.]+@[a-z0-9_\-\.]+\.[a-z]{2,6}$/i);
      },
      onChange: function(act) {
        var dd = cur.wdd['imw_dd'], sel = dd.selCount;
        if (sel == 1 && !IM.editableHasVal(IM.getNewTxt())) {
          IM.restoreWriteDraft();
        }
        if (act == 1) { // added
          setTimeout(cur.editable ? IM.editableFocus.pbind(IM.getNewTxt(), domLC(IM.getNewTxt())) : elfocus.pbind(IM.getNewTxt()), 0);
        }
        IM.checkNewLen(IM.getNewTxt());
        IM.showToDialog(dd.selected);
        val('imw_to_header', getLang((sel > 1) ? 'mail_rcpnts' : 'mail_rcpnt'));
      },
      itemMark: function(item) {
        return intval((cur.friends[item[0] + '_'] || [item[5]])[0]) ? 1 : 0;
      }
    })) {
      cur.destroy.push(WideDropdown.deinit.pbind('imw_dd'));
    }
    if (cur.ddfriends_sel) {
      var sel = cur.ddfriends_sel[0];
      WideDropdown.select('imw_dd', false, cur.ddfriends_sel);
      delete cur.ddfriends_sel;
      IM.restoreWriteDraft();
      if (window.curFastChat && curFastChat.tabs && (chatTab = curFastChat.tabs[sel])) {
        chatTab.box.minimize();
        cur.hiddenChats[sel] = 1;
      }
    }
  },
  getWritePeer: function () {
    var dd = (cur.wdd || {})['imw_dd'],
        sel = (dd || {}).selCount,
        peer = false;
    if (sel != 1) {
      return false;
    }
    for (peer in dd.selected)
      break;
    return intval(peer);
  },
  restoreWriteDraft: function () {
    if (!cur.imwMedia) return;

    var peer = IM.getWritePeer(),
        draft, txt = IM.getNewTxt();
    if (browser.mobile || !peer) return;
    if (draft = ls.get('im_draft' + vk.id + '_' + peer)) {
      if (IM.editableVal(txt).length < 2) {
        if (cur.editable) {
          val(txt, IM.emojiToHTML(clean(draft.txt || ''), true).replace(/\n/g, '<br/>'));
        } else {
          val(txt, draft.txt || '');
        }
      }
      if ((draft.medias || []).length && !(cur.imwMedia.chosenMedias || []).length) {
        var m = [];
        for (var i in draft.medias) {
          if (!draft.medias[i]) continue;
          m.push(draft.medias[i].slice(0, 2).join(','));
        }
        ajax.post('al_im.php', {act: 'draft_medias', media: m.join('*')}, {onDone: function(resp) {
          if (cur.peer != -3 || IM.getWritePeer() != peer || !(resp || []).length) return;
          each(resp, function() {
            cur.imwMedia.chooseMedia.apply(cur.imwMedia, this);
          });
        }});
      }
    }
    IM.checkEditable(txt);
    IM.checkNewLen(txt);
  },
  saveWriteDraft: function () {
    var peer = IM.getWritePeer(),
        draft;
    if (!peer) return;
    draft = {
      txt: IM.editableVal(IM.getNewTxt()),
      medias: []
    }, m = cur.imwMedia ? cur.imwMedia.getMedias() : [];
    for (var i = 0, l = m.length; i < l; ++i) {
      if (m[i]) draft.medias.push([m[i][0], m[i][1]]);
    }
    if (!draft.medias.length && !draft.txt.length) {
      draft = false;
    };
    ls.set('im_draft' + vk.id + '_' + peer, draft);
  },
  initWrite: function() {
    removeClass(bodyNode, 'im_fixed_nav');
    _fixedNav = false;

    hide(cur.imEl.bar, cur.imEl.controls, 'im_top_sh', 'im_bottom_sh', 'im_write_wrap');
    cur.imEl.rowsWrap.style.overflow = 'visible';

    if (cur.editable) {
      addEvent(IM.getNewTxt(), 'paste', function() {
        IM.onEditablePaste(IM.getNewTxt());
      });
      addEvent(IM.getNewTxt(), browser.opera ? 'click' : 'mousedown', function(e) {
        if (e.target && e.target.tagName == 'IMG') {
          if (e.target.getAttribute('emoji')) {
            IM.editableFocus(IM.getNewTxt(), e.target, e.offsetX > 8);
            return cancelEvent(e);
          }
        }
        cur.emojiFocused = false;
      });
      if (browser.mozilla) {
//        document.execCommand("enableObjectResizing", false, true);
      }
    } else {
      autosizeSetup(IM.getNewTxt(), {minHeight: 90, maxHeight: 400});
    }
    addEvent(IM.getNewTxt(), 'keyup', function () {
      clearTimeout(cur.saveWriteDraftTO);
      cur.saveWriteDraftTO = setTimeout(IM.saveWriteDraft, 300);
      IM.checkEditable(this);
    });
    if (cur.wdd && cur.wdd['imw_dd']) {
      IM.showToDialog(cur.wdd['imw_dd'].selected);
    } else if (cur.ddfriends) {
      stManager.add(['wide_dd.css', 'wide_dd.js'], IM.initWriteDD);
    } else {
      ajax.post('hints.php', {act: 'a_json_friends', from: 'imwrite', str: ''}, {stat: ['wide_dd.css', 'wide_dd.js'], onDone: function(arr) {
        cur.ddfriends = arr;
        IM.initWriteDD();
      }});
    }
    if (!cur.imwMedia) {
      cur.imwMediaSaved = {};
      cur.imwMedia = initAddMedia('imw_attach', 'imw_media_preview', [['photo', getLang('profile_wall_photo')], ['video', getLang('profile_wall_video')], ['audio', getLang('profile_wall_audio')], ['doc', getLang('profile_wall_doc')], ['map', getLang('profile_wall_map')]], {mail: 1, editable: 1, sortable: 1, teWidth: 350, teHeight: 300, toggleLnk: 1});
      cur.imwMedia.onChange = function(type, value, data) {
        if (type) {
          show('imw_media_preview');
          cur.imwMediaSaved[type + value] = [type, value, data];
        } else if (!cur.imwMedia.attachCount()) {
          hide('imw_media_preview');
        }
        IM.updateNewMsg();
        clearTimeout(cur.saveWriteDraftTO);
        cur.saveWriteDraftTO = setTimeout(IM.saveWriteDraft, 300);
        setTimeout(function() {
          var el = ge('imw_media_preview'), cnt = geByClass1('page_pics_preview', el).childNodes.length + geByClass1('page_docs_preview', el).childNodes.length;
          toggle('imw_attach', (cnt < 10));
        });
      };
      cur.imwMedia.onProgress = function(type) {
        if (type) {
          show('imw_media_preview');
        }
      }
      IM.restoreWriteDraft();
    }
    var tt = ge('im_emoji_block');
    IM.reappendEmoji(tt);
  },
  clearWrite: function() {
    WideDropdown.deselect('imw_dd');
    val(IM.getNewTxt(), '');
    val('imw_title', '');
    IM.checkNewLen(IM.getNewTxt());
    cur.imwMedia.unchooseMedia();
    cur.imwMediaSaved = {};
    hide('imw_title_wrap');
  },
  updateNewMsg: function() {
    cur.lastWasIMW = ((cur.newTxtV || {}).lastLen || isVisible('imw_media_preview')) ? true : false;
  },
  checkNewLen: function(inp) {
    if (!cur.newTxtV) cur.newTxtV = {};
    cur.newTxtV.value = IM.editableVal(inp);
    checkTextLength(4096, cur.newTxtV, 'imw_warn');
    var dd = cur.wdd && cur.wdd['imw_dd'], mchat = dd.full && (dd.selCount == 1);
    if (!dd) return;
    toggle('imw_title_wrap', (cur.newTxtV.lastLen > 200 && !mchat || dd.selCount > 1 || val('imw_title')));
    IM.updateNewMsg();
  },
  sendNewMsg: function() {
    var txt = IM.getNewTxt(), text = IM.editableVal(txt), media = cur.imwMedia ? cur.imwMedia.getMedias() : [], dd = cur.wdd && cur.wdd['imw_dd'];
    if (!dd || !dd.selCount) {
      return elfocus('imw_inp');
    }
    if (cur.editable) {
      IM.extractEmoji(txt, IM.getWritePeer());
    }
    var params = {
      act: 'a_send',
      chas: cur.writeHash,
      message: text,
      title: (isVisible('imw_title_wrap') && val('imw_title') || ''),
      from: 'im',
      media: [],
      to_ids: []
    };
    for (var i = 0, l = media.length, v; i < l; ++i) {
      if (v = media[i]) {
        params.media.push(v[0] + ':' + v[1]);
      }
    }
    params.media = params.media.join(',');
    if (!text && !params.media) {
      return cur.editable ? IM.editableFocus(IM.getNewTxt(), domLC(IM.getNewTxt())) : elfocus(IM.getNewTxt());
    }

    for (var i in dd.selected) {
      params.to_ids.push(i.replace(/_$/, ''));
    }
    params.to_ids = params.to_ids.join(',');

    ajax.post('al_mail.php', params, {onDone: function(peer) {
      IM.clearWrite();
      clearTimeout(cur.saveWriteDraftTO);
      if (peer) {
        ls.set('im_draft' + vk.id + '_' + peer, false);
      }
      if (cur.tabs[peer] && (!cur.tabs[peer].history || cur.tabs[peer].q_offset)) {
        IM.clearHistory(peer, ge('im_log' + peer));
      }
      IM.addPeer(peer);
    }, showProgress: lockButton.pbind('imw_send'), hideProgress: unlockButton.pbind('imw_send')});
  },
  curEmojiSet: ['D83DDE0A', 'D83DDE03', 'D83DDE09', 'D83DDE06', 'D83DDE1C', 'D83DDE0B', 'D83DDE0D', 'D83DDE0E', 'D83DDE12', 'D83DDE0F', 'D83DDE14', 'D83DDE22', 'D83DDE2D', 'D83DDE29', 'D83DDE28', 'D83DDE10', 'D83DDE0C', 'D83DDE04', 'D83DDE07', 'D83DDE30', 'D83DDE32', 'D83DDE33', 'D83DDE37', 'D83DDE02', '2764', 'D83DDE1A', 'D83DDE15', 'D83DDE2F', 'D83DDE26', 'D83DDE35', 'D83DDE20',  'D83DDE21', 'D83DDE1D', 'D83DDE34', 'D83DDE18', 'D83DDE1F', 'D83DDE2C', 'D83DDE36', 'D83DDE2A', 'D83DDE2B', '263A', 'D83DDE00', 'D83DDE25', 'D83DDE1B', 'D83DDE16', 'D83DDE24', 'D83DDE23', 'D83DDE27', 'D83DDE11', 'D83DDE05', 'D83DDE2E', 'D83DDE1E', 'D83DDE19', 'D83DDE13', 'D83DDE01', 'D83DDE31', 'D83DDE08', 'D83DDC7F', 'D83DDC7D', 'D83DDC4D', 'D83DDC4E', '261D', '270C', 'D83DDC4C', 'D83DDC4F', 'D83DDC4A', '270B', 'D83DDE4F', 'D83DDC43', 'D83DDC46', 'D83DDC47', 'D83DDC48', 'D83DDCAA', 'D83DDC42', 'D83DDC8B', 'D83DDCA9', '2744', 'D83CDF4A', 'D83CDF77', 'D83CDF78', 'D83CDF85', 'D83DDCA6', 'D83DDC7A', 'D83DDC28', 'D83DDD1E', 'D83DDC79', '26BD', '26C5', 'D83CDF1F', 'D83CDF4C', 'D83CDF7A', 'D83CDF7B', 'D83CDF39', 'D83CDF45', 'D83CDF52', 'D83CDF81', 'D83CDF82', 'D83CDF84', 'D83CDFC1', 'D83CDFC6', 'D83DDC0E', 'D83DDC0F', 'D83DDC1C', 'D83DDC2B', 'D83DDC2E', 'D83DDC03', 'D83DDC3B', 'D83DDC3C', 'D83DDC05', 'D83DDC13', 'D83DDC18', 'D83DDC94', 'D83DDCAD', 'D83DDC36', 'D83DDC31', 'D83DDC37', 'D83DDC11', '23F3', '26BE', '26C4', '2600', 'D83CDF3A', 'D83CDF3B', 'D83CDF3C', 'D83CDF3D', 'D83CDF4B', 'D83CDF4D', 'D83CDF4E', 'D83CDF4F', 'D83CDF6D', 'D83CDF37', 'D83CDF38', 'D83CDF46', 'D83CDF49', 'D83CDF50', 'D83CDF51', 'D83CDF53', 'D83CDF54', 'D83CDF55', 'D83CDF56', 'D83CDF57', 'D83CDF69', 'D83CDF83', 'D83CDFAA', 'D83CDFB1', 'D83CDFB2', 'D83CDFB7', 'D83CDFB8', 'D83CDFBE', 'D83CDFC0', 'D83CDFE6', 'D83DDE38'],
  curEmojiKeys: {},
  ttEmojiList: function() {
    var list = [];
    var ems = IM.curEmojiSet;
    var recent = [];
    var recentList = {};

    for (var i in ems) {
      var code = ems[i];
      IM.curEmojiKeys[code] = 1;
      var str = IM.emojiWrapItem(code, i);
      list.push(str);
    }
    if (recent.length) {
      list.unshift.apply(list, recent);
    }
    var loadingEl = '<div align="center" id="im_emoji_progress"><span class="progress_inline progress_gray"></span></div>';

    return list.join('')+loadingEl;
  },
  emojiWrapItem: function(code, i) {
    var info = IM.cssEmoji[code];
    if (info) {
      var titleStr = ' title="'+info[1]+'"';
    } else {
      var titleStr = '';
    }
    return '<a class="im_emoji_cont '+((code != '2764' && i && (i < 54)) ? 'im_emoji_smile_cont' : '')+'" '+titleStr+' onmousedown="IM.addEmoji(\''+code+'\', this); return cancelEvent(event);" onmouseover="return IM.emojiOver(this);"><div class="im_emoji_bg"></div><div class="im_emoji_shadow"></div>'+IM.getEmojiHTML(code)+'</a>'
  },
  reappendEmoji: function(tt) {
    if (cur.peer == -3) {
      ge('imw_buttons').appendChild(ge('im_rcemoji_cont'));
    } else {
      ge('im_send_wrap').insertBefore(ge('im_rcemoji_cont'), ge('im_add_media'));
    }
    if (!tt) return;
    if (cur.peer == -3) {
      var smile = ge('imw_smile'), txt = IM.getNewTxt(), diff = (txt.scrollHeight > txt.offsetHeight) ? sbWidth() : 0
      domPN(smile).insertBefore(tt, smile);
      setStyle(tt, vk.rtl ? {marginRight: 306 - diff} : {marginLeft: 306 - diff});
    } else {
      var controls = ge('im_peer_controls'), diff = cur.isSized ? sbWidth() : 0;
      controls.insertBefore(tt, domFC(controls));
      setStyle(tt, vk.rtl ? {marginRight: 303 - diff} : {marginLeft: 303 - diff});
    }
    clearTimeout(cur.ttEmojiHide);
    hide(tt);
  },
  ttEmoji: function(obj, needHide, needShow) {
    if ((needHide && !cur.emojiShown) || (needShow && cur.emojiShown)) {
      return;
    }
    if (!obj) {
      obj = cur.emojiShown || ge((cur.peer == -3) ? 'imw_smile' : 'im_smile');
    }
    if (obj.tt && obj.tt.destroy) {
      obj.tt.destroy();
    }
    if (cur.emojiPeer != cur.peer && cur.emojiMore) {
      if (cur.emojiScroll) cur.emojiScroll.scrollTop(0);
      if (cur.peer > 0 && cur.peer < 2e9 && false) {
        ajax.post('al_im.php', {act: 'get_emoji_list', only_peer: 1, peer: cur.peer}, {
          onDone: function(html) {
            if (!html) return;
            ge('im_emoji_scroll').appendChild(cf(html));
            if (cur.emojiScroll && cur.emojiExpanded) {
              cur.emojiScroll.update(false, true);
            }
          },
          cache: 1
        });

      }
    }
    cur.emojiPeer = cur.peer;
    var tt = ge('im_emoji_block');
    if (!tt) {
      var tt = ce('div', {
        id: 'im_emoji_block',
        className: 'im_emoji_tt_wrap',
        innerHTML: '<div id="im_emoji_pointer"></div><a id="im_emoji_expand" onclick="IM.emojiExpand(this);"><div class="im_emoji_expand_icon"></div></a><div class="im_emoji_expand_shadow"></div><div class="im_emoji_expand_locker"></div><div id="im_emoji_expand_shadow_top"></div><div id="im_emoji_list"><div id="im_emoji_scroll">'+IM.ttEmojiList()+'</div></div>'
      });
      IM.reappendEmoji(tt);
      IM.emojiOver(ge('im_emoji_scroll').firstChild);
    }
    clearTimeout(cur.ttEmojiHide);
    if (cur.emojiShown) {
      var toParams = {marginTop: -128, opacity: 0};
      if (IM.cssAnimation()) {
        addClass(tt, 'im_emoji_animation');
        setStyle(tt, toParams);
        cur.ttEmojiHide = setTimeout(function() {
          removeClass(tt, 'im_emoji_animation');
          hide(tt);
        }, 1000);
      } else {
        setTimeout(function() {
          animate(tt, toParams, 200, function() {
            hide(tt);
          });
        }, 10);
      }
      cur.emojiShown = false;
      cur.emojiFocused = false;
      cur.onMouseClick = false;
      if (cur.peer == -3) {
        IM.anim(obj, 0);
      } else {
        addClass(obj, 'im_smile_animation');
        clearTimeout(cur.imSmileAnim);
        cur.imSmileAnim = setTimeout(removeClass.pbind(obj, 'im_smile_animation'), 1000);
        removeClass(obj, 'im_smile_on');
      }
    } else {
      show(tt);
      var toParams = {marginTop: -118, opacity: 1};
      if (IM.cssAnimation()) {
        addClass(tt, 'im_emoji_animation');
        setTimeout(setStyle.pbind(tt, toParams), 100);
      } else {
        setTimeout(function() {
          show(tt);
          animate(tt, toParams, 200);
        }, 10);
      }
      cur.emojiShown = obj;
      cur.emojiFocused = true;
      cur.onMouseClick = function(e) {
        var el = e.target;
        while(el) {
          if (el.id == 'im_texts' || el.id == 'im_emoji_block' || el.id == 'imw_emoji_wrap') {
            return false;
          }
          el = el.parentNode;
        }
        IM.ttEmoji(false, true);
      }
      if (cur.peer == -3) {
        IM.anim(obj, 1);
      } else {
        addClass(obj, 'im_smile_animation')
        clearTimeout(cur.imSmileAnim);
        cur.imSmileAnim = setTimeout(removeClass.pbind(obj, 'im_smile_animation'), 1000);
        addClass(obj, 'im_smile_on');
      }
      if (cur.emojiScroll && cur.emojiExpanded) {
        cur.emojiScroll.update(false, true);
      }
    }
    if (!cur.emojiExpanded) {
      IM.emojiExpand();
    }
  },
  emojiOpera: function() { // fuck opera!
    if (browser.opera && !browser.mobile) {
      animate('im_emoji_block', {opacity: 0.99}, 20, animate.pbind('im_emoji_block', {opacity: 1}, 20));
    }
  },
  emojiExpand: function() {
    var block = ge('im_emoji_block');
    var list = ge('im_emoji_list');
    if (IM.cssAnimation()) {
      removeClass(block, 'im_emoji_animation')
    }
    addClass(block, 'im_emoji_expanded');

    if (cur.emojiScroll) {
      cur.emojiScroll.enable()
    } else {
      var topShown = false;
      var bottomShown = false;
      cur.emojiScroll = new Scrollbar(list, {
        prefix: 'im_e_',
        nomargin: true,
        global: true,
        nokeys: true,
        right: vk.rtl ? 'auto' : 10,
        left: !vk.rtl ? 'auto' : 10,
        scrollChange: function(top) {
          if (window.tooltips) {
            tooltips.destroyAll();
            cur.ttScrollTime = new Date().getTime();
          }
          if (top && !topShown) {
            show('im_emoji_expand_shadow_top');
            topShown = true;
          } else if (!top && topShown) {
            topShown = false;
            hide('im_emoji_expand_shadow_top');
          }
          if (top > 10 && !cur.emojiMoreSt) {
            IM.emojiLoadMore();
          }
          IM.emojiOpera();
        },
        more: IM.emojiShowMore
      });
    }
    cur.emojiExpanded = true;
  },
  emojiShowMore: function() {
    if (cur.allEmojiCodes) {
      var code;
      var shown = 0;
      var cont = ge('im_emoji_scroll');
      var str = '';
      re('im_emoji_progress');
      while(code = cur.allEmojiCodes[cur.allEmojiId]) {
        cur.allEmojiId += 1;
        if (IM.curEmojiKeys[code]) {
          continue;
        }
        str += IM.emojiWrapItem(code);
        shown += 1;
        if (shown > 128) {
          break;
        }
      }
      if (str) {
        cont.appendChild(cf(str));
        cur.emojiScroll.update(false, true)
      }
    } else {
      cur.onEmojiLoad = IM.emojiShowMore;
    }
  },
  emojiLoadMore: function() {
    cur.emojiMoreSt = 1;
    ajax.post('im', {act: 'get_emoji_list'}, {
      onDone: function(codes) {
        cur.allEmojiId = 0;
        cur.allEmojiCodes = codes;
        if (cur.onEmojiLoad) {
          cur.onEmojiLoad();
        }
      }
    })
  },
  ttEmojiOver: function(obj) {
    animate(obj, {opacity: 1}, 200);
  },
  ttEmojiOut: function(obj) {
    animate(obj, {opacity: 0.7}, 200);
  },
  txtVal: function(el, text) {
    if (cur.editable) {
      el.innerHTML = clean(text);
    } else {
      val(el, text);
    }
  },
  onEditablePaste: function(editable) {
    setTimeout(function(){
      IM.cleanCont(editable);
    }, 0);
    IM.checkEditable(editable);
  },
  cleanCont: function(cont) {
    var el = cont.firstChild;
    while (el) {
      var next = el.nextSibling;
      switch (el.nodeType) {
        case 1:
          if (el.tagName == 'DIV' || el.tagName == 'P') {
            el.setAttribute('style', '');
            el.className = '';
            el.id = '';
            IM.cleanCont(el);
          } else if (el.tagName == 'IMG') {
            if (!el.getAttribute('emoji')) {
              re(el);
            }
          } else if (el.tagName != 'BR' ){
            var text = IM.editableVal(el, {saveEmoji: true});
            var f = cf(clean(text).replace(/\n/g, '<br/>'));
            var last = f.lastChild;
            el.parentNode.replaceChild(f, el);
            if (last) {
              IM.editableFocus(cont, last, true);
            }
          }
          break;
      }
      el = next;
    }
  },
  codeToChr: function(code) {
    var len = code.length / 4;
    var chr = '';
    var i = 0;
    while(len--) {
      chr += String.fromCharCode(parseInt(code.substr(i, 4), 16))
      i += 4;
    }
    return chr;
  },
  editableHasVal: function(cont) {
    if (!cont) return false;
    if (cont.tagName == 'TEXTAREA') return !!val(cont);
    return !!(geByTag1('IMG', cont) || stripHTML(val(cont)).replace(/[\s\xa0]/g, '').length);
  },
  editableVal: function(cont, opts) {
    if (!cont) return '';
    if (cont.tagName == 'TEXTAREA') return val(cont);
    var el = cont.firstChild;
    var v = '';
    var contTag = new RegExp('^(DIV|P|LI|OL|TR|TD|BLOCKQUOTE)$');
    while (el) {
      switch (el.nodeType) {
        case 3:
          var str = el.data.replace(/^\n|\n$/g, ' ').replace(/[\n\xa0]/g, ' ').replace(/[ ]+/g, ' ');
          v += str;
          break;
        case 1:
          var str = IM.editableVal(el);
          if (el.tagName && el.tagName.match(contTag) && str) {
            if (str.substr(-1) != '\n') {
              str += '\n';
            }

            var prev = el.previousSibling;
            while(prev && prev.nodeType == 3 && trim(prev.nodeValue) == '') {
              prev = prev.previousSibling;
            }
            if (prev && !(prev.tagName && prev.tagName.match(contTag))) {
              str = '\n' + str;
            }

          } else if (el.tagName == 'IMG') {
            var code = el.getAttribute('emoji');
            if (code) {
              if (opts && opts.saveEmoji) {
                str += IM.getEmojiHTML(code);
              } else {
                str += IM.codeToChr(code);
              }
            }
          } else if (el.tagName == 'BR') {
            str += '\n';
          }
          v += str;
          break;
      }
      el = el.nextSibling;
    }
    return v;
  },
  checkEditable: function(obj) {
    if (!obj) return;
    if (obj.id == 'imw_editable') {
      var diff = (obj.scrollHeight > obj.offsetHeight) ? sbWidth() : 0, bl = ge('im_emoji_block');
      setStyle(ge('imw_smile'), vk.rtl ? {marginRight: 396 - diff} : {marginLeft: 396 - diff});
      if (bl) setStyle(bl, vk.rtl ? {marginRight: 306 - diff} : {marginLeft: 306 - diff});
      return;
    }

    var scH = obj.scrollHeight;
    if (scH > 190) {
      if (!cur.isSized) {
        addClass(cur.imEl.controls, 'im_editable_fixed');
        var sm = ge('im_smile'), bl = ge('im_emoji_block');
        var ph = ge('im_upload');
        var diff = sbWidth();
        setStyle(sm, vk.rtl ? {marginRight: 333 - diff} : {marginLeft: 333 - diff});
        if (ph) {
          setStyle(ph.parentNode, vk.rtl ? {marginRight: 333 - diff} : {marginLeft: 333 - diff});
        }
        if (bl) setStyle(bl, vk.rtl ? {marginRight: 303 - diff} : {marginLeft: 303 - diff})
        cur.isSized = true;
      }
    } else if (cur.isSized) {
      removeClass(cur.imEl.controls, 'im_editable_fixed');
      var sm = ge('im_smile'), bl = ge('im_emoji_block');
      var ph = ge('im_upload');
      setStyle(sm, vk.rtl ? {marginRight: 333}: {marginLeft: 333});
      if (ph) {
        setStyle(ph.parentNode, vk.rtl ? {marginRight: 333}: {marginLeft: 333});
      }
      if (bl) setStyle(bl, vk.rtl ? {marginRight: 303} : {marginLeft: 303})
      cur.isSized = false;
    }
    if (cur.prevScHeight !== scH) {
      cur.prevScHeight = scH;
      var bottom = cur.bottom;

      if (!IM.r() && cur.focused == cur.peer) {
        IM.panelUpdate(true);
      }

      IM.updateScroll();
      if (bottom && !cur.bottom) {
        IM.scroll();
      }
    }
  },
  editableFocus: function(editable, obj, after) {
    if (!editable) {
      return false;
    }
    editable.focus();
    if (editable.phonfocus) {
      editable.phonfocus();
    }
    if (typeof window.getSelection != 'undefined' && typeof document.createRange != 'undefined') {
      var sel = window.getSelection();
      if (browser.opera && !after) {
        sel.collapse(obj || editable, 0);
      } else {
        var range = document.createRange();
        if (obj) {
          range.selectNode(obj);
        } else {
          range.selectNodeContents(editable);
        }
        range.collapse(after ? false : true);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
    } else if (typeof document.body.createTextRange != 'undefined') {
      var textRange = document.body.createTextRange();
      textRange.moveToElementText(obj || editable);
      textRange.collapse(after ? false : true);
      textRange.select();
    }
  },
  cssEmoji: {
    'D83DDE0A': [0, ':-)'], 'D83DDE03': [1, ':-D'], 'D83DDE09': [2, ';-)'], 'D83DDE06': [3, 'xD'], 'D83DDE1C': [4, ';-P'], 'D83DDE0B': [5, ':-p'], 'D83DDE0D': [6, '8-)'], 'D83DDE0E': [7, 'B-)'], 'D83DDE12': [8, ':-('], 'D83DDE0F': [9, ':]'], 'D83DDE14': [10, '3('], 'D83DDE22': [11, ':\'('], 'D83DDE2D': [12, ':_('], 'D83DDE29': [13, ':(('], 'D83DDE28': [14, ':o'], 'D83DDE10': [15, ':|'], 'D83DDE0C': [16, '3-)'], 'D83DDE20': [17, '>('], 'D83DDE21': [18, '>(('], 'D83DDE07': [19, 'O:)'], 'D83DDE30': [20, ';o'], 'D83DDE33': [21, '8|'], 'D83DDE32': [22, '8o'], 'D83DDE37': [23, ':X'], 'D83DDE1A': [24, ':-*'], 'D83DDE08': [25, '}:)'], '2764': [26 , '<3'], 'D83DDC4D': [27, ':like:'], 'D83DDC4E': [28, ':dislike:'], '261D': [29, ':up:'], '270C': [30, ':v:'], 'D83DDC4C': [31, ':ok:']
  },
  imgEmoji: {'D83DDE15': 1, 'D83DDE1F': 1, 'D83DDE2E': 1, 'D83DDE34': 1},
  getEmojiHTML: function(code, symbol, enabled) {
    var editable = (browser.msie && intval(browser.version) > 8) ? ' contenteditable="false"' : '';
    if (IM.cssEmoji[code] != undefined) {
      var num = -IM.cssEmoji[code][0] * 17;
      return '<img'+editable+' src="/images/blank.gif" class="emoji emoji_css" style="background-position: 0px '+num+'px;" emoji="'+code+'" align="middle" />';
    } else {
      if (!IM.imgEmoji[code] && symbol && !enabled) {
        return symbol;
      } else {
        return '<img class="emoji" emoji="'+code+'" align="middle" src="/images/emoji'+(window.devicePixelRatio >= 2 ? '_2x' : '')+'/'+code+'.png" />';
      }
    }
  },
  ttUnlockEmojiHide: function() {
    clearTimeout(cur.ttUnlockHide);
    cur.ttUnlockHide = setTimeout(function() {
      fadeOut(cur.ttUnlock);
    }, 100);
  },
  ttUnlockEmoji: function(obj) {
    if (cur.emoji == 2) {
      return false;
    }
    return false;
    clearTimeout(cur.ttUnlockHide);
    var block = ge('im_emoji_block');
    if (!cur.ttUnlock) {
      cur.ttUnlock = ce('div', {
        className: 'im_unlock_tt_cont',
        innerHTML: '<span class="im_unlock_tt">'+getLang('mail_im_enable_emoji')+'</span><div class="im_unlock_pointer"></div>'
      });
      block.insertBefore(cur.ttUnlock, block.firstChild);
    }
    var tt = cur.ttUnlock;
    if (!isVisible(tt)) {
      fadeIn(tt, 100);
    }
    var pos = getXY(obj)
    var bpos = getXY(block);
    setStyle(tt, {marginLeft: pos[0] - bpos[0] - 105, marginTop: pos[1] - bpos[1] - 40});
  },
  emojiOver: function(obj) {
    addClass(obj, 'im_emoji_over');
    if (cur.emojiOvered && cur.emojiOvered != obj) {
      removeClass(cur.emojiOvered, 'im_emoji_over');
    }
    cur.emojiOvered = obj;
    IM.emojiOpera();
  },
  addEmoji: function(code, obj) {
    cur.emojiFocused = false;
    if (cur.editable) {
      if (browser.mozilla || browser.msie) {
        var img = ' '+IM.getEmojiHTML(code)+'&nbsp;';
      } else {
        var img = ' '+IM.getEmojiHTML(code)+'&nbsp;';
      }
      var editable = IM.getTxt(cur.peer);
      var sel = window.getSelection ? window.getSelection() : false;
      if (sel && sel.rangeCount) {
        r = sel.getRangeAt(0);
        if (r.commonAncestorContainer) {
          var rCont = r.commonAncestorContainer;
        } else {
          var rCont = r.parentElement ? r.parentElement() : r.item(0);
        }
      } else {
        var rCont = false;
      }
      el = rCont;
      while(el && el != editable) {
        el = el.parentNode;
      }
      var edLast = (editable.lastChild || {});
      if (browser.mozilla && edLast.tagName == 'BR' && !edLast.previousSibling) {
        re(editable.lastChild);
      }
      if (!el) {
        IM.editableFocus(editable, false, true);
      }
      if (browser.msie) {
        var r = document.selection.createRange();
        if (r.pasteHTML) {
          r.pasteHTML(img);
        }
      } else {
        document.execCommand('insertHTML', false, img);
      }
      var emojies = geByClass('emoji', editable);
      for (i in emojies) {
        var prev = emojies[i].previousSibling;
        if (prev && prev.nodeType == 3 && prev.textContent && prev.textContent.charCodeAt(0) == 32) {
          var p = prev.previousSibling;
          if (p && p.nodeType == 3 && p.textContent && p.textContent.charCodeAt(p.textContent.length - 1) == 160) {
            re(prev);
          }
        }
      }
      if (editable.check) editable.check();
    } else {
      var textArea = IM.getTxt();
      var val = textArea.value;
      if (browser.iphone || browser.ipad) {
        var text = IM.codeToChr(code);
      } else {
        var text = IM.cssEmoji[code][1]+' ';
      }
      var endIndex, range;
      if (textArea.selectionStart != undefined && textArea.selectionEnd != undefined) {
        endIndex = textArea.selectionEnd;
        textArea.value = val.slice(0, textArea.selectionStart) + text + val.slice(endIndex);
        textArea.selectionStart = textArea.selectionEnd = endIndex + text.length;
      } else if (typeof document.selection != 'undefined' && typeof document.selection.createRange != 'undefined') {
        textArea.focus();
        range = document.selection.createRange();
        range.text = text;
        range.select();
      }
    }
    IM.saveDraft(cur.peer);
  },
  emojiToHTML: function(str, enabled) {
    if (browser.ipad || browser.iphone) {
      return str;
    }
    str = str.replace(/&nbsp;/g, ' ').replace(/<br>/g, "\n");
    var regs = {
      'D83DDE07': /(\s|^)([0O�]:\))([\s\.,]|$)/g,
      'D83DDE09': /(\s|^)(;-\)+)([\s\.,]|$)/g,
      'D83DDE06': /(\s|^)([X�x�]-?D)([\s\.,]|$)/g,
      'D83DDE0E': /(\s|^)(B-\))([\s\.,]|$)/g,
      'D83DDE0C': /(\s|^)(3-\))([\s\.,]|$)/g,
      'D83DDE20': /(\s|^)(&gt;\()([\s\.,]|$)/g,
      'D83DDE30': /(\s|^)(;[o�O�])([\s\.,]|$)/g,
      'D83DDE33': /(\s|^)(8\|)([\s\.,]|$)/g,
      'D83DDE32': /(\s|^)(8-?[o�O�])([\s\.,]|$)/g,
      'D83DDE0D': /(\s|^)(8-\))([\s\.,]|$)/g,
      'D83DDE37': /(\s|^)(:[X�])([\s\.,]|$)/g,
      'D83DDE28': /(\s|^)(:[o�O�])([\s\.,]|$)/g,
      '2764': /(\s|^)(&lt;3)([\s\.,]|$)/g
    };
    for (var code in regs) {
      str = str.replace(regs[code], function(match, pre, smile, space) {
        return (pre || '') + IM.getEmojiHTML(code)+(space || '');
      });
    }
    var regs = {
      'D83DDE0A': /(:-\))([\s\.,]|$)/g,
      'D83DDE03': /(:-D)([\s\.,]|$)/g,
      'D83DDE1C': /(;-[P�])([\s\.,]|$)/g,
      'D83DDE0B': /(:-[p�])([\s\.,]|$)/g,
      'D83DDE12': /(:-\()([\s\.,]|$)/g,
      'D83DDE0F': /(:-?\])([\s\.,]|$)/g,
      'D83DDE14': /(3-?\()([\s\.,]|$)/g,
      'D83DDE22': /(:&#039;\()([\s\.,]|$)/g,
      'D83DDE2D': /(:_\()([\s\.,]|$)/g,
      'D83DDE29': /(:\(\()([\s\.,]|$)/g,
      //'D83DDE15': /(:\\)([\s\.,]|$)/g,
      'D83DDE10': /(:\|)([\s\.,]|$)/g,
      'D83DDE21': /(&gt;\(\()([\s\.,]|$)/g,
      'D83DDE1A': /(:-\*)([\s\.,]|$)/g,
      'D83DDE08': /(\}:\))([\s\.,]|$)/g,
      'D83DDC4D': /(:like:)([\s\.,]|$)/g,
      'D83DDC4E': /(:dislike:)([\s\.,]|$)/g,
      '261D': /(:up:)([\s\.,]|$)/g,
      '270C': /(:v:)([\s\.,]|$)/g,
      'D83DDC4C': /(:ok:|:��:)([\s\.,]|$)/g
    };
    for (var code in regs) {
      str = str.replace(regs[code], function(match, smile, space) {
        return IM.getEmojiHTML(code)+(space || '');
      });
    }
    str = str.replace(/\n/g, '<br>');
    str = str.replace(IM.emojiRegEx, IM.emojiReplace);

    return str;
  },
  emojiReplace: function (symbol) {
    var i = 0;
    var code = '', num;
    while(num = symbol.charCodeAt(i++)) {
      code += num.toString(16);
    }
    if (symbol.match(/[\uDDE7-\uDDFA]/)) {
      if (cur.flagSymbol) {
        code = cur.flagSymbol + code;
        cur.flagSymbol = false;
      } else {
        cur.flagSymbol = code;
        return '';
      }
    }
    code = code.toUpperCase();
    return IM.getEmojiHTML(code, symbol, cur.emoji);
  },
  cssAnimation: function() {
    var v = intval(browser.version);
    if ((browser.chrome && v > 14) || (browser.mozilla && v > 13) || (browser.opera && v > 2)) {
      return (cur.peer != -3);
    }
    return false;
  },
  getMsgInfo: function(msgId, kludges, user) {
    var info = '';
    if (kludges['attach1_type'] == 'gift' || kludges['source_act']) {
      info = '<span id="im_msg_info'+msgId+'"></span>';
    }
    return info;
  },

  anim: function(el, to) {
    clearInterval(cur._imAnim);
    var dt = 300, dStep = 45 / (dt / 13), oStep = 1 / (dt / 13), steps = Math.floor(dt / 13), i = 0;
    var el1 = domLC(el), el2 = domFC(el);
    var dFrom1 = to ? 0 : 45, dTo1 = to ? 45 : 0, oFrom1 = to ? 1 : 0, oTo1 = to ? 0 : 1;
    cur._imAnim = setInterval(function() {
      ++i;
      var d1 = (i >= steps) ? dTo1 : (dFrom1 + dStep * i * (to ? 1 : -1)), d2 = d1 - 45;
      var o1 = (i >= steps) ? oTo1 : (oFrom1 + oStep * i * (to ? -1 : 1)), o2 = 1 - o1;
      el1.style.WebkitTransform = el1.style.OTransform = el1.style.transform = 'rotate(' + d1 + 'deg)';
      el2.style.WebkitTransform = el2.style.OTransform = el2.style.transform = 'rotate(' + d2 + 'deg)';
      el1.style.opacity = o1;
      el2.style.opacity = o2;
      if (i >= steps) {
        clearInterval(cur._imAnim);
        (to ? addClass : removeClass)(el, 'im_smile_on');
        el1.style.WebkitTransform = el1.style.OTransform = el1.style.transform = el2.style.WebkitTransform = el2.style.OTransform = el2.style.transform = el1.style.opacity = el2.style.opacity = '';
      }
    }, 13);
  },
  calendarUpd: function(clearInp) {
    if (cur.imDPIgnore) {
      cur.imDPIgnore = false;
      return;
    }
    var d = val('im_datesearch').split('.'), c = new Date();
    c = [c.getDate(), c.getMonth() + 1, c.getFullYear()];
    if (d[2] > c[2] || d[2] == c[2] && (d[1] > c[1] || d[1] == c[1] && d[0] > c[0])) {
      cur.imDP.setDate();
      return;
    }
    if (clearInp === 'clear') {
      cur.imDP.setDate();
      cur.imSD = false;
    } else if (cur.imSD == val('im_datesearch')) {
      return;
    } else {
      cur.imSD = val('im_datesearch');
    }
    cur.qDay = cur.imSD ? IM.dayFromVal(cur.imSD) : false;
    IM.searchMessages();
    cur.imDP.hide();
  },
  calendarUpdTip: function(ttip) {
    var el = ge('im_search_date');
    if (!el) return;
    if (el.tt && el.tt.destroy) el.tt.destroy();
    el.onmouseover = showTooltip.pbind(el, {text: ttip || getLang('mail_im_date_search'), black: 1, shift: [10, 3, 3]});
  },
  calendar: function() {
    stManager.add(['ui_controls.js', 'datepicker.js', 'datepicker.css'], function() {
      if (!cur.imDP) {
        var clLnk = '<td class="im_cal_clear" colspan="7"><a onclick="IM.calendarUpd(\'clear\');" class="im_cal_clear_lnk">' + getLang('wall_clear_date_filter') + '</a></td>';
        cur.imDP = new Datepicker(ge('im_datesearch'), {
          width: 140,
          resfmt: 'plain',
          addRows: '<tr id="im_day_clear">' + clLnk + '</tr>',
          addRowsM: '<tr id="im_month_clear">' + clLnk + '</tr>',
          onUpdate: IM.calendarUpd
        });
      }
      cur.imDPIgnore = true;
      if (cur.qDay) {
        cur.imDP.setDate(intval(cur.qDay.substr(4)), intval(cur.qDay.substr(2, 2)), intval(cur.qDay.substr(0, 2)));
        cur.imSD = val('im_datesearch');
      } else {
        cur.imDP.setDate();
        cur.imSD = false;
      }
      toggleClass(ge('im_datesearch_wrap'), 'im_no_search_day', !cur.imSD);
      triggerEvent(geByClass1('datepicker_control', ge('im_datesearch_wrap')), 'mousedown', false, true);
      ge('im_datesearch_cal_box').style[vk.rtl ? 'right' : 'left'] = ge('im_search_btn')[vk.rtl ? 'offsetRight' : 'offsetLeft'] + 'px';
      ge('im_datesearch_cal_box').style.marginTop = '24px';
    });
  }
};


ImUpload = {
  photoUploaded: function(info, params) {
    // console.trace();
    // debugLog(info, params);
    var i = info.ind !== undefined ? info.ind : info,
        fileName = info.fileName ? info.fileName : info,
        ind = info.fileName ? i + '_' + info.fileName : info,
        prg = ge('upload' + ind + '_progress_wrap');

    prg && hide(geByClass1('progress_x', prg));
    ajax.post('al_photos.php', extend({act: 'choose_uploaded'}, params), {
      onDone: function(media, data) {
        debugLog('chosen', media, data);
        cur.imMedia.chooseMedia('photo', media, extend(data, {upload_ind: i + '_' + fileName}));
      },
      onFail: ImUpload.uploadFailed.pbind(info)
    });
  },
  uploadFailed: function(info, code) {
    // console.trace();
    // debugLog(info, code);
    var i = info.ind !== undefined ? info.ind : info, fileName = info.fileName ? info.fileName : info;
    if (Upload.types[i] == 'fileApi' && !Upload.options[i].wiki_editor) {
      var lnkId, ind = info.fileName ? i+'_'+info.fileName : info;
      if (cur.imMedia) {
        re('upload'+ind+'_progress_wrap');
        lnkId = cur.imMedia.lnkId;
        cur.addMedia[lnkId].unchooseMedia();
      } else if (cur.addMedia) {
        re('upload'+ind+'_progress_wrap');
        lnkId = (cur.attachMediaIndexes || {})[fileName];
        if (lnkId) cur.addMedia[lnkId].unchooseMedia();
      }
    }
    // hide(box.progress);
    topError('Upload failed', {dt: -1, type: 102, url: (ge('file_uploader_form' + i) || {}).action});
    Upload.embed(i);
  },
  show: function () {
    if (!cur.uploadInited) return;
    show(cur.uploadWrap);
  },
  hide: function () {
    if (!cur.uploadInited) return;
    hide(cur.uploadWrap, 'im_upload_dropbox');
  },
  checkDragDrop: function() {
    var b = browser, bv = floatval(browser.version);
    if (!(b.msie && bv >= 9 || b.mozilla && bv >= 3.5 || b.chrome || b.safari)) { // Drag'n'Drop reqs
      return false;
    }
    return (window.XMLHttpRequest || window.XDomainRequest) &&
           (window.FormData || window.FileReader && (window.XMLHttpRequest && XMLHttpRequest.sendAsBinary ||  window.ArrayBuffer && window.Uint8Array && (window.MozBlobBuilder || window.WebKitBlobBuilder || window.BlobBuilder)));
  },
  init: function () {
    removeEvent(bodyNode, 'dragover dragenter');
    var data = cur.upload_options,
        tt = ImUpload.checkDragDrop() ?  ' title="' + getLang('mail_photos_drag_hint') + '"' : '';

    var submitBox = ge('im_write_form'),
        textsWrap = ge('im_texts');

    if (!submitBox || !textsWrap) {
      return;
    }
    textsWrap.insertBefore(cur.uploadWrap = ce('div', {
      className: 'im_upload_wrap fl_r',
      innerHTML: '<div id="im_upload" class="im_upload"' + tt + '></div>'
    }), textsWrap.firstChild);
    submitBox.insertBefore(ce('div', {
      id: 'im_upload_dropbox',
      className: 'im_upload_dropbox',
      innerHTML: '<div class="im_upload_dropbox_inner noselect"><span class="im_upload_drop_label">' + getLang('mail_drop_photos_here') + '</span><span class="im_upload_release_label">' + getLang('mail_release_photos_here') + '</span></div>'
    }), submitBox.firstChild);

    Upload.init('im_upload', data.url, data.params, {
      file_name: 'photo',
      file_size_limit: 1024 * 1024 * 5, // 5Mb
      file_types_description: 'Image files (*.jpg, *.png, *.gif)',
      file_types: '*.jpg;*.JPG;*.png;*.PNG;*.gif;*.GIF',
      file_input: null,
      accept: 'image/jpeg,image/png,image/gif',
      file_match:  data.opts.ext_re,
      lang: data.opts.lang,
      wiki_editor: 0,

      onUploadStart: function(info, res) {
        var i = info.ind !== undefined ? info.ind : info, options = Upload.options[i];
        if (Upload.types[i] == 'form') {
          // show(box.progress);
          geByClass1('file', ge('choose_photo_upload')).disabled = true;
        }
        if (Upload.types[i] == 'fileApi') {
          if (cur.notStarted) {
            boxQueue.hideLast();
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
        ImUpload.photoUploaded(info, params);
      },
      onUploadProgress: function(info, bytesLoaded, bytesTotal) {
        var i = info.ind !== undefined ? info.ind : info;
        if (Upload.types[i] == 'fileApi') {
          var lnkId = (cur.attachMediaIndexes || {})[i];
          if (lnkId === undefined || lnkId && cur.addMedia[lnkId].chosenMedia || cur.imMedia) {
            var data = {loaded: bytesLoaded, total: bytesTotal};
            if (info.fileName) data.fileName = info.fileName;
            cur.imMedia.showMediaProgress('photo', i, data);
          }
        }
      },
      onUploadError: ImUpload.uploadFailed,
      onCheckServerFailed: function () {
        delete cur.uploadInited;
        ImUpload.hide();
      },
      onUploadCompleteAll: function (i) {
        if (Upload.types[i] == 'form') {
          Upload.embed(i);
        }
      },
      onDragEnter: function () {
        var dropEl = ge('im_upload_dropbox').firstChild,
            h = ge('im_write_form').offsetHeight - (browser.webkit || browser.chrome ? 2 : 0);
        setStyle(dropEl, {height: h});
      },

      noFlash: 1,
      multiple: 1,
      multi_progress: 1,
      max_files: 10,
      chooseBox: 1,
      clear: 1,
      type: 'photo',
      max_attempts: 3,
      server: data.opts.server,
      error: data.opts.default_error,
      error_hash: data.opts.error_hash,
      dropbox: 'im_upload_dropbox',
      label: data.opts.label,
      dragEl: bodyNode
    });
    cur.uploadInited = true;
    ImUpload.show();
  }
};

try{stManager.done('im.js');}catch(e){}
