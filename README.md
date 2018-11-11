
# Goal

My goal is to define composable GUI programs.

A definition is compositional if it is either a trivial definition or
it is made out of simpler self-containing compositional definitions.

After many years of exploration I admit that depedent types are essential to achieve my goal.  
It was a surprise that the description of GUI programs with dependent types is easier than I thought.  
This repository is a work-in-progress attempt for defining composable GUI programs in Agda.

-   [Try little examples online](https://people.inf.elte.hu/divip/frp_agda/index.html)

-   How to compile with Agda 2.5.4.1:

        agda --js --no-main Reactive.agda

-   How to run with Firefox:

        firefox index.html


# Introduction

An algorithm computing a value of type `A` can be defined as an λ-expression of type `A`:

    e : A

For example

    1 + 1 : ℕ

An algorithm computing a `B` from an `A` can be defined as an expression

    e : A → B

Not only one can define any algorithm by λ-calculus, but one can do so compositionally.
I cannot prove this claim, but overwhelmingly lots of examples accumulated to support this claim.

But, what is an interactive algorithm?  
Can we define composable interactive algorithms with pure λ-calculus, even without monads?

Think about `(e : A → B)` as an interactive algorithm, where the interaction is trivial:
`e` takes exactly one input and gives one output.

More complex interactions can be described with more complex types without adding any unusual
construct to type theory:

-   An algorithm with *two* inputs and *two* outputs:

        e : ℕ × ℕ → Bool × Bool
        e (i , j) = (even j , even i)

-   An algorithm which takes an `ℕ`, then returns a `Bool`, then takes another `ℕ` and returns a `Bool`:

        e : ℕ → Bool × (ℕ → Bool)
        e i = even i , λ j → even (i + j)

    There is a *callback* function in the definition. We wish to escape the callback hell later though.

-   An algorithm which takes an `(i : ℕ)` and returns `i` natural numbers:

        e : (i : ℕ) → Vec ℕ i
        e 0 = []
        e (suc i) = i ∷ e i

    A *dependent function* is used to define the shape of the interaction.

-   An algorithm which takes a `(b : Bool)` and returns `Bool` if `b` is `true` and otherwise takes an
    `ℕ` too and returns a `Bool`:

        e : (b : Bool) → if b then Bool else ℕ → Bool
        e true = false
        e false i = even i

    No new construct is used here but note how `e` takes different number of arguments in its two alternatives.

We extend this idea further using (indexed) algebraic data types to define interactive algorithms.  
*Coinduction* is needed to support infinite interactions,
but no other language constructs or concepts like monads are needed.

GUI programs are defined as special interactive algorithms.

After knowing what a GUI program is, I give it a try to answer what a
composable GUI program is.


# Shapes of interactions

    record Tree : Set where
      coinductive
      field
        Branch : Set
        child : Branch → Tree

TODO: explanation

# Definitions of interactive algorithms (agents)

## Input and output phases

    data I/O : Set where
      I O : I/O

    opposite : I/O → I/O
    opposite I = O
    opposite O = I

    ΠΣ : I/O → (A : Set) → (A → Set₁) → Set₁
    ΠΣ I = Π
    ΠΣ O = Σ

TODO: explanation

## The agents

    record Agent (i/o : I/O) (p : Tree) : Set where
      coinductive
      field
        step : ΠΣ i/o (p .Branch) λ a → Agent (opposite i/o) (p .child a)

TODO: explanation

# Definitions of GUI programs

## Widgets

    data Widget : Set where
      Button    :                   Widget
      CheckBox  :            Bool → Widget
      Label     :          String → Widget
      Entry     :          String → Widget
      Container : Widget → Widget → Widget

TODO: explanation

## Edits of widgets

    data WidgetEdit : I/O → Widget → Set where
      click     :                              WidgetEdit I Button
      toggle    :                    ∀ {d b} → WidgetEdit d (CheckBox b)
      setLabel  :             ∀ {s} → String → WidgetEdit O (Label s)
      setEntry  :           ∀ {d s} → String → WidgetEdit d (Entry s)
      replaceBy :             ∀ {w} → Widget → WidgetEdit O w
      modLeft   : ∀ {d l r} → WidgetEdit d l → WidgetEdit d (Container l r)
      modRight  : ∀ {d l r} → WidgetEdit d r → WidgetEdit d (Container l r)
      _∙_ : ∀ {a} → (p : WidgetEdit O a) → WidgetEdit O ⟪ p ⟫ → WidgetEdit O a

An edit on widgets can be made either by the user (`I` indexed), by the program (`O` indexed)
or both (polymorphic).

TODO: more explanation

## Performing the edits

    -- ⟪_⟫ performs the edit
    ⟪_⟫ : {d : I/O} {a : Widget} (p : WidgetEdit d a) → Widget
    ⟪ click ⟫              = Button
    ⟪ toggle {b = b} ⟫     = CheckBox (not b)
    ⟪ setLabel s ⟫         = Label s
    ⟪ setEntry s ⟫         = Entry s
    ⟪ replaceBy x ⟫        = x
    ⟪ modLeft  {r = r} p ⟫ = Container ⟪ p ⟫ r
    ⟪ modRight {l = l} p ⟫ = Container l ⟪ p ⟫
    ⟪ p ∙ q ⟫              = ⟪ q ⟫

TODO: explanation

## What is a GUI program

    GUIProtocol : I/O → Widget → Tree
    GUIProtocol d w .Branch = WidgetEdit d w
    GUIProtocol d w .child p = guiProtocol (opposite d) ⟪ p ⟫

    GUIProgram : Set
    GUIProgram = Σ Widget λ w → Agent I (GUIProtocol I w)

So a GUI program is an agent which cooperatively edits the widgets by the user.

TODO: more explanation

# Composable GUI programs

TODO



