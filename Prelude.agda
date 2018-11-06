{-# OPTIONS --type-in-type #-}
module Prelude where

id : {A : Set} → A → A
id x = x

flip : {A B C : Set} → (A → B → C) → B → A → C
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

if_then_else_ : {A : Set} → Bool → A → A → A
if true  then x else y = x
if false then x else y = y

data _⊎_ (A B : Set) : Set where
  inj₁ : A → A ⊎ B
  inj₂ : B → A ⊎ B

Π : (A : Set) → (A → Set₁) → Set₁
Π A B = (a : A) → B a

infix 4 _,_
record Σ (A : Set) (B : A → Set₁) : Set₁ where
  inductive
  constructor _,_
  field
    proj₁ : A
    proj₂ : B proj₁
open Σ

_×_ : Set → Set → Set
A × B = Σ A λ _ → B

data Maybe (A : Set) : Set where
  nothing : Maybe A
  just : A → Maybe A

maybe : {A B : Set} → B → (A → B) → Maybe A → B
maybe b f nothing = b
maybe b f (just x) = f x

data ℕ : Set where
  zero : ℕ
  suc  : (n : ℕ) → ℕ

{-# BUILTIN NATURAL ℕ #-}

infixl 6 _+_
_+_ : ℕ → ℕ → ℕ
zero  + m = m
suc n + m = suc (n + m)

{-# BUILTIN NATPLUS _+_ #-}

postulate
  String : Set
  showNat : ℕ → String
{-# BUILTIN STRING String #-}
{-# COMPILE JS showNat = function(x) { return JSON.stringify(x); } #-}
