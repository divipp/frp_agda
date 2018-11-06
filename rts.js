
var exports = new Object;

function require(_) { return exports; }

exports.primIntegerFromString           = function(x)   { return parseInt(x); };
exports.primSeq                         = function(x,y) { return y; };
exports.uprimIntegerPlus                = function(x,y) { return x + y; };
exports.uprimIntegerMinus               = function(x,y) { return x - y; };
exports.uprimIntegerMultiply            = function(x,y) { return x * y; };
exports.uprimIntegerEqual               = function(x,y) { return x === y; };
exports.uprimIntegerGreaterOrEqualThan  = function(x,y) { return x >= y; };
exports.uprimIntegerLessThan            = function(x,y) { return x < y; };

var state;

const root = document.getElementById("root");

function makeWidget(widget_description) {
  var res;
  widget_description (
    {"Button": function (s) {
      res = document.createElement("button");
      res.setAttribute("input", "button"); 
      res.setAttribute("onclick", "click_event(this)"); 
      res.innerHTML = s;
      }
    ,"Checkbox": function (checked) {
      res = document.createElement("input");
      res.setAttribute("type", "checkbox"); 
      res.setAttribute("onchange", "click_event(this)"); 
      }
    ,"Label": function (na) {
      res = document.createElement("span");
      res.innerHTML = na;
      }
    ,"Entry": function (na) {
      res = document.createElement("input");
      res.value = na;
      res.setAttribute("oninput", "entry_event(this)"); 
      }
    ,"_∥_": function (le,ri) {
      res = document.createElement("span");
      res.appendChild(makeWidget(le));
      res.appendChild(makeWidget(ri));
      }
    ,"Empty": function () {
      res = document.createElement("span");
      }
    });
  return res;
};

window.onload = function() {
  state = exports["mainWidget"]["proj₂"]["step"];
  root.appendChild(makeWidget(exports["mainWidget"]["proj₁"]));
};

function updateWidget(el, ch) { ch (
  {"same": function (_) {
    }
  ,"replaceBy": function (_, w) {
    el.parentNode.replaceChild(makeWidget(w), el);
    }
  ,"setLabel": function (_, n) {
    //console.log('setlabel', n);
    el.innerHTML = n;
    }
  ,"toggle": function (_1, _2) {
    el.checked = not(el.checked);
    }
  ,"modLeft": function (_1, _2, _3, w) {
    updateWidget(el.childNodes[0],w);
    }
  ,"modRight": function (_1, _2, _3, w) {
    updateWidget(el.childNodes[1],w);
    }
  ,"_∥_": function (_1, _2, w1, w2) {
    updateWidget(el.childNodes[0],w1);
    updateWidget(el.childNodes[1],w2);
    }
  });
};

function gen_event(el, inn) {
  function calc_fun(el, fu) {
    const p = el.parentNode;
    return (p == root ? fu
          : calc_fun(p, function (mod_rec) {return mod_rec[(p.childNodes[0] === el ? "modLeft" : "modRight")](null,null,null,fu)}));
  };
  var state_tmp = state; state = null;  // TODO: atomic swap (needed?)
  if (state_tmp) {
    const next = state_tmp(function (just_rec) {return just_rec["just"](calc_fun(el, inn));})["step"];
    updateWidget(root.childNodes[0],next["proj₁"]);
    state = next["proj₂"]["step"];
  };
};

function click_event (el) { return gen_event(el, null); };
function entry_event (el) { return gen_event(el, null); }; // TODO

