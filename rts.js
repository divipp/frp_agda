"use strict";

//////////////////////////////////////////////////////////////////////////////////////////////
///// Runtime system for running GUI programs described with pure functions in browsers //////
//////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////
// variables

// besides the DOM, `state` is the only mutable state of the application
// `state` holds a callback function which will be applied on the next browser event
//   and it will return how to modify the DOM and a new callback
let state;

// if 'true', events which cannot be detected by the user are logged to the JS console
// e.g. when a label's text is set to its original content
const performance_warnings = false;


//////////////////////////////////////////////////////////////////////////////////////////////
// functions called from Agda code

// These primitive functions are directly called from Agda generated JS code
const /*agdaRTS.primSeq*/                       s1 = (x, y) => y;
const /*agdaRTS.primIntegerFromString*/         s2 = x => parseInt(x, 10);
const /*agdaRTS.uprimIntegerPlus*/              s3 = (x, y) => x + y;
const /*agdaRTS.uprimIntegerMinus*/             s4 = (x, y) => x - y;
const /*agdaRTS.uprimIntegerMultiply*/          s5 = (x, y) => x * y;
const /*agdaRTS.uprimIntegerEqual*/             s6 = (x, y) => x === y;
const /*agdaRTS.uprimIntegerGreaterOrEqualThan*/s7 = (x, y) => x >= y;
const /*agdaRTS.uprimIntegerLessThan*/          s8 = (x, y) => x < y;
const /*agdaRTS.primFloatPlus*/                 f1 = x => y => x + y;
const /*agdaRTS.primFloatMinus*/                f2 = x => y => x - y;
const /*agdaRTS.primFloatTimes*/                f3 = x => y => x * y;
const /*agdaRTS.primFloatDiv*/                  f4 = x => y => x / y;
const /*agdaRTS.primShowFloat*/                 f5 = x => JSON.stringify(x);


//////////////////////////////////////////////////////////////////////////////////////////////
// utility functions

const fromBool = t=>t([_=>false,_=>true]);

// marshalling function from Agda Vec to JS array
const fromVec = vec => vec (
  [ _ => []
  , (x, xs) => [x].concat(fromVec(xs))
  ]);

// `createElem` creates a DOM element from a description
// example usage:
//   createElem(["span", {textContent: "hello world", classList: ["s3"]}])
const createElem = ([x0,x1]) => {
  const res = document.createElement(x0);
  Object.keys(x1).map(key => {
    const el = x1[key];
    key === "C" ? el.map(i => res.appendChild(createElem(i))) :
      key === "A" ? Object.keys(el).map(i => res.setAttribute(i, el[i])) :
        res[key] = el;
    });
  return res;
};


//////////////////////////////////////////////////////////////////////////////////////////////
// conversion of Agda widget descriptions to DOM elements

const setEnabled = (a, obj) => a([_ => obj, _ => (obj.disabled = true, obj)]);

// pure marshalling function from Agda Widget to a DOM element description
const fromWidget = widget => widget (
  [ (en, str) =>
     [ "button", { textContent: str
                 , A: setEnabled(en, {input: "button", onclick: "handle_event(/*jAgda.Reactive.WidgetEdit.click*/t6,this)"})}]
  , (en, checked) =>
     [ "input", { checked: checked([_=>false,_=>true])
                , A: setEnabled(en, {type: "checkbox", onchange: "handle_event(/*jAgda.Reactive.WidgetEdit.toggle*/t7,this)"})}]
  , (_, en, opts, sel) =>
     [ "select", { C: fromVec(opts).map(str => ["option", {textContent: str}])
                 , selectedIndex: /*jAgda.Data.Fin.Base.toℕ*/t2(sel)
                 , A: setEnabled(en, {oninput: "handle_event(/*jAgda.Reactive.WidgetEdit.select*/t9(/*jAgda.Data.Fin.Base.fromℕ*/t1(this.selectedIndex)),this)"})}]
  , (en, s, n, str, val) =>
     [ "input", { value: str
                , classList: val([_ => [], _ => ["s4"]])
                , A: setEnabled(en, {type: "text", oninput: "handle_event(/*jAgda.Reactive.WidgetEdit.setEntry*/t8(this.value),this)", size: s, name: n})}]
  , str => [ "span", {textContent: str, classList: ["s3"]} ]
  , _ => [ "span", {} ]
  , (dir, w1, w2) =>
     [ "div", { classList: [dir([_ => "s1", _ => "s2"])]
              , C: [fromWidget(w1), fromWidget(w2)]}]
  ]);


//////////////////////////////////////////////////////////////////////////////////////////////
// applying Agda widget modification descriptions on DOM elements

// `updateWidget` applies the `ch` change on the `el` DOM element
const updateWidget = el => ch => ch (
  [ _ => el.checked = !el.checked
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
  , _ => el.classList.toggle("s4")
  , w => {
      if (performance_warnings) { console.log("performance log: replaceBy"); };
      el.parentNode.replaceChild(createElem(fromWidget(w)), el);}
  , updateWidget(el.firstChild)
  , updateWidget(el.lastChild)
  , 0, 0, 0, 0
  , (w1, w2) => { updateWidget(el)(w1); updateWidget(el)(w2); }
  ]);


//////////////////////////////////////////////////////////////////////////////////////////////
// encoding user events as values of the `WidgetEdit` Agda data type

// `trans_event` translates an event `inn` relative to the `el` DOM element to an event of the document root
const trans_event = (el, ev) => {
  const p = el.parentNode;
  return p === /*document.body*/k1 ? ev : trans_event(p, (p.firstChild === el ? /*jAgda.Reactive.WidgetEdit.modLeft*/t4 : /*jAgda.Reactive.WidgetEdit.modRight*/t5)(ev));
};

const update = st => st(x => x)((delta, newState) => {
  delta([ /*nothing*/_ => {}
        , /*just*/updateWidget(/*document.body*/k1.firstChild)]);
  state = newState
});

// the function called on the load of the html page
const e3 = update;


//////////////////////////////////////////////////////////////////////////////////////////////
// the functions which are called directly by the browser

// `handle_event` handles an event `ev` relative to the `el` DOM element
const handle_event = (ev, el) => update(state(x => x)(/*jAgda.Data.Maybe.Base.Maybe.just*/t3(trans_event(el, ev))));


//////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////// JavaScript code generated from Agda code ////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////

