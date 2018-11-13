
# Goal

My goal is to define composable GUI programs.

A definition is compositional if it is either a trivial definition or
it is made out of simpler self-containing compositional definitions.

After many years of exploration I should admit that depedent types are essential to achieve my goal.  
It was a surprise that the description of GUI programs with dependent types is easier than I thought.  
This repository is a work-in-progress attempt for defining composable GUI programs in Agda.

-   [Try little examples online](https://people.inf.elte.hu/divip/frp_agda/index.html)

-   How to compile with Agda 2.6.0 (development version):

        agda --js --no-main Reactive.agda

-   How to run with Firefox:

        firefox index.html


# Introduction

An algorithm computing a value of type `A` can be defined as a λ-expression of type `A`:

```agda
e : A
```

For example

```agda
1 + 1 : ℕ
```

An algorithm computing a `B` from an `A` can be defined as an expression

```agda
e : A → B
```

Not only one can define any algorithm by λ-calculus, but one can do so compositionally.
I cannot prove this claim, but overwhelmingly lots of examples accumulated to support this claim.

But, what is an interactive algorithm?  
Can we define composable interactive algorithms with pure λ-calculus, even without monads?

Think about `(e : A → B)` as an interactive algorithm, where the interaction is trivial:
`e` takes exactly one input and gives one output.

More complex interactions can be described with more complex types without adding any unusual
construct to type theory:

-   An algorithm with *two* inputs and *two* outputs:

    ```agda
    e : ℕ × ℕ → Bool × Bool
    e (i , j) = (even j , even i)
    ```

-   An algorithm which takes an `ℕ`, then returns a `Bool`, then takes another `ℕ` and returns a `Bool`:

    ```agda
    e : ℕ → Bool × (ℕ → Bool)
    e i = even i , λ j → even (i + j)
    ```

    There is a *callback* function in the definition. We wish to escape the callback hell later though.

-   An algorithm which takes an `(i : ℕ)` and returns `i` natural numbers:

    ```agda
    e : (i : ℕ) → Vec ℕ i
    e 0 = []
    e (suc i) = i ∷ e i
    ```

    A *dependent function* is used to define the shape of the interaction.

-   An algorithm which takes a `(b : Bool)` and returns `Bool` if `b` is `true` and otherwise takes an
    `ℕ` too and returns a `Bool`:

    ```agda
    e : (b : Bool) → if b then Bool else ℕ → Bool
    e true = false
    e false i = even i
    ```

    No new construct is used here but note how `e` takes different number of arguments in its two alternatives.

We extend this idea further using (indexed) algebraic data types to define interactive algorithms.  
*Coinduction* is needed to support infinite interactions,
but no other language constructs or concepts like monads are needed.

GUI programs are defined as special interactive algorithms.

After knowing what a GUI program is, I give it a try to answer what a
composable GUI program is.


# Definition of interactive algorithms

## Communication protocols

Forget first the identity of the communication parties
and focus on the type of the communication reactions.

Suppose that the type of a reaction is determined
by the value of the previous reactions.
Let's call *(communication) protocol* the set of the rules which determine the types.

Such protocols can be described by arbitrary branching trees in Agda.


### Infinite arbitrary branching trees

An arbitrary branching tree is tree data structure where each node is annotated by a `Set`
and there is a child for each element in the set.  

One instance of such a tree is:

```
          Bool
       true/\false
          /  \
         ⊤    Bool
       tt|  true|\false
         |      | \
       Bool     ⊤ ...
    true/\false  \tt
       /  \       \
   Bool    ℕ       ...
true/\fal 0|\1 2 3...
   /  \    | \   ..
 ...  ... ... ... ...
```

This tree can be interpreted as a protocol:

-   The first reaction has type `Bool`.
-   If the first reaction is `true` then the second reaction has type `⊤`, otherwise it has type `Bool`.
-   If the first two reactions are `true` and `tt` then the third reaction has type `Bool`.
-   ...

The set of arbitrary branching trees can be defined in Agda as follows:

```agda
record Tree : Set where
  coinductive
  field
    Branch : Set
    child : Branch → Tree
```

The keyword `coinductive` is needed for Agda to accept definitions like

```agda
infiniteBinaryTree : Tree
infiniteBinaryTree .Branch = Bool
infiniteBinaryTree .child _ = infiniteBinaryTree
```

## Parties of communication

First consider only communications with two parties.

Let's call the parties *agent* and *(outside) world*.

### Input and output

Let's call *output* the reactions of the agent and *input* the reactions of the world.

Define input and output as `I` and `O` respectively in Agda:

```agda
data I/O : Set where
  I O : I/O

opposite : I/O → I/O
opposite I = O
opposite O = I
```

## Communication phases

We can annotate each node in the protocol tree depending on who's turn to react.
(We discuss later the possibility of both parties' reaction at the same time.)
So there will be *input nodes* or nodes in *input phase* and *output nodes* or nodes in *output phase*.

-   In input nodes the world chooses a subtree.
-   In output nodes the agent chooses a subtree.

An agent obeying a protocol tree is defined by giving a strategy, i.e. keeping exactly one subtree in all output nodes of the tree.
In other words, an agent is defined if the agent's choices are made in advance for all output nodes.

For example, assuming alternating input/output phases:

```
          Bool           ---- input node
       true/\false         -- the world's options
          /  \
         ⊤    Bool       ---- output nodes
       tt|  true|          -- tt and true is chosen by the program
         |      |
       Bool     T        ---- input nodes
    true/\false |tt        -- the world' options
       /  \     |
   Bool    ℕ   ...       ---- output nodes
    |false |1              -- false and 1 is chosen by the agent
    |      |
   ...    ...
```

If the world also makes choices we get a *trace* of the communication:

```
          Bool           ---- input node
       true|               -- true is chosen by the world
           |
           ⊤             ---- output node
         tt|               -- tt is chosen by the program
           |
          Bool           ---- input node
      false|               -- false is chosen by the world
           |
           ℕ             ---- output node
          1|               -- 1 is chosen by the agent
           |
          ...
```


### Assumption on interleaved input/output phases

Assume that input and output phases are interleaved, so
each input is followed by an output and vice-versa.  

This assumption is not restrictive, because successive inputs or outputs can be tupled together
or dummy `⊤`-typed reactions can be placed between them.
The meaning of a `⊤`-typed reaction is that the relevant party delays its activity in the communication.

For example,

```
      A           -- input node
     a|\...
      | \
      B  ...      -- B is input node
     /|\
    .....
```

can be turned into

```
      A           -- input node
     a|\...
      | \
      ⊤  ...      -- ⊤ is output node
    tt|
      |
      B           -- input node
     /|\
    .....
```

Or,

```
        A        -- input node
    a₁/|a₂\...
     / |   \
f(a₁) f(a₂) ...  -- input nodes (each)
 /|\   /|\
..... .....
```

can be turned into

```
     Σ A f       -- input node
     //||\\
    ........
```


### End of the communication

Traces never contain ⊥-typed nodes, so ⊥ cannot terminate the communication.
⊥ in the protocol tree denotes that that branch in the communication is impossible.

The protocol can denote the end of the communication by
delaying further communication forever.

For example,

```
    Bool
 true/\false
    /  \
   ℕ    end of communication
  /|\
 .....
```

can be expressed as

```
    Bool
 true/\false
    /  \
   ℕ    ⊤
  /|\   |tt
 .....  T
        |tt
        T
        |tt
       ...
```

The end of communication can be defined in Agda as:

```agda
end : Tree
end .Branch = T
end .child tt = end
```

Another option is to use a dedicated constructor to denote the end of the communication,
but that would unnecessarily complicate the further definitions.


## Definition of agents

For each protocol `p` we define the set of agents `AgentI p`
which obey `p` and starts the communication in *input* phase.
Similarly we define the set of agents `AgentO p`
which obey `p` and starts the communication in *output* phase.

Remember that an agent is defined if exactly one subtree is chosen for output nodes.
We can do this in Agda:

```agda
-- this definition will be replaced by the definition of `Agent`
rec
    record AgentI (p : Tree) : Set where
      coinductive
      field
        step : (a : p .Branch) → AgentO (p .child a)
        -- map each input to an output-agent of the relevant subtree

    record AgentO (p : Tree) : Set where
      coinductive
      field
        step : Σ (p .Branch) (λ a → AgentI (p .child a))
        -- give an output and an input agent of the relevant subtree
```

The definition of `AgentI` and `AgentO` is so similar that
we can unify them.

First define a phase-dependent Π-or-Σ type:

```agda
ΠΣ : I/O → (A : Set) → (A → Set) → Set
ΠΣ I A P = (a : A) → P a     -- dependent function
ΠΣ O A P = Σ A (λ a → P a)   -- dependent pair
```

The unified definition of input/output agents in Agda:

```agda
record Agent (i/o : I/O) (p : Tree) : Set where
  coinductive
  field
    step : ΠΣ i/o (p .Branch) λ a → Agent (opposite i/o) (p .child a)
```





# Definition of GUI programs

## Widgets

```agda
data Widget : Set where
  Button    :                   Widget
  CheckBox  :            Bool → Widget
  Label     :          String → Widget
  Entry     :          String → Widget
  Container : Widget → Widget → Widget
```

TODO: explanation

## Edits on widgets

```agda
data WidgetEdit : I/O → Widget → Set where
  click     :                              WidgetEdit I Button
  toggle    :                    ∀ {d b} → WidgetEdit d (CheckBox b)
  setLabel  :             ∀ {s} → String → WidgetEdit O (Label s)
  setEntry  :           ∀ {d s} → String → WidgetEdit d (Entry s)
  replaceBy :             ∀ {w} → Widget → WidgetEdit O w
  modLeft   : ∀ {d l r} → WidgetEdit d l → WidgetEdit d (Container l r)
  modRight  : ∀ {d l r} → WidgetEdit d r → WidgetEdit d (Container l r)
  _∙_ : ∀ {a} → (p : WidgetEdit O a) → WidgetEdit O ⟪ p ⟫ → WidgetEdit O a
```

An edit on widgets can be made either by the user (`I` indexed), by the program (`O` indexed)
or both (polymorphic).

TODO: more explanation

## Performing the edits

```agda
⟪_⟫ : {d : I/O} {a : Widget} (p : WidgetEdit d a) → Widget
⟪ click ⟫              = Button
⟪ toggle {b = b} ⟫     = CheckBox (not b)
⟪ setLabel s ⟫         = Label s
⟪ setEntry s ⟫         = Entry s
⟪ replaceBy x ⟫        = x
⟪ modLeft  {r = r} p ⟫ = Container ⟪ p ⟫ r
⟪ modRight {l = l} p ⟫ = Container l ⟪ p ⟫
⟪ p ∙ q ⟫              = ⟪ q ⟫
```

TODO: explanation

## What is a GUI program

```agda
GUIProtocol : I/O → Widget → Tree
GUIProtocol d w .Branch = WidgetEdit d w
GUIProtocol d w .child p = GUIProtocol (opposite d) ⟪ p ⟫

GUIProgram : Set
GUIProgram = Σ Widget λ w → Agent I (GUIProtocol I w)
```

So a GUI program is an agent which cooperatively edits the widgets by the user.

TODO: more explanation

# Composable GUI programs

TODO



