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

const mkBool = b => b ? T/*true*/ : F/*false*/;

// These primitive functions are directly called from Agda generated JS code
const S/*primSeq*/      = (x, y) => y;
const I/*mkInt*/        = x => parseInt(x, 10);
const IPlus  = (x, y) => x + y;
const IMinus = (x, y) => x - y;
const IMul   = (x, y) => x * y;
const IEq    = (x, y) => mkBool(x === y);
const IGE    = (x, y) => mkBool(x >= y);
const ILT    = (x, y) => mkBool(x < y);

//////////////////////////////////////////////////////////////////////////////////////////////
// utility functions

// marshalling function from Agda Vec to JS array
const fromVec = (vec, ch) => vec (
  [ _ => ch
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
      case "C"/*children*/:
        for (const i in el) {res.appendChild(createElem(el[i]));};
        break;
      case "A"/*attributes*/:
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

const setEnabled = (a, obj) => Object.assign(obj, a ([_ => {}, _ => ({disabled: true})]));
const setValidity = a => a ([_ => [], _ => ["invalid"]]);

// pure marshalling function from Agda Widget to a DOM element description
// `dir` is either 'horizontal' or 'vertical'; it is used only in the "Container" case
const fromWidget = (dir, widget) => widget (
  [ (en, str) =>
     [ "button"
     , { textContent: str
       , A: setEnabled(en, {input: "button", onclick: "clickE(this)"})}]
  , (en, checked) =>
     [ "input"
     , { checked: checked([_ => false, _ => true])
       , A: setEnabled(en, {type: "checkbox", onchange: "toggleE(this)"})}]
  , (_, en, opts, sel) =>
     [ "select"
     , { C:      fromVec(opts, []).map(str => ["option", {textContent: str}])
       , selectedIndex: finToNat(sel)
       , A:         setEnabled(en, {oninput: "selectE(this)"})}]
  , (en, size, name, str, val) =>
     [ "input"
     , { value: str
       , classList: setValidity(val)
       , A: setEnabled(en, {type: "text", oninput: "entryE(this)", size: size, name: name})}]
  , str => [ "span", {textContent: str, classList: ["label"]} ]
  , _ => [ "span", {} ]
  , (newd, w1, w2) => {
      const newdir = newd([_ => "horizontal", _ => "vertical"]);
      return [ "div"
             , { classList: [dir]
               , C:  [fromWidget(newdir, w1), fromWidget(newdir, w2)]}];
    }
  ]);

//////////////////////////////////////////////////////////////////////////////////////////////
// applying Agda widget modification descriptions on DOM elements

// `updateWidget` applies the `ch` change on the `el` DOM element
const updateWidget = (el, ch) => ch (
  [ _ => { el.checked = !el.checked; }
  , 0
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
  , _ => { el.classList.toggle("invalid"); }
  , w => {
      if (performance_warnings) { console.log("performance log: replaceBy"); };
      const parent = el.parentNode;
      const dir = parent.classList.contains("vertical") ? "vertical" : "horizontal";
      parent.replaceChild(createElem(fromWidget(dir, w)), el);}
  , w => { updateWidget(el.childNodes[0],w); }
  , w => { updateWidget(el.childNodes[1],w); }
  , 0, 0, 0, 0
  , (w1, w2) => { updateWidget(el,w1); updateWidget(el,w2); }
  ]);


//////////////////////////////////////////////////////////////////////////////////////////////
// encoding user events as values of the `WidgetEdit` Agda data type

// `trans_event` translates an event `inn` relative to the `el` DOM element to an event of the document root
const trans_event = (el, fu) => {
  const p = el.parentNode;
  return p == domRoot ? fu
         : trans_event(p, (p.childNodes[0] === el ? ML/*modLeft*/ : MR/*modRight*/)(fu));
};

// `handle_event` handles an event `inn` relative to the `el` DOM element
const handle_event = (el, inn) => state(x1 => x1)(J/*just*/(trans_event(el, inn)))(x1 => x1)(
  (p1, p2) => {
    p1([_ => {}, dw => { updateWidget(domRoot.childNodes[0],dw); }]);
    state = p2;
  });

//////////////////////////////////////////////////////////////////////////////////////////////
// the functions which are called directly by the browser

const clickE  = el => handle_event(el, click);
const toggleE = el => handle_event(el, toggle);
const entryE  = el => handle_event(el, SE/*setEntry*/(el.value));
const selectE = el => handle_event(el, select(natToFin(el.selectedIndex)));

window.onload = _ => main(
  (p1, p2) => {
    state = p2;
    domRoot.appendChild(createElem(fromWidget("vertical", p1)));
  });

