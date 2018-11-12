
// if 'true', events which cannot be detected by the user are logged to the JS console
// e.g. when a label's text is set to its original content
const performance_warnings = true;

//////////////////////////////////////////////////////////////////////////////////////////////
// functions called from Agda code

// `exports` is an Object holding all Agda generated JS code and the primitive functions
var exports = new Object;

// we assume that modules define distinct global names so no module name spacing is needed
// (everyone uses `exports`)
function require(_) { return exports; }

// These primitive functions are directly called in Agda generated JS code
// `exports.primIntegerFromString("0")` is also used to fill in erased arguments by Agda
exports.primIntegerFromString           = function(x)   { return parseInt(x); };
exports.primSeq                         = function(x,y) { return y; };
exports.uprimIntegerPlus                = function(x,y) { return x + y; };
exports.uprimIntegerMinus               = function(x,y) { return x - y; };
exports.uprimIntegerMultiply            = function(x,y) { return x * y; };
exports.uprimIntegerEqual               = function(x,y) { return x === y; };
exports.uprimIntegerGreaterOrEqualThan  = function(x,y) { return x >= y; };
exports.uprimIntegerLessThan            = function(x,y) { return x < y; };

// `myParseFloat` is called from the FFI in `Prelude.agda`
function myParseFloat (x) {
  const y = Number(x);
  return (isNaN(y) ? exports["Maybe"]["nothing"] : exports["Maybe"]["just"](y));
}

//////////////////////////////////////////////////////////////////////////////////////////////
// functions calling Agda code

// the state of the application
// `state` holds a continution function whose closure contains the real state
var state;

// document element to contain the application DOM
const domRoot = document.getElementById("root");

// marshalling function from JS natural number to Agda Fin type
function toFin (x) {
  return (x === 0 ? exports["Fin"]["zero"]("null1") : exports["Fin"]["suc"]("null2")(toFin(x-1)) );
};

// conversion from Agda Widget type to DOM elements
// `dir` is either 'horizontal' or 'vertical'; it is used only in the "Container" case
function makeWidget(dir, widget_description) {
  var res;
  function fillComboBox(vs) { vs (
    {"[]": function() {}
    ,"_∷_": function(_, str, xs) {
      const x = document.createElement("option");
      x.textContent = str;
      res.appendChild(x);
      fillComboBox(xs);
      }
    })
  };
  function setEnabled (a) {
    a ({"enabled": function () {}, "disabled": function () {res.setAttribute("disabled", "true");}});
  };
  widget_description (
    {"Button": function (a, str) {
      res = document.createElement("button");
      res.setAttribute("input", "button"); 
      res.setAttribute("onclick", "click_event(this)"); 
      res.textContent = str;
      setEnabled(a);
      }
    ,"CheckBox": function (a, checked) {
      res = document.createElement("input");
      res.setAttribute("type", "checkbox"); 
      res.setAttribute("onchange", "toggle_event(this)");
      setEnabled(a);
      }
    ,"ComboBox": function (_, a, vs, sel) {
      res = document.createElement("select");
      fillComboBox(vs);
      res.selectedIndex = exports["finToNat"](sel);
      res.setAttribute("oninput", "select_event(this)");
      setEnabled(a);
      }
    ,"Label": function (na) {
      res = document.createElement("span");
      res.classList.add('label');
      res.textContent = na;
      }
    ,"Entry": function (a, size, name, contents, valid) {
      res = document.createElement("input");
      res.setAttribute("type", 'text');
      res.setAttribute("oninput", 'entry_event(this)');
      res.setAttribute("size", size);
      res.setAttribute("name", name);
      res.value = contents;
      valid({"invalid": function (){ res.style['background-color'] = 'red'; }, "valid": function (){}});
      setEnabled(a);
      }
    ,"Container": function (newd,le,ri) {
      res = document.createElement("div");
      res.classList.add(dir);
      const newdir = newd(
        {"horizontal": function () {return "horizontal";}
        ,"vertical": function () {return "vertical";}
        });
      res.appendChild(makeWidget(newdir, le));
      res.appendChild(makeWidget(newdir, ri));
      }
    ,"Empty": function () {
      res = document.createElement("span");
      }
    });
  return res;
};

window.onload = function() {
  const w = exports["processMain"]("null")("null")(exports["mainWidget"])
  state = w["proj₂"]["step"];
  domRoot.appendChild(makeWidget("vertical", w["proj₁"]));
};

// event dispatching function
// `updateWidget` dispatches events returned by the Agda generated JS code
function updateWidget(el, ch) { ch (
  {"replaceBy": function (_, w) {
      if (performance_warnings) { console.log('performance log: replaceBy'); };
      const parent = el.parentNode;
      const dir = (parent.classList.contains("vertical") ? "vertical" : "horizontal");
      parent.replaceChild(makeWidget(dir, w), el);
    }
  ,"setLabel": function (_, str) {
      if (performance_warnings && str === el.textContent) { console.log('performance waning: label text was setted', el, str); };
      el.textContent = str;
    }
  ,"setEntry": function (_1, _2, _3, _4, _5, _6, _7, str) {
      if (performance_warnings && str === el.value) { console.log('performance waning: entry value was setted', el, str); };
      el.value = str;
    }
  ,"select": function (_1, _2, _3, _4, _5, _6, idx) {
      if (performance_warnings && idx === el.selectedIndex) { console.log('performance waning: option was selected', el, idx); };
      el.selectedIndex = idx;
    }
  ,"toggle": function (_1, _2, _3, _4) {
      el.checked = not(el.checked);
    }
  ,"toggleEnable": function (_1, _2) {
      if (el.getAttribute("disabled")) {
        el.removeAttribute("disabled");
      } else {
        el.setAttribute("disabled", 'true');
      };
    }
  ,"toggleValidity": function (_1, _2, _3, _4, _5) {
      if (el.style['background-color'] === 'red') {
        el.style.removeProperty('background-color');
      } else {
        el.style['background-color'] = 'red';
      };
    }
  ,"modLeft": function (_1, _2, _3, _4, w) {
      updateWidget(el.childNodes[0],w);
    }
  ,"modRight": function (_1, _2, _3, _4, w) {
      updateWidget(el.childNodes[1],w);
    }
  ,"_∙_": function (_, w1, w2) {
      updateWidget(el,w1);
      updateWidget(el,w2);
    }
  });
};

// generate events to feed the Agda generated JS code
function gen_event(el, inn) {
  function calc_fun(el, fu) {
    const p = el.parentNode;
    return (p == domRoot ? fu
          : calc_fun(p, exports["WidgetEdit"][(p.childNodes[0] === el ? "modLeft" : "modRight")]("null3")("null4")("null5")("null6")(fu)));
  };
  var state_tmp = state; state = null;  // TODO: atomic swap (not really needed...)
  if (state_tmp) {
    const next = state_tmp(exports["Maybe"]["just"](calc_fun(el, inn)))["step"];
    next["proj₁"](
      {"nothing": function () {}
      ,"just": function (dw) { updateWidget(domRoot.childNodes[0],dw); }
      });
    state = next["proj₂"]["step"];
  };
};

function click_event (el) {
  return gen_event(el, exports["WidgetEdit"]["click"]("null7"));
};
function toggle_event (el) {
  return gen_event(el, exports["WidgetEdit"]["toggle"]("null8")("null9")("null10")("null11"));
};
function entry_event (el) {
  return gen_event(el, exports["WidgetEdit"]["setEntry"]("null12")("null13")("null14")("null15")("null16")("null17")("null18")(el.value));
};
function select_event (el) {
  return gen_event(el, exports["WidgetEdit"]["select"]("null19")("null20")("null21")("null22")("null23")("null24")(toFin(el.selectedIndex)));
};

