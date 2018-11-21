//////////////////////////////////////////////////////////////////////////////////////////////
///// Runtime system for running GUI programs described with pure functions in browsers //////
//////////////////////////////////////////////////////////////////////////////////////////////


//////////////////////////////////////////////////////////////////////////////////////////////
// variables

// besides the DOM, `state` is the only mutable state of the application
// `state` holds a callback function which will be applied on the next browser event
//   and it will return how to modify the DOM and a new callback
let state;

// constant pointer to the application DOM
const domRoot = document.getElementById("root");

// if 'true', events which cannot be detected by the user are logged to the JS console
// e.g. when a label's text is set to its original content
const performance_warnings = true;


//////////////////////////////////////////////////////////////////////////////////////////////
// functions called from Agda code

// `exports` is an Object holding all Agda generated JS code and the primitive functions
// `exports` remains contant after the browser loads the js source files
const exports = {};

// we assume that modules define distinct global names so no module name spacing is needed
// (every module uses `exports`)
const require = _ => exports;

const mkBool = b => b ? exports["Bool"]["true"] : exports["Bool"]["false"];

// These primitive functions are directly called from Agda generated JS code
// `exports.primIntegerFromString("0")` is also used to fill in erased arguments by Agda
exports.primIntegerFromString           = x => parseInt(x, 10);
exports.primSeq                         = (x, y) => y;
exports.uprimIntegerPlus                = (x, y) => x + y;
exports.uprimIntegerMinus               = (x, y) => x - y;
exports.uprimIntegerMultiply            = (x, y) => x * y;
exports.uprimIntegerEqual               = (x, y) => mkBool(x === y);
exports.uprimIntegerGreaterOrEqualThan  = (x, y) => mkBool(x >= y);
exports.uprimIntegerLessThan            = (x, y) => mkBool(x < y);

//////////////////////////////////////////////////////////////////////////////////////////////
// utility functions

// marshalling function from Agda Vec to JS array
const fromVec = (vec, ch) => vec (
  [ () => ch
  , (str, xs) => { ch.push(str); return fromVec(xs, ch); }
  ]);

// `createElem` creates a DOM element from a description
// example usage:
//   createElem(["span", {textContent: "hello world", classList: ["label"]}])
const createElem = x => {
  const res = document.createElement(x[0]);
  for (const key in x[1]) {
    const el = x[1][key];
    switch (key) {
      case "children":
        for (const i in el) {res.appendChild(createElem(el[i]));};
        break;
      case "attrs":
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

const setEnabled = (a, obj) => Object.assign(obj, a ([() => {}, () => ({disabled: true})]));
const setValidity = a => a ([() => [], () => ["invalid"]]);

// pure marshalling function from Agda Widget to a DOM element description
// `dir` is either 'horizontal' or 'vertical'; it is used only in the "Container" case
const fromWidget = (dir, widget) => widget (
  [ (en, str) =>
     [ "button"
     , { textContent: str
       , attrs: setEnabled(en, {input: "button", onclick: "click_event(this)"})}]
  , (en, checked) =>
     [ "input"
     , { checked: checked([() => false, () => true])
       , attrs: setEnabled(en, {type: "checkbox", onchange: "toggle_event(this)"})}]
  , (_, en, opts, sel) =>
     [ "select"
     , { children:      fromVec(opts, []).map(str => ["option", {textContent: str}])
       , selectedIndex: exports["finToNat"](sel)
       , attrs:         setEnabled(en, {oninput: "select_event(this)"})}]
  , (en, size, name, str, val) =>
     [ "input"
     , { value: str
       , classList: setValidity(val)
       , attrs: setEnabled(en, {type: "text", oninput: "entry_event(this)", size: size, name: name})}]
  , str => [ "span", {textContent: str, classList: ["label"]} ]
  , () => [ "span", {} ]
  , (newd, w1, w2) => {
      const newdir = newd([() => "horizontal", () => "vertical"]);
      return [ "div"
             , { classList: [dir]
               , children:  [fromWidget(newdir, w1), fromWidget(newdir, w2)]}];
    }
  ]);

//////////////////////////////////////////////////////////////////////////////////////////////
// applying Agda widget modification descriptions on DOM elements

// `updateWidget` applies the `ch` change on the `el` DOM element
const updateWidget = (el, ch) => ch (
  [ () => { el.checked = not(el.checked); }
  , null
  , str => {
      if (performance_warnings && str === el.textContent) { console.log("performance waning: label text was setted", el, str); };
      el.textContent = str;}
  , str => {
      if (performance_warnings && str === el.value) { console.log("performance waning: entry value was setted", el, str); };
      el.value = str;}
  , idx => {
      if (performance_warnings && idx === el.selectedIndex) { console.log("performance waning: option was selected", el, idx); };
      el.selectedIndex = idx;}
  , _ => el.getAttribute("disabled") ? el.removeAttribute("disabled") : el.setAttribute("disabled", true)
  , () => { el.classList.toggle("invalid"); }
  , w => {
      if (performance_warnings) { console.log("performance log: replaceBy"); };
      const parent = el.parentNode;
      const dir = parent.classList.contains("vertical") ? "vertical" : "horizontal";
      parent.replaceChild(createElem(fromWidget(dir, w)), el);}
  , w => { updateWidget(el.childNodes[0],w); }
  , w => { updateWidget(el.childNodes[1],w); }
  , null, null, null, null
  , (w1, w2) => { updateWidget(el,w1); updateWidget(el,w2); }
  ]);


//////////////////////////////////////////////////////////////////////////////////////////////
// encoding user events as values of the `WidgetEdit` Agda data type

// `trans_event` translates an event `inn` relative to the `el` DOM element to an event of the document root
const trans_event = (el, fu) => {
  const p = el.parentNode;
  return p == domRoot ? fu
         : trans_event(p, exports["WidgetEdit"][(p.childNodes[0] === el ? "modLeft" : "modRight")](fu));
};

// `handle_event` handles an event `inn` relative to the `el` DOM element
const handle_event = (el, inn) => state(x1 => x1)(exports["Maybe"]["just"](trans_event(el, inn)))(x1 => x1)(
  (p1, p2) => {
    p1([() => {}, dw => { updateWidget(domRoot.childNodes[0],dw); }]);
    state = p2;
  });

//////////////////////////////////////////////////////////////////////////////////////////////
// the functions which are called directly by the browser

const click_event  = el => handle_event(el, exports["WidgetEdit"]["click"]);
const toggle_event = el => handle_event(el, exports["WidgetEdit"]["toggle"]);
const entry_event  = el => handle_event(el, exports["WidgetEdit"]["setEntry"](el.value));
const select_event = el => handle_event(el, exports["WidgetEdit"]["select"](exports["natToFin"](el.selectedIndex)));

window.onload = () => exports["main"](
  (p1, p2) => {
    state = p2;
    domRoot.appendChild(createElem(fromWidget("vertical", p1)));
  });

