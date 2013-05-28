var Restore = {
  showMsgBox: function(text, title, input) {
    setTimeout(showFastBox({title: title, width: 440, onHide: function() {if (input) ge(input).focus();}}, text).hide, 8000);
  },
  showResult: function(id, text, input) {
    if (cur.wasShown && cur.wasShown != id) hide(cur.wasShown);
    cur.wasShown = id;

    var el = ge(id);
    val(el, text);
    if (isVisible(el)) {
      animate(el, {backgroundColor: '#F4EBBD'}, 100, animate.pbind(el, {backgroundColor: '#F9F6E7'}, 2000));
    } else {
      el.style.backgroundColor = '#F4EBBD';
      show(el);
      animate(el, {backgroundColor: '#F9F6E7'}, 2000);
    }
    setTimeout(function() {
      scrollToY(getXY(el)[1] - 20, 200);
      setTimeout(elfocus.pbind(input), 201);
    }, 1);
  },

  submitDocPhoto: function() {
    var btn = ge('doc_file_button');
    lockButton(btn);
    setTimeout(function() {
      btn.innerHTML = btn.innerHTML; // opera hack for redraw
    }, 0);
    ge('doc_upload_frame').uploadType = 0;
    document.doc_upload.submit();
  },
  submitPersonalPhoto: function() {
    var btn = ge('photo_file_button');
    lockButton(btn);
    setTimeout(function() {
      btn.innerHTML = btn.innerHTML; // opera hack for redraw
    }, 0);
    ge('photo_upload_frame').uploadType = 1;
    document.photo_upload.submit();
  },
  uploadError: function(code, type) {
    var err = '';
    if (!code) {
      err = getLang('global_unknown_error');
    } else if (code == 1 || code == 4) {
      err = getLang('restore_not_uploaded');
    } else if (code == 2) {
      err = getLang('restore_bad_format');
    } else if (code == 5) {
      err = getLang('restore_bad_size');
    }
    setTimeout(showFastBox(getLang('global_error'), err).hide, 2000);

    var prefix = type ? 'photo_' : 'doc_';
    var btn = ge(prefix + 'file_button');
    unlockButton(btn);
  },
  uploadComplete: function(photo, photo_id, photo_hash, type) {
    var prefix = type ? 'photo_' : 'doc_';
    var btn = ge(prefix + 'file_button');
    unlockButton(btn);

    var index = cur.images.length;
    cur.images[index] = {id: photo_id, hash: photo_hash};

    ++cur.images_count[type];

    ge(prefix + 'input').disabled = cur.images_count[type] >= 2 ? true : false;

    show(prefix + 'photos');
    ge(prefix + 'photos').innerHTML += '<div id="photo' + index + '"><img id="photo_img' + index + '" src="' + photo + '" /><span onmouseover="this.className=\'over\';" onmouseout="this.className=\'\';" onclick="Restore.deleteImage(' + type + ', ' + index + ')" id="del_link' + index + '">' + getLang('global_delete') + '</span></div>';
  },
  deleteImage: function(type, index) {
    var prefix = type ? 'photo_' : 'doc_';
    if (cur.images[index].deleted) {
      if (cur.images_count[type] >= 2) return;

      cur.images[index].deleted = false;
      setStyle(ge('photo_img' + index), 'opacity', 1);

      if (++cur.images_count[type] >= 2) {
        ge(prefix + 'input').disabled = true;
      }
      ge('del_link' + index).innerHTML = getLang('global_delete');
    } else {
      cur.images[index].deleted = true;
      setStyle(ge('photo_img' + index), 'opacity', 0.3);

      --cur.images_count[type];
      ge(prefix + 'input').disabled = false;
      ge('del_link' + index).innerHTML = getLang('global_dont_delete');
    }
  },

  submitPageLink: function() {
    var btn = ge('submitBtn');
    var link = val('link');
    if (!link) {
      elfocus('link');
      return;
    }
    hide('error');
    var params = {act: 'a_profile_link', link: link};
    ajax.post('al_restore.php', params, {
      onDone: function(msg, title) {
        ge('error').innerHTML = (title ? '<b>' + title + '</b><br>' : '') + msg;
        show('error');
      },
      onFail: function() {
        unlockButton(btn);
      },
      showProgress: lockButton.pbind(btn),
      hideProgress: unlockButton.pbind(btn)
    });
  },
  usePhoneAsLogin: function() {
    var btn = ge('usePhoneBtn');
    lockButton(btn);
    var params = {act: 'a_new_email', rid: cur.options.request_id, hash: cur.options.lhash, login: -1};
    ajax.post('al_restore.php', params, {
      onDone: function(msg) {
        if (msg) {
          unlockButton(btn);
          Restore.showMsgBox(msg, getLang('global_error'));
        } else {
          nav.reload();
        }
      },
      onFail: function() {
        unlockButton(btn);
      }
    });
  },
  useAnotherEmail: function() {
    var btn = ge('anotherEmailBtn');
    var login = ge('login').value;
    if (!(/^\s*[a-zA-Z0-9_\.]+@[a-zA-Z0-9_\.]+\s*$/.test(login))) {
      Restore.showMsgBox(getLang('restore_error_email'), getLang('global_error'), 'login');
      return;
    }
    lockButton(btn);
    var params = {act: 'a_new_email', rid: cur.options.request_id, hash: cur.options.lhash, login: login};
    ajax.post('al_restore.php', params, {
      onDone: function(msg) {
        if (msg) {
          unlockButton(btn);
          Restore.showMsgBox(msg, getLang('global_error'));
        } else {
          nav.reload();
        }
      },
      onFail: function() {
        unlockButton(btn);
      }
    });
  },
  extendRequest: function() {
    var btn = ge('submitBtn');
    lockButton(btn);
    var params = {act: 'a_extend', rid: cur.options.request_id, hash: cur.options.phash, comment: ge('comment').value, images: []};
    for (var i = 0; i < cur.images.length; ++i) {
      if (!cur.images[i].deleted) {
        params.images.push(cur.images[i].id + '_' + cur.images[i].hash);
      }
    }
    ajax.post('al_restore.php', params, {
      onDone: function(result, msg) {
        if (!result) {
          unlockButton(btn);
          Restore.showMsgBox(msg, getLang('global_error'));
        } else {
          ge('request_result_msg').innerHTML = msg;
          hide('request_result_wrap');
          show('request_result_msg');
        }
      },
      onFail: function() {
        unlockButton(btn);
      }
    });
  },

  submitRequest: function() {
    var btn = ge('submitBtn');
    var request_type = cur.options.request_type;
    var login, email, old_phone, phone, reg_country, reg_year, password;

    if (request_type == 4) {
      login = ge('login').value;
      if (isVisible('email_wrap') && !(/^\s*$/.test(login))) {
        if (!(/^\s*[a-zA-Z0-9_\.\-]+@[a-zA-Z0-9_\.\-]+\s*$/.test(login))) {
          if (!(/^\s*[a-zA-Z0-9_]{6,32}\s*$/.test(login))) {
            return Restore.showResult('request_email_res', getLang('restore_login_error'), 'login');
          }
        }
      }
      email = ge('email').value;
      if (isVisible('email_wrap') && !(/^\s*[a-zA-Z0-9_\.\-]+@[a-zA-Z0-9_\.\-]+\s*$/.test(email))) {
        return Restore.showResult('request_email_res', getLang('restore_email_error'), 'email');
      }
    } else if (!request_type || request_type == 2) {
      login = ge('login').value;
      if (isVisible('email_wrap') && !(/^\s*$/.test(login)) || request_type) {
        if (!(/^\s*[a-zA-Z0-9_\.\-]+@[a-zA-Z0-9_\.\-]+\s*$/.test(login))) {
          if (!(/^\s*[a-zA-Z0-9_]{6,32}\s*$/.test(login))) {
            return Restore.showResult('request_email_res', getLang(request_type == 2 ? 'restore_login_error1' : 'restore_login_error'), 'login');
          }
        }
      }
      email = ge('email').value;
      if (isVisible('email_wrap') && !(/^\s*[a-zA-Z0-9_\.\-]+@[a-zA-Z0-9_\.\-]+\s*$/.test(email))) {
        return Restore.showResult('request_email_res', getLang('restore_email_error'), 'email');
      }
    }

    if (!request_type || request_type == 4) {
      old_phone = ge('old_phone').value.replace(/[^0-9]/g, '');
      if (!(/^\s*$/.test(old_phone))) {
        if (!(/^[1-9][0-9]{6,14}$/.test(old_phone))) {
          return Restore.showResult('request_phone_res', getLang('restore_old_phone_error'), 'old_phone');
        }
      }
    }

    if (request_type != 2) {
      var phone_inp = isVisible('new_phone_wrap') ? 'new_phone' : 'phone';
      phone = ge(phone_inp).value.replace(/[^0-9]/g, '');
      if (isVisible(phone_inp) && !(/^[1-9][0-9]{6,14}$/.test(phone))) {
        return Restore.showResult('request_phone_res', getLang('restore_phone_error'), phone_inp);
      }
    }

    if (request_type == 4) {
      if (!isVisible('new_phone_wrap')) {
        if (!login && !old_phone) {
          var text = getLang('restore_need_email_or_phone');
          text += '<br>' + val('request_email_or_phone_need');
          return Restore.showResult('request_phone_res', text, 'old_phone')
        }
      }

      password = val('old_password');
      if (!password) {
        return Restore.showResult('request_old_password_res', getLang('restore_need_old_password') + '<br>' + val('request_old_password_need'), 'old_password');
      }
    } else {
      reg_country = ge('reg_country').value;
      if (reg_country == 0) {
        cur.uiCountry.showDefaultList();
        return Restore.showResult('request_country_res', getLang('restore_reg_country_error'));
      }
      var reg_year = ge('reg_year').value;
      if (reg_year < 2006 || reg_year > cur.options.max_reg_year) {
        cur.uiYear.showDefaultList();
        return Restore.showResult('request_country_res', getLang('restore_reg_year_error'));
      }
      if (cur.images_count[0] < 1) {
        return Restore.showResult('request_doc_res', getLang('restore_doc_error') + '<br>' + getLang('restore_attention'));
      }
      if (cur.images_count[1] < 1) {
        return Restore.showResult('request_photo_res', getLang('restore_photo_error') + '<br>' + getLang('restore_attention'));
      }
    }

    var params = {act: 'a_request'};
    if (request_type == 4) {
      extend(params, {hash: cur.options.fhash, login: login, email: email, phone: phone, old_phone: old_phone, password: password});
    } else {
      extend(params, {reg_country: reg_country, reg_city: ge('reg_city').value, reg_year: reg_year, comment: ge('comment').value, images: []});
      if (!request_type) {
        extend(params, {hash: cur.options.fhash, login: login, email: email, phone: phone, old_phone: old_phone});
      } else if (request_type == 1) {
        extend(params, {change_phone: 1, phone: phone, old_phone: old_phone});
      } else {
        extend(params, {change_email: 1, login: login, email: email});
      }
      for (var i = 0; i < cur.images.length; ++i) {
        if (!cur.images[i].deleted) {
          params.images.push(cur.images[i].id + '_' + cur.images[i].hash);
        }
      }
    }

    ajax.post('/al_restore.php', params, {
      onDone: function(result, msg, input, login_error) {
        if (!result) {
          return Restore.showMsgBox(msg, getLang('global_error'));
        }
        var code = intval(result);
        if (code == -1) {
          ge('request_result').innerHTML = msg;
          show('request_result');
          hide('request_form');
          scrollToTop();
        } else if (code == -2) {
          lockButton(btn);
          return setTimeout(Restore.submitRequest, 1000);
        } else if (code > 0) {
          cur.request_id = code;
          cur.request_hash = msg;
          Restore.phone_confirm_box = showFastBox(getLang('restore_confirmation'), '<div id="phone_confirm_box">' + ge('phone_confirm').innerHTML + '</div>', getLang('box_send'), function() {
            Restore.confirmPhoneSend();
          }, getLang('global_cancel'));
          ge('phone_confirm_code').focus();
        } else {
          if (login_error) {
            msg += '<br>' + val('request_email_or_phone_need');
          }
          Restore.showResult(result, msg, input);
        }
      },
      showProgress: lockButton.pbind(btn),
      hideProgress: unlockButton.pbind(btn)
    });
  },
  confirmCodeResend: function() {
    hide('phone_confirm_error');
    ajax.post('/al_restore.php', {act: 'a_confirm', request_id: cur.request_id, resend: 1, hash: cur.request_hash}, {onDone: function(result, msg) {
      Restore.confirmPhoneError(msg);
    }});
    return false;
  },
  confirmPhoneSend: function() {
    var code = trim(ge('phone_confirm_code').value);
    if (!/^[0-9a-fA-F]{8}$/i.test(code)) {
      Restore.confirmPhoneError(getLang('restore_code_error'));
      return;
    }
    ajax.post('/al_restore.php', {act: 'a_confirm', request_id: cur.request_id, code: code, hash: cur.request_hash}, {onDone: function(result, msg) {
      if (result) {
        ge('request_result').innerHTML = msg;
        show('request_result');
        hide('request_form');
        scrollToTop();
        Restore.phone_confirm_box.hide();
      } else {
        Restore.confirmPhoneError(msg);
      }
    }});
  },
  confirmPhoneError: function(msg) {
    var error_box = ge('phone_confirm_error');
    error_box.innerHTML = msg;
    show(error_box);
    elfocus('phone_confirm_code');
  },

  toFullRequest: function() {
    hide(cur.wasShown);
    ajax.post('al_restore.php', {act: 'to_full'}, {onDone: function(text) {
      val('restore_fields', text);
      Restore.initDropdowns();
      cur.options.request_type = 0;
    }});
  },

  initDropdowns: function() {
    var reg_years = [
      [0, getLang('select_year_not_selected')]
    ];
    for (var year = 2006; year <= cur.options.max_reg_year; year++) {
      reg_years.push([year, ''+year]);
    }

    cur.uiCity = new CitySelect(ge('reg_city'), ge('reg_city_row'), {width: 210, show: function(container) {
      show(container);
      ge('request_reg_info').style.bottom = ge('reg_year_row').clientHeight + 'px';
    }, hide: function(container) {
      hide(container);
      ge('request_reg_info').style.bottom = '';
    }});
    cur.uiCountry = new CountrySelect(ge('reg_country'), ge('reg_country_row'), {width: 210, citySelect: cur.uiCity});
    cur.uiYear = new Dropdown(ge('reg_year'), reg_years, {width: 210});
    cur.destroy.push(function(c) {
      if (c.uiCountry) c.uiCountry.destroy();
      if (c.uiCity) c.uiCity.destroy();
      if (c.uiYear) c.uiYear.destroy();
    })
  },
  initRequest: function() {
    if (cur.options.request_type != 4) {
      Restore.initDropdowns();
    }
    extend(cur, {
      images: [],
      images_count: [0, 0],
      request_id: false,
      request_hash: false
    });
  }
};

try{stManager.done('restore.js');}catch(e){}