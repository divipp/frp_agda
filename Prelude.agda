{-# OPTIONS --type-in-type #-}
module Prelude where

variable S T A B C D : Set

id : A → A
id x = x

const : A → B → A
const x _ = x

flip : (A → B → C) → B → A → C
flip f x y = f y x

data ⊥ : Set where

record ⊤ : Set where
{-# BUILTIN UNIT ⊤ #-}

data Bool : Set where false true : Bool
{-# BUILTIN BOOL  Bool  #-}
{-# BUILTIN TRUE  true  #-}
{-# BUILTIN FALSE false #-}

not : Bool → Bool
not false = true
not true = false

_==_ : Bool → Bool → Bool
true == false = false
false == false = true
true == true = true
false == true = false

if_then_else_ : Bool → A → A → A
if true  then x else y = x
if false then x else y = y

data _⊎_ A B : Set where
  inj₁ : A → A ⊎ B
  inj₂ : B → A ⊎ B

Π : (A : Set) → (A → Set) → Set
Π A B = (a : A) → B a

infix 4 _,_
record Σ A (B : A → Set) : Set where
  inductive
  constructor _,_
  field
    proj₁ : A
    proj₂ : B proj₁
open Σ public

_×_ : Set → Set → Set
A × B = Σ A λ _ → B

data Maybe (A : Set) : Set where
  nothing : Maybe A
  just : A → Maybe A

maybe : B → (A → B) → Maybe A → B
maybe b f nothing = b
maybe b f (just x) = f x

mapMaybe : (A → B) → Maybe A → Maybe B
mapMaybe f = maybe nothing λ a → just (f a)

data ℕ : Set where
  zero : ℕ
  suc  : (n : ℕ) → ℕ

{-# BUILTIN NATURAL ℕ #-}

infixl 6 _+_
_+_ : ℕ → ℕ → ℕ
zero  + m = m
suc n + m = suc (n + m)

variable n : ℕ

{-# BUILTIN NATPLUS _+_ #-}

data Fin : ℕ → Set where
  zero : Fin (suc n)
  suc  : (i : Fin n) → Fin (suc n)

finToNat : Fin n → ℕ
finToNat zero = zero
finToNat (suc x) = suc (finToNat x)

infixr 5 _∷_

data Vec (A : Set) : ℕ → Set where
  []  : Vec A 0
  _∷_ : A → Vec A n → Vec A (suc n)

{-# BUILTIN STRING String #-}
postulate
  primStringAppend   : String → String → String
  primStringEquality : String → String → Bool
  primShowString     : String → String
  showNat : ℕ → String
{-# COMPILE JS primStringAppend = function(x) { return function(y) { return x + y; }; } #-}
{-# COMPILE JS primStringEquality = function(x) { return function(y) { return x === y; }; } #-}
{-# COMPILE JS primShowString = function(x) { return JSON.stringify(x); } #-}
{-# COMPILE JS showNat = function(x) { return JSON.stringify(x); } #-}

{-# BUILTIN FLOAT Float #-}
postulate
  parseFloat : String → Maybe Float
  primFloatShow     : Float → String
  showFloat         : Float → String
  plusFloat         : Float → Float → Float
  minusFloat        : Float → Float → Float
  mulFloat          : Float → Float → Float
  divFloat          : Float → Float → Float
{-# COMPILE JS parseFloat = function(x) { return myParseFloat(x); } #-}
{-# COMPILE JS showFloat = function(x) { return JSON.stringify(x); } #-}
{-# COMPILE JS plusFloat = function(x) { return function(y) { return x + y; };} #-}
{-# COMPILE JS minusFloat = function(x) { return function(y) { return x - y; };} #-}
{-# COMPILE JS mulFloat = function(x) { return function(y) { return x * y; };} #-}
{-# COMPILE JS divFloat = function(x) { return function(y) { return x / y; };} #-}

Iso : (S T A B : Set) → Set
Iso S T A B = (S → A) × (B → T)

plusIso : Float → Iso Float Float Float Float
plusIso x = plusFloat x , λ y → minusFloat y x

mulIso : Float → Iso Float Float Float Float
mulIso x = mulFloat x , λ y → divFloat y x

Lens : (S T A B : Set) → Set
Lens S T A B = S → A × (B → T)

Prism : (S T A B : Set) → Set
Prism S T A B = (S → A ⊎ T) × (B → T)

prismToLens : Prism S T A B → Lens (Maybe S) (Maybe T) (Maybe A) (Maybe B)
prismToLens (p1 , p2) nothing = nothing , mapMaybe p2
prismToLens (p1 , p2) (just s) with p1 s
... | inj₁ a = just a , mapMaybe p2
... | inj₂ t = nothing , const (just t)

floatPrism : Prism String (Maybe String) Float Float
floatPrism = (parse , show)
  where
    parse : String → Float ⊎ Maybe String
    parse s = maybe (inj₂ nothing) inj₁ (parseFloat s)

    show : Float → Maybe String
    show x = just (showFloat x)
