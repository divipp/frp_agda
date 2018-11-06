{-# OPTIONS --type-in-type #-}
module Reactive where

open import Prelude

infixr 9 _∘ᵗ_ _∘ᵀ_
infix 4 _,ᵀ_ _,ᵗ_
infix 2 _×ᵀ_

record Tree : Set₁ where
  coinductive
  field
    Branch : Set
    child : Branch → Tree

open Tree

constᵀ : Set → Tree
constᵀ A .Branch = A
constᵀ A .child _ = constᵀ A

_×ᵀ_ : Tree → Tree → Tree
(p ×ᵀ q) .Branch = p .Branch × q .Branch
(p ×ᵀ q) .child (ph , qh) = p .child ph ×ᵀ q .child qh

alter : Tree → Tree → Tree
alter p q .Branch = p .Branch
alter p q .child hp = alter q (p .child hp)

{-
p:  P₁    P₂ -> P₃    P₄  ...
    |     ^     |     ^
    v     |     v     |
q:  Q₁ -> Q₂    Q₃ -> Q₄  ...
-}
merge : Tree → Tree → Tree
merge p q .Branch = p .Branch
merge p q .child hp .Branch = q .Branch
merge p q .child hp .child hq = merge (q .child hq) (p .child hp)

alter' : Set → Set → Tree
alter' A B = alter (constᵀ A) (constᵀ B)

-----------------------------

data I/O : Set where I O : I/O   -- input, output directions

opposite : I/O → I/O
opposite I = O
opposite O = I

ΠΣ : I/O → (A : Set) → (A → Set₁) → Set₁
ΠΣ I = Π
ΠΣ O = Σ

record Agent (i/o : I/O) (p : Tree) : Set₁ where
  coinductive
  field
    step : ΠΣ i/o (p .Branch) λ a → Agent (opposite i/o) (p .child a)

open Agent

_,ᵀ_ : ∀ {d p q} → Agent d p → Agent d q → Agent d (p ×ᵀ q)
_,ᵀ_ {I} a b .step (k , l) = a .step k ,ᵀ b .step l
_,ᵀ_ {O} a b .step with a .step | b .step
... | i , j | k , l = (i , k) , (j ,ᵀ l)

_∘ᵗ_ : ∀ {p q r} → Agent I (alter p q) → Agent I (alter q r) → Agent I (alter p r)
(b ∘ᵗ a) .step ph .step with b .step ph .step
... | qh , bt with a .step qh .step
... | rh , at = rh , bt ∘ᵗ at

-- stream processors
SP : Set → Set → Set₁
SP A B = Agent I (alter' A B)

arr : ∀ {A B} → (A → B) → SP A B
arr f .step x .step = f x , arr f

accum : ∀ {A B} → (A → B → B) → B → SP A B
accum f b .step a .step with f a b
... | b' = b' , accum f b'

maybefy : ∀ {A B} → SP A B → SP (Maybe A) (Maybe B)
maybefy f .step nothing .step = nothing , (maybefy f)
maybefy f .step (just a) .step with f .step a .step
... | x , y = just x , maybefy y

-- interaction transformers are interactions
IT : (p q : Tree) → Set₁
IT p q = Agent I (merge p q)

flipᵈ : {A B : Set} → I/O → (A → A → B) → A → A → B
flipᵈ I = id
flipᵈ O = flip

map' : ∀ {d p q} → flipᵈ d IT q p → Agent d p → Agent d q
map' {I} l i .step hq with l .step hq .step
... | a , l2 = map' l2 (i .step a)
map' {O} l i .step with i .step
... | a , b with l .step a .step
... | c , l2 = c , (map' l2 b)

_∘ᵀ_ : ∀ {p q r} → IT p q → IT q r → IT p r
(b ∘ᵀ a) .step ph .step with b .step ph .step
... | qh , bt with a .step qh .step
... | rh , at = rh , at ∘ᵀ bt

_,ᵗ_ : ∀ {p q r s} → IT p q → IT r s → IT (p ×ᵀ r) (q ×ᵀ s)
_,ᵗ_ a b .step (k , l) .step with a .step k .step | b .step l .step
... | c , d | e , f = (c , e) , (d ,ᵗ f)

entangle : ∀ {A B C D} → D → (d : I/O) → flipᵈ d IT (flipᵈ d alter A (constᵀ D) ×ᵀ flipᵈ d alter C B) (flipᵈ d alter A B)
entangle d I .step (x , _) .step = x , entangle d O
entangle d O .step x .step = (d , x) , entangle d I

---------------------------------------

-- patchable structure
record Patchable : Set₁ where
  constructor Patch'
  field
    Document : Set
    PatchOf : Document → Set
    patch : {s : Document} → PatchOf s → Document

open Patchable

patches : (p : Patchable) → Document p → Tree
patches p s .Branch = p .PatchOf s
patches p s .child r = patches p (p .patch r)

-- cooperative editing of a document
CoEdit : I/O → (p : Patchable) → Document p → Set₁
CoEdit d p s = Agent d (patches p s)

---------------------------------------------------------------------

-- abstract widget
data Widget : Set where
  Button   : String → Widget
  Checkbox : Bool → Widget
  Label    : String → Widget
  Entry    : String → Widget   -- input field
  Empty    : Widget
  _∥_      : Widget → Widget → Widget

infixr 5 _∥_

-- possible edits of a widget (I: by the user; O: by the program)
data WidgetEdit : I/O → Widget → Set
-- ⟪_⟫ performs the edit
⟪_⟫ : {d : I/O} {a : Widget} (p : WidgetEdit d a) → Widget

data WidgetEdit  where
  toggle      : ∀ {d b} → WidgetEdit d (Checkbox b)
  click       : ∀ {s} → WidgetEdit I (Button s)
  setLabel    : ∀ {n} → String → WidgetEdit O (Label n)
  setEntry    : ∀ {d n} → String → WidgetEdit d (Entry n)
  replaceBy   : ∀ {a} → Widget → WidgetEdit O a
  modLeft     : ∀ {d a b} → WidgetEdit d a → WidgetEdit d (a ∥ b)
  modRight    : ∀ {d a b} → WidgetEdit d b → WidgetEdit d (a ∥ b)
  addToLeft addToRight    : ∀ {a} → Widget → WidgetEdit O a
  removeLeft removeRight  : ∀ {a b} → WidgetEdit O (a ∥ b)
  _∙_         : ∀ {a} → (p : WidgetEdit O a) → WidgetEdit O ⟪ p ⟫ → WidgetEdit O a    -- kell?
  same        : ∀ {a} → WidgetEdit O a
  _∥_         : ∀ {a b} → WidgetEdit O a → WidgetEdit O b → WidgetEdit O (a ∥ b)

⟪ replaceBy x ⟫ = x
⟪ modLeft  {d} {a} {b} p ⟫ = ⟪ p ⟫ ∥ b
⟪ modRight {d} {a} {b} p ⟫ = a ∥ ⟪ p ⟫
⟪ toggle {d} {b} ⟫ = Checkbox (not b)
⟪ click {s} ⟫ = Button s
⟪ setLabel l ⟫ = Label l
⟪ setEntry l ⟫ = Entry l
⟪ addToLeft  {r} l ⟫ = l ∥ r
⟪ addToRight {l} r ⟫ = l ∥ r
⟪ removeLeft  {l} {r} ⟫ = r
⟪ removeRight {l} {r} ⟫ = l
⟪ p ∙ q ⟫ = ⟪ q ⟫
⟪ same {a} ⟫ = a
⟪ a ∥ b ⟫ = ⟪ a ⟫ ∥ ⟪ b ⟫

-- Editable widgets structure
Widgets : Patchable
Widgets .Document = I/O × Widget
Widgets .PatchOf (I , s) = Maybe (WidgetEdit I s)  -- TODO: remove Maybe
Widgets .PatchOf (O , s) = WidgetEdit O s
Widgets .patch {I , _} (just p) = O , ⟪ p ⟫
Widgets .patch {I , d} nothing = O , d
Widgets .patch {O , _} p = I , ⟪ p ⟫

pw : I/O → Widget → Tree
pw d g = patches Widgets (d , g)

button : ∀ {s} d → flipᵈ d IT (pw d (Button s)) (flipᵈ d alter' (Maybe ⊤) ⊤)
button I .step nothing  .step = nothing , button O
button I .step (just click) .step = just _ , button O
button O .step _ .step = same , button I

checkbox : ∀ {b} d → flipᵈ d IT (pw d (Checkbox b)) (flipᵈ d alter' (Maybe Bool) (Maybe Bool))
checkbox I .step nothing  .step = nothing , checkbox O
checkbox {b} I .step (just toggle) .step = just (not b) , checkbox O
checkbox O .step nothing .step = same , checkbox I
checkbox {true} O .step (just false) .step = toggle , checkbox I
checkbox {false} O .step (just true) .step = toggle , checkbox I
checkbox O .step (just _) .step = same , checkbox I

label : ∀ {n} d → flipᵈ d IT (pw d (Label n)) (flipᵈ d alter' ⊤ (Maybe String))
label I .step nothing  .step = _ , label O
label I .step (just ())
label O .step nothing .step = same , label I
label O .step (just m) .step = setLabel m , label I

entry : ∀ {s} d → flipᵈ d IT (pw d (Entry s)) (flipᵈ d alter' (Maybe String) (Maybe String))
entry I .step nothing  .step = nothing , entry O
entry I .step (just (setEntry s)) .step = just s , entry O
entry O .step nothing .step = same , entry I
entry O .step (just s) .step = setEntry s , entry I

nextTo : ∀ {a b} d → flipᵈ d IT (pw d (a ∥ b)) (pw d a ×ᵀ pw d b)
nextTo I .step nothing .step = (nothing , nothing) , nextTo O
nextTo I .step (just (modLeft e))  .step = (just e , nothing) , nextTo O
nextTo I .step (just (modRight e)) .step = (nothing , just e) , nextTo O
nextTo O .step (x , y) .step = x ∥ y , nextTo I

_||_ : ∀ {r s a b} → IT (pw I a) r → IT (pw I b) s → IT (pw I (a ∥ b)) (r ×ᵀ s)
p || q = nextTo I ∘ᵀ (p ,ᵗ q)

ease : ∀ {w} → CoEdit I Widgets (I , w) → CoEdit I Widgets (I , w)
ease b .step nothing .step = same , (ease b)
ease b .step (just i) .step with b .step (just i) .step
... | x , y = x , (ease y)

-- GUI program
GUI : Set₁
GUI = Σ Widget λ w → CoEdit I Widgets (I , w)

ease' : GUI → GUI
ease' (_ , x) = _ , ease x

infixr 10 _<>_
_<>_ : GUI → GUI → GUI
(a , b) <> (c , d) = a ∥ c , map' (nextTo I) (b ,ᵀ d)

---------------------------------------------------------------------------------------------------------------

counter = λ n → map' ((button {"+1"} I || label {showNat n} I) ∘ᵀ entangle _ I)
                     (maybefy (arr (const (suc zero)) ∘ᵗ accum _+_ n ∘ᵗ arr showNat))

counter' = λ f b n → map' ((checkbox {b} I || label {showNat n} I) ∘ᵀ entangle nothing I)
                     (maybefy (arr f ∘ᵗ accum _+_ n ∘ᵗ arr showNat))

_*2 = λ x → ease' x <> ease' x

mainWidget = ((_ , counter zero)
           <> (_ , counter' (if_then suc zero else zero) false zero)
           <> (_ , counter' (λ _ → suc zero) false zero)
           <> (_ , counter' (if_then zero else suc zero) false zero)
           <> (_ , map' ((entry {""} I || label {""} I) ∘ᵀ entangle nothing I) (maybefy (arr id)))
             ) *2 *2 *2 *2 *2

