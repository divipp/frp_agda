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
let state;

// if 'true', events which cannot be detected by the user are logged to the JS console
// e.g. when a label's text is set to its original content
const performance_warnings = true;


//////////////////////////////////////////////////////////////////////////////////////////////
// functions called from Agda code

// `exports` is an Object holding all Agda generated JS code and the primitive functions
// `exports` remains contant after the browser loads the js source files
let exports = {};

// we assume that modules define distinct global names so no module name spacing is needed
// (every module uses `exports`)
const require = _ => exports;

// These primitive functions are directly called in Agda generated JS code
// `exports.primIntegerFromString("0")` is also used to fill in erased arguments by Agda
exports.primIntegerFromString           = x => parseInt(x, 10);
exports.primSeq                         = (x, y) => y;
exports.uprimIntegerPlus                = (x, y) => x + y;
exports.uprimIntegerMinus               = (x, y) => x - y;
exports.uprimIntegerMultiply            = (x, y) => x * y;
exports.uprimIntegerEqual               = (x, y) => x === y;
exports.uprimIntegerGreaterOrEqualThan  = (x, y) => x >= y;
exports.uprimIntegerLessThan            = (x, y) => x < y;

// `myParseFloat` is called from the FFI in `Prelude.agda`
const myParseFloat = x => {
  const y = Number(x);
  return (isNaN(y) ? exports["Maybe"]["nothing"] : exports["Maybe"]["just"](y));
};


//////////////////////////////////////////////////////////////////////////////////////////////
// utility functions

// undefined value: this value is not needed during the computation
const ud = id => () => { throw 'undefined value #' + id; };

// marshalling function from JS natural number to Agda Fin type
const toFin = x => (x === 0 ? exports["Fin"]["zero"](ud(1)) : exports["Fin"]["suc"](ud(2))(toFin(x-1)) );

// marshalling function from Agda Vec to JS array
const fromVec = (vec, ch) => vec (
  { "[]":  () => ch
  , "_∷_": (_, str, xs) => {
    ch.push(str);
    return fromVec(xs, ch);
    }
  });

// `createElem` creates a DOM element from a description
// example usage:
//   createElem(["span", {"textContent": "hello world", "classList": ["label"]}])
const createElem = x => {
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

const setEnabled = (a, obj) => Object.assign(obj, a (
  { "enabled":  () => {}
  , "disabled": () => ({"disabled": true})
  }));
const setValidity = a => a (
  { "valid":   () => []
  , "invalid": () => ["invalid"]
  });

// pure marshalling function from Agda Widget to a DOM element description
// `dir` is either 'horizontal' or 'vertical'; it is used only in the "Container" case
const fromWidget = (dir, widget) => widget (
  {"Button": (en, str) =>
     [ "button"
     , { "textContent": str
       , "attrs": setEnabled(en, {"input": "button", "onclick": "click_event(this)"})}]
  ,"CheckBox": (en, checked) =>
     [ "input"
     , { "checked": checked({"true": () => true, "false": () => false})
       , "attrs": setEnabled(en, {"type": "checkbox", "onchange": "toggle_event(this)"})}]
  ,"ComboBox": (_, en, opts, sel) =>
     [ "select"
     , { "children":      fromVec(opts, []).map(str => ["option", {"textContent": str}])
       , "selectedIndex": exports["finToNat"](sel)
       , "attrs":         setEnabled(en, {"oninput": "select_event(this)"})}]
  ,"Label": str =>
     [ "span", {"textContent": str, "classList": ['label']} ]
  ,"Entry": (en, size, name, str, val) =>
     [ "input"
     , { "value": str
       , "classList": setValidity(val)
       , "attrs": setEnabled(en, {"type": 'text', "oninput": 'entry_event(this)', "size": size, "name": name})}]
  ,"Empty": () => [ "span", {} ]
  ,"Container": (newd, w1, w2) => {
      const newdir = newd({"horizontal": () => "horizontal", "vertical": () => "vertical"});
      return [ "div"
             , { "classList": [dir]
               , "children":  [fromWidget(newdir, w1), fromWidget(newdir, w2)]}];
    }
  });

// marshalling function from Agda Widget to a DOM element
const createWidget = (dir, widget) => createElem(fromWidget(dir, widget));


//////////////////////////////////////////////////////////////////////////////////////////////
// applying Agda widget modification descriptions on DOM elements

// `updateWidget` applies the `ch` change on the `el` DOM element
const updateWidget = (el, ch) => ch (
  {"replaceBy": (_, w) => {
      if (performance_warnings) { console.log('performance log: replaceBy'); };
      const parent = el.parentNode;
      const dir = (parent.classList.contains("vertical") ? "vertical" : "horizontal");
      parent.replaceChild(createWidget(dir, w), el);
    }
  ,"setLabel": (_, str) => {
      if (performance_warnings && str === el.textContent) { console.log('performance waning: label text was setted', el, str); };
      el.textContent = str;
    }
  ,"setEntry": (_1, _2, _3, _4, _5, _6, _7, str) => {
      if (performance_warnings && str === el.value) { console.log('performance waning: entry value was setted', el, str); };
      el.value = str;
    }
  ,"select": (_1, _2, _3, _4, _5, _6, idx) => {
      if (performance_warnings && idx === el.selectedIndex) { console.log('performance waning: option was selected', el, idx); };
      el.selectedIndex = idx;
    }
  ,"toggle": (_1, _2, _3, _4) => {
      el.checked = not(el.checked);
    }
  ,"toggleEnable": (_1, _2) => {
      if (el.getAttribute("disabled")) {
        el.removeAttribute("disabled");
      } else {
        el.setAttribute("disabled", true);
      };
    }
  ,"toggleValidity": (_1, _2, _3, _4, _5) => {
      el.classList.toggle('invalid');
    }
  ,"modLeft": (_1, _2, _3, _4, w) => {
      updateWidget(el.childNodes[0],w);
    }
  ,"modRight": (_1, _2, _3, _4, w) => {
      updateWidget(el.childNodes[1],w);
    }
  ,"_∙_": (_, w1, w2) => {
      updateWidget(el,w1);
      updateWidget(el,w2);
    }
  });


//////////////////////////////////////////////////////////////////////////////////////////////
// encoding user events as values of the `WidgetEdit` Agda data type

// `trans_event` translates an event `inn` relative to the `el` DOM element to an event of the document root
const trans_event = (el, fu) => {
  const p = el.parentNode;
  return (p == domRoot ? fu
         : trans_event(p, exports["WidgetEdit"][(p.childNodes[0] === el ? "modLeft" : "modRight")](ud(3))(ud(4))(ud(5))(ud(6))(fu)));
};

// `handle_event` handles an event `inn` relative to the `el` DOM element
const handle_event = (el, inn) => state["step"](exports["Maybe"]["just"](trans_event(el, inn)))["step"]["_,_"](
  {"_,_": (p1, p2) => {
    p1(
    {"nothing": () => {}
    ,"just": dw => { updateWidget(domRoot.childNodes[0],dw); }
    });
    state = p2;
  }});

//////////////////////////////////////////////////////////////////////////////////////////////
// the functions which are called directly by the browser

const click_event  = el => handle_event(el, exports["WidgetEdit"]["click"](ud(7)));
const toggle_event = el => handle_event(el, exports["WidgetEdit"]["toggle"](ud(8))(ud(9))(ud(10))(ud(11)));
const entry_event  = el => handle_event(el, exports["WidgetEdit"]["setEntry"](ud(12))(ud(13))(ud(14))(ud(15))(ud(16))(ud(17))(ud(18))(el.value));
const select_event = el => handle_event(el, exports["WidgetEdit"]["select"](ud(19))(ud(20))(ud(21))(ud(22))(ud(23))(ud(24))(toFin(el.selectedIndex)));

window.onload = () => exports["processMain"](ud(25))(ud(26))(exports["mainWidget"])["_,_"](
  {"_,_": (p1, p2) => {
    state = p2;
    domRoot.appendChild(createWidget("vertical", p1));
  }});

