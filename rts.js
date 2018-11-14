//////////////////////////////////////////////////////////////////////////////////////////////
///// Runtime system for running GUI programs described with pure functions in browsers //////
//////////////////////////////////////////////////////////////////////////////////////////////


//////////////////////////////////////////////////////////////////////////////////////////////
// variables

// constant pointer to the application DOM
const domRoot = document.getElementById("root");

// besides the DOM, `state` is the only mutable state of the application
// `state` holds a callback function which will be applied on the next browser event
//   and it will return how to modify the DOM and a new callback
var state;

// if 'true', events which cannot be detected by the user are logged to the JS console
// e.g. when a label's text is set to its original content
const performance_warnings = true;


//////////////////////////////////////////////////////////////////////////////////////////////
// functions called from Agda code

// `exports` is an Object holding all Agda generated JS code and the primitive functions
// `exports` remains contant after the browser loads the js source files
var exports = new Object;

// we assume that modules define distinct global names so no module name spacing is needed
// (every module uses `exports`)
function require(_) { return exports; }

// These primitive functions are directly called in Agda generated JS code
// `exports.primIntegerFromString("0")` is also used to fill in erased arguments by Agda
exports.primIntegerFromString           = function(x)   { return parseInt(x, 10); };
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
// utility functions

// undefined value: this value is not needed during the computation
function ud(id) {
  return function () { throw 'undefined value #' + id; };
};

// marshalling function from JS natural number to Agda Fin type
function toFin (x) {
  return (x === 0 ? exports["Fin"]["zero"](ud(1)) : exports["Fin"]["suc"](ud(2))(toFin(x-1)) );
};

// marshalling function from Agda Vec to JS array
function fromVec (vec, ch) { return vec (
  {"[]": function() {return ch;}
  ,"_∷_": function(_, str, xs) {
    ch.push(str);
    return fromVec(xs, ch);
    }
  });
};

// `createElem` creates a DOM element from a description
// example usage:
//   createElem(["span", {"textContent": "hello world", "classList": ["label"]}])
function createElem (x) {
  const res = document.createElement(x[0]);
  for (const key in x[1]) {
    const el = x[1][key];
    switch (key) {
      case 'children':
        for (const i in el) {res.appendChild(createElem(el[i]));};
        break;
      case 'attrs':
        for (const i in el) {res.setAttribute(i, el[i]);};
        break;
      default:
        res[key] = el;
    };
  };
  return res;
};


//////////////////////////////////////////////////////////////////////////////////////////////
// conversion of Agda widget descriptions to DOM elements

function setEnabled (a, obj) { return Object.assign(obj, a (
  { "enabled":  function () {return {};}
  , "disabled": function () {return {"disabled": true};}
  }));
};
function setValidity (a) { return a (
  { "valid":   function () {return [];}
  , "invalid": function () {return ["invalid"];}
  });
};

// pure marshalling function from Agda Widget to a DOM element description
// `dir` is either 'horizontal' or 'vertical'; it is used only in the "Container" case
function fromWidget (dir, widget) { return widget (
  {"Button":
    function (en, str) {
      return [ "button"
             , { "textContent": str
               , "attrs": setEnabled(en, {"input": "button", "onclick": "click_event(this)"})}]; 
    }
  ,"CheckBox":
    function (en, checked) {
      return [ "input"
             , { "checked": checked({"true": function(){return true;}, "false": function(){return false;}})
               , "attrs": setEnabled(en, {"type": "checkbox", "onchange": "toggle_event(this)"})}];
    }
  ,"ComboBox":
    function (_, en, opts, sel) {
      return [ "select"
             , { "children":      fromVec(opts, []).map(function (str) {return ["option", {"textContent": str}];})
               , "selectedIndex": exports["finToNat"](sel)
               , "attrs":         setEnabled(en, {"oninput": "select_event(this)"})}];
    }
  ,"Label":
    function (str) {
      return [ "span"
             , {"textContent": str, "classList": ['label']}];
    }
  ,"Entry":
    function (en, size, name, str, val) {
      return [ "input"
             , { "value": str
               , "classList": setValidity(val)
               , "attrs": setEnabled(en, {"type": 'text', "oninput": 'entry_event(this)', "size": size, "name": name})}];
    }
  ,"Empty":
    function () {
      return [ "span", {} ];
    }
  ,"Container":
    function (newd, w1, w2) {
      const newdir = newd(
        {"horizontal": function () {return "horizontal";}
        ,"vertical":   function () {return "vertical";}
        });
      return [ "div"
             , { "classList": [dir]
               , "children":  [fromWidget(newdir, w1), fromWidget(newdir, w2)]}];
    }
  });
};

// marshalling function from Agda Widget to a DOM element
function createWidget(dir, widget) {
  return createElem(fromWidget(dir, widget));
}


//////////////////////////////////////////////////////////////////////////////////////////////
// applying Agda widget modification descriptions on DOM elements

// `updateWidget` applies the `ch` change on the `el` DOM element
function updateWidget(el, ch) { ch (
  {"replaceBy": function (_, w) {
      if (performance_warnings) { console.log('performance log: replaceBy'); };
      const parent = el.parentNode;
      const dir = (parent.classList.contains("vertical") ? "vertical" : "horizontal");
      parent.replaceChild(createWidget(dir, w), el);
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
        el.setAttribute("disabled", true);
      };
    }
  ,"toggleValidity": function (_1, _2, _3, _4, _5) {
      el.classList.toggle('invalid');
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


//////////////////////////////////////////////////////////////////////////////////////////////
// encoding user events as values of the `WidgetEdit` Agda data type

// `trans_event` translates an event `inn` relative to the `el` DOM element to an event of the document root
function trans_event(el, fu) {
  const p = el.parentNode;
  return (p == domRoot ? fu
         : trans_event(p, exports["WidgetEdit"][(p.childNodes[0] === el ? "modLeft" : "modRight")](ud(3))(ud(4))(ud(5))(ud(6))(fu)));
};

// `handle_event` handles an event `inn` relative to the `el` DOM element
function handle_event(el, inn) {
  const next = state["step"](exports["Maybe"]["just"](trans_event(el, inn)))["step"];
  next["proj₁"](
    {"nothing": function () {}
    ,"just": function (dw) { updateWidget(domRoot.childNodes[0],dw); }
    });
  state = next["proj₂"];
};


//////////////////////////////////////////////////////////////////////////////////////////////
// the functions which are called directly by the browser

function click_event (el) {
  return handle_event(el, exports["WidgetEdit"]["click"](ud(7)));
};
function toggle_event (el) {
  return handle_event(el, exports["WidgetEdit"]["toggle"](ud(8))(ud(9))(ud(10))(ud(11)));
};
function entry_event (el) {
  return handle_event(el, exports["WidgetEdit"]["setEntry"](ud(12))(ud(13))(ud(14))(ud(15))(ud(16))(ud(17))(ud(18))(el.value));
};
function select_event (el) {
  return handle_event(el, exports["WidgetEdit"]["select"](ud(19))(ud(20))(ud(21))(ud(22))(ud(23))(ud(24))(toFin(el.selectedIndex)));
};

window.onload = function() {
  const w = exports["processMain"](ud(25))(ud(26))(exports["mainWidget"])
  state = w["proj₂"];
  domRoot.appendChild(createWidget("vertical", w["proj₁"]));
};

