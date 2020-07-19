module Prelude where

open import Data.Unit using (⊤) public
open import Data.Empty using (⊥) public
open import Function using (id; const; flip) public
open import Data.Sum using (_⊎_; inj₁; inj₂) public
open import Data.Product using (Σ; proj₁; proj₂; _,_; _×_) public
open import Data.Maybe using (Maybe; nothing; just) public
open import Data.Nat using (ℕ; _+_; zero; suc) public
open import Data.Fin using (Fin; zero; suc; toℕ; fromℕ) public
open import Data.Vec using (Vec; _∷_; []) public
open import Data.String using (String) public
open import Data.Float using (Float) renaming (show to primShowFloat) public

open import Agda.Builtin.Float

variable S T A B C D S' T' A' B' : Set

-- redefine Bool to avoid COMPILE JS pragma on std-lib's Bool
data Bool : Set where
  false true : Bool

not : Bool → Bool
not true = false
not false = true

if_then_else_ : Bool → A → A → A
if true  then a else b = a
if false then a else b = b

_==_ : Bool → Bool → Bool
true  == false = false
true  == true  = true
false == false = true
false == true  = false

maybe : B → (A → B) → Maybe A → B
maybe b f nothing = b
maybe b f (just x) = f x

mapMaybe : (A → B) → Maybe A → Maybe B
mapMaybe f = maybe nothing λ a → just (f a)

data _⊍_ (A B : Set) : Set where
  inj₁ : A → A ⊍ B
  inj₂ : B → A ⊍ B
  both : A → B → A ⊍ B

variable n : ℕ

postulate
  showNat           : ℕ → String
  primStringAppend  : String → String → String
  primParseFloat    : String → Float
  isNaN             : Float → Bool
{-# COMPILE JS showNat          = a=>JSON.stringify(a) #-}
{-# COMPILE JS primStringAppend = a=>b=>a+b #-}
{-# COMPILE JS primParseFloat   = a=>Number(a) #-}
{-# COMPILE JS isNaN            = a=>b=>b[isNaN(a)?1:0]() #-}

Iso   = λ (S T A B : Set) → (S → A) × (B → T)
Lens  = λ (S T A B : Set) → S → A × (B → T)
Prism = λ (S T A B : Set) → (S → A ⊎ T) × (B → T)

plusIso : Float → Iso Float Float Float Float
plusIso x = primFloatPlus x , λ y → primFloatMinus y x

mulIso : Float → Iso Float Float Float Float
mulIso x = primFloatTimes x , λ y → primFloatDiv y x

prismToLens : Prism S T A B → Lens (Maybe S) (Maybe T) (Maybe A) (Maybe B)
prismToLens (p1 , p2) nothing = nothing , mapMaybe p2
prismToLens (p1 , p2) (just s) with p1 s
... | inj₁ a = just a , mapMaybe p2
... | inj₂ t = nothing , const (just t)

floatPrism : Prism String (Maybe String) Float Float
floatPrism = parse , (λ x → just (primShowFloat x))
  where
    parse : String → _
    parse s = if isNaN p then inj₂ nothing else inj₁ p
      where
        p = primParseFloat s

