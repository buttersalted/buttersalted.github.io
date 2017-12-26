// I. define global variables
var Html = document.querySelector('html');
var Editor = ace.edit('sql-value');
var Header = document.querySelector('header');
var Navs = document.querySelectorAll('nav li > a');
var Sections = document.querySelectorAll('section');
var Thead = document.querySelector('#ans thead');
var Tbody = document.querySelector('#ans tbody');
var Tdiv = document.createElement('div');
var Fields = document.querySelector('#fields');
var FoodInputs = document.querySelector('#food form .inputs');
var Forms = {
  'sql': document.querySelector('#sql form'),
  'pipe': document.querySelector('#pipe form'),
  'food': document.querySelector('#food form'),
  'group': document.querySelector('#group form'),
  'fillin': document.querySelector('#fillin form'),
  'field': document.querySelector('#field form'),
  'unit': document.querySelector('#unit form')
};

function objTruthy(a) {
  // 1. get object with only truthy values
  var z = {};
  for(var k in a)
    if(a[k]) z[k] = a[k];
  return z;
};

function ajaxReq(mth, url, dat) {
  // 1. make an ajax request
  return m.request({'method': mth, 'url': url, 'data': dat});
};

function toast(mod, ttl, msg) {
  // 1. show a toast
  iziToast[mod]({
    'title': ttl,
    'message': msg,
    'position': 'bottomCenter'
  });
};

function titleSet(msg, val) {
  // 1. set document title
  var z = '';
  for(var k in val)
    z += k+'='+val[k];
  msg = msg? msg[0].toUpperCase()+msg.substring(1) : '';
  msg += msg && z? ': '+z : z;
  msg += msg? ' - ' : '';
  document.title = msg+'ButterSalted';
};

function locationSet(hsh) {
  // 1. replace temp handler only if hash changed
  var fn = window.onhashchange;
  if(hsh!==location.hash) window.onhashchange = function() {
    window.onhashchange = fn;
  };
  // 2. update location
  location.href = location.origin+location.pathname+hsh;
};

function ansRender(ans) {
  console.log('ansRender');
  // 1. get set of all columns
  var cs = new Set(), ca = [], zc = [], zv = [];
  for(var r=0, R=ans.length; r<R; r++)
    for(var c in ans[r])
      cs.add(c);
  // 2. generate table head
  for(var c of cs) {
    ca.push(c);
    zc.push(m('th', c));
  }
  // 3. generate table body
  for(var r=0; r<R; r++) {
    var zr = [];
    for(var d=0, D=ca.length; d<D; d++)
      zr.push(m('td', ans[r][ca[d]]));
    zv.push(m('tr', {'key': r}, zr));
  }
  // 4. update table head, body
  m.render(Thead, ans.length? m('tr', zc) : null);
  m.render(Tbody, ans.length? zv : null);
  Tdiv.height = Thead.height;
  // 5. show toast message (if empty)
  if(ca.length) $(Thead.parentElement).DataTable({retrieve: true, order: [], scrollX: false, fixedHeader: false, colReorder: true});
  else toast('warning', 'Empty Query', 'No values returned');
};

function ansError(err) {
  console.log('ansError');
  // 1. clear table
  m.render(Thead, null);
  m.render(Tbody, null);
  // 2. show toast message
  toast('error', 'Query Error', err.message);
};

function formGet(frm) {
  // 1. set object from form elements
  var E = frm.elements, z = {};
  for(var i=0, I=E.length; i<I; i++)
    if(E[i].name) z[E[i].name] = E[i].value;
  return z;
};

function formSet(frm, val) {
  // 1. set form elements from object
  var E = frm.elements;
  for(var i=0, I=E.length; i<I; i++)
    if(E[i].name && val[E[i].name]) E[i].value = val[E[i].name];
  return frm;
};

function inpKv(e, key, val, katt, vatt) {
  // 1. setup component (empty, yet need to refer it)
  var comp = {};
  // 2. this handles key change
  function onkey() {
    // a. get new key
    var k = this.value;
    // b. created if filled, delete if emptied
    if(k && !key) e.create(comp);
    if(!k && key) e.delete(comp);
    // c. update key
    key = k;
  };
  // 3. this handles value change
  function onval() {
    // a. update value
    val = this.value;
  };
  // 4. return component
  return Object.assign(comp, {'view': function() { return m('fieldset', [
    m('input', Object.assign({'mode': 'key', 'value': key, 'onchange': onkey}, katt)),
    m('input', Object.assign({'name': key, 'value': val, 'onchange': onval}, vatt))
  ]); }});
};

function formKv(el, katt, vatt, val) {
  console.log('formKv');
  // 1. define components
  var Comps = new Set();
  // 2. handle create and delete of components
  var e = {
    'create': function(c) { Comps.add(inpKv(e, '', '', katt, vatt)); },
    'delete': function(c) { Comps.delete(c); }
  };
  // 3. initialize components from input
  val = Object.assign(val||{}, {'': ''});
  for(var k in val)
    Comps.add(inpKv(e, k, val[k], katt, vatt));
  // 4. mount combined component to form
  var z = {
    'view': function() {
      var z = [];
      for(var c of Comps)
        z.push(c.view());
      return z;
    },
    'onreset': function() {
      Comps.clear();
      e.create();
      m.redraw(this);
    }
  };
  m.mount(el, z);
  return z;
};

function formSql() {
  console.log('formSql');
  // 1. switch to query mode, and get form data
  Html.classList.add('query');
  var value = Editor.getValue();
  var data = {'value': value};
  // 2. update location, title
  locationSet('#!/?'+m.buildQueryString(data));
  titleSet('', data);
  // 3. make ajax request
  ajaxReq('GET', '/sql/'+encodeURIComponent(value)).then(ansRender, ansError);
  return false;
};

function loopAsync(fn, bgn, end) {
  // 1. an asynchronous begin to end loop
  if(bgn<end) fn(bgn).then(function() {
    loopAsync(fn, ++bgn, end);
  });
};

function formPipe() {
  console.log('formPipe');
  // 1. switch to query mode, and get form data
  Html.classList.add('query');
  var data = formGet(this), z = [];
  var source = data.source||'usda-ndb';
  var start = parseInt(data.start)||0;
  var stop = parseInt(data.stop)||(start+1);
  var url = '/pipe/'+source+'/';
  var sbt = this.submitted;
  // 2. update location, title
  locationSet('#!/pipe?'+m.buildQueryString(data));
  titleSet('pipe', data);
  // 3. if submit is post, render status (yay async again)
  if(sbt==='post') loopAsync(function(i) {
    return ajaxReq('POST', url, {'id': i}).then(function(ans) {
      z.push({'id': i, 'status': ans});
      ansRender(z);
    }, function(err) {
      z.push({'id': i, 'status': err.message});
      ansRender(z);
    });
  }, start, stop);
  // 4. if submit is get, render results (yay async)
  else loopAsync(function(i) {
    return ajaxReq('GET', url+i).then(function(ans) {
      z.push(ans);
      ansRender(z);
    }, ansError);
  }, start, stop);
  return false;
};

function formJson() {
  console.log('formJson');
  // 1. switch to query mode, and get form data
  Html.classList.add('query');
  var data = formGet(this);
  var sbt = this.submitted;
  var tab = this.parentElement.id;
  var id = data.id||data.Id;
  data = tab!=='food'? objTruthy(data) : data;
  // 2. report completion, error
  function onDone() { toast('info', 'Action Successful', sbt+' '+id); };
  function onError(err) { toast('error', 'Action Failed', sbt+' '+id+': '+err.message); };
  // 2. update location, title
  locationSet('#!/'+tab+'?'+m.buildQueryString(data));
  titleSet(tab, data);
  // 3. make ajax request (4 options)
  if(sbt==='insert') ajaxReq('POST', '/json/'+tab, data).then(onDone, onError);
  else if(sbt==='update') ajaxReq('PATCH', '/json/'+tab+'/'+id, data).then(onDone, onError);
  else if(sbt==='delete') ajaxReq('DELETE', '/json/'+tab+'/'+id, data).then(onDone, onError);
  else ajaxReq('GET', '/json/'+tab, data).then(ansRender, ansError);
  return false;
};

function setupPage(e) {
  console.log('setupPage');
  // 1. define food key, value attributes
  var katt = {'list': 'fields', 'placeholder': 'Column name, like: Id'};
  var vatt = {'type': 'text', 'placeholder': 'Value, like: 1001'};
  // 2. get path, prefix, and query
  var path = location.hash.replace(/#?\!?\/?/, '');
  var pre = path.split(/[\/\?]/)[0].toLowerCase();
  var mod=pre||'sql', qis = path.indexOf('?')>=0;
  var qry = qis? m.parseQueryString(path.split('?')[1]) : {};
  // 3. set title, clear result tables
  titleSet(pre, qry);
  m.render(Thead, null);
  m.render(Tbody, null);
  // 4. update html class list (updates ui)
  Html.classList.value = mod;
  if(qis) Html.classList.add('query');
  // 5. prepare forms if just loaded
  if(mod==='sql') Editor.setValue(qry.value||'');
  else if(mod!=='food') formSet(Forms[mod], qry);
  var kv = formKv(FoodInputs, katt, vatt, mod==='food'? qry : {});
  Forms.food.onreset = kv.onreset;
  // 6. submit form if have query
  if(qis) Forms[mod].onsubmit();
};

function setup() {
  console.log('setup');
  // 1. enable form multi submit
  var submit = document.querySelectorAll('form [type=submit]');
  for(var i=0, I=submit.length; i<I; i++)
    submit[i].onclick = function() { this.form.submitted = this.value; };
  // 2. setup fields data list
  ajaxReq('GET', '/json/field').then(function(ans) {
    for(var i=0, z=[], I=ans.length; i<I; i++)
      z[i] = m('option', ans[i].id);
    m.render(Fields, z);
  });
  // 3. setup ace editor
  Editor.setTheme('ace/theme/sqlserver');
  Editor.getSession().setMode('ace/mode/pgsql');
  Editor.focus();
  // 4. setup sql interface
  for(var k in Forms)
    Forms[k].onsubmit = formJson;
  Forms.sql.onsubmit = formSql;
  Forms.pipe.onsubmit = formPipe;
  // 5. setup page
  window.onhashchange = setupPage;
  setupPage();
};

// 2. begin setup
setup();
