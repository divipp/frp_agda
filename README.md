
# Goal

My goal is to define composable GUI programs.

This repository is a work-in-progress attempt for defining composable GUI programs in Agda.

Currently a little demo GUI application is written in Agda which runs in the browser.

-   [Try the demo application](https://people.inf.elte.hu/divip/frp_agda/index.html)

-   [Try the demo application (minified and compressed version)](https://people.inf.elte.hu/divip/frp_agda/index.min.html)

-   How to produce the `index.html` and `index.min.html` files:

    -   Check out and build the [js-erasure](https://github.com/agda/agda/commits/js-erasure) branch
        of the Agda compiler
    -   run `make`


# Introduction

## What is an algorithm?

An algorithm computing a value `x` of type `A` can be defined as a λ-expression of type `A`:

```agda
x : A
x = ...
```

For example, the algorithm computing two can be defined by

```agda
two : ℕ
two = 1 + 1
```

An algorithm computing a `B` from an `A` can be defined as a function

```agda
f : A → B
f = ...
```

Not only one can define any algorithm by λ-calculus, but one can do so compositionally.  
(However, I cannot prove this claim. I believe in it because I have seen so many "functional pearls" and I have not seen any counter-example.)


## What is an interactive algorithm?  

We can define composable interactive algorithms with pure λ-calculus, even without monads.

The simplest example is the following.

`(e : A → B)` can be interpreted as a simple interactive algorithm:  
`e` takes exactly one input, then it gives one output and the interaction is stopped.

More complex interactions can be described with more complex types.

### Multiple inputs and outputs

An algorithm with *two* inputs and *two* outputs:

```agda
e : ℕ × ℕ → Bool × Bool
e (i , j) = (even j , even i)
```

### Interactions with several steps

An algorithm which takes an `ℕ`, then returns a `Bool`, *then* takes another `ℕ` and returns a `Bool`:

```agda
e : ℕ → Bool × (ℕ → Bool)
e i = even i , λ j → even (i + j)
```

Notes:

-   The `(λ j → even (i + j))` function is a so called *callback* function.
    The callback function is returned to the party who started the interaction.
    This party will call back this function with the second input value.

-   The callback function depends on the first input value.
    In other words, the callback function encapsulates the state of the interaction.
    (The state here refers to the state of the interactive program.)

-   The callback function is expected to be called *exactly once*.
    This expectation can be expressed by *linear types*.  

    TODO: Use linear type to express this expectation.

-   It is well-known that interaction can be modelled by callback functions.
    The hard thing is to define complex interactive programs by composing
    simpler independent interactive programs.


### Dynamic interactions

An interaction is *dynamic*, if the *type* of an input/output depends on the *values* of previous inputs/outputs.

For example, an algorithm which takes an `(i : ℕ)` and returns `i` natural numbers:

```agda
e : (i : ℕ) → Vec ℕ i
e 0 = []
e (suc i) = i ∷ e i
```

A *dependent function* is used to define the shape of the interaction.

Another example:  
An algorithm which takes a `(b : Bool)` and returns `Bool` if `b` is `true` and otherwise takes an
`ℕ` too and returns a `Bool`:

```agda
e : (b : Bool) → if b then Bool else ℕ → Bool
e true = false
e false i = even i
```

Note how `e` takes different number of arguments in its two alternatives.

### Other kind of interactions

We extend this idea further using (indexed) algebraic data types to define interactive algorithms.

*Coinduction* will be needed to support infinite interactions,
but no other language constructs or concepts (like monads) are needed.


# Definition of interactive algorithms

## Protocols

Forget first the parties of the interaction and focus on the shape of messages instead.

Let's assume, that the shape of each message is well known before receiving the message.  
In other words, *each message has a type*.

This assumption is not limiting at all.
For example, it allows variable-length messages which can be modelled by a dependent pair of length and content.

The assumption also allows that the type of a message may depend on the values of the previous messages.

Let's call *protocol* the rules which determine the types of the messages during the interaction.

Protocols can be modelled by infinite arbitrary branching trees in Agda.


### Infinite arbitrary branching trees

An infinite arbitrary branching tree is the following tree data structure:

-   Each node is annotated by a set called `Branch`.
-   Each node has a child for each element of its `Branch` set.
-   The children are infinite arbitrary branching trees.

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

This tree can be interpreted as the following protocol:

-   The first message is a `Bool`.
-   If the first message is `true` then the second message is a `⊤`, otherwise it is a `Bool`.
-   If the first two messages are `true` and `tt` then the third message is a `Bool`.
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

## Parties

There can be several parties involved in an interaction.  

We pick a party and look at the interaction from that party's point of view.  
Let's call the party we pick *agent* and let's call all other parties the *(outside) world*.

### Input and output

Let's call *output* the messages of the agent and *input* the messages of the world to the agent.

Define input and output as `I` and `O` respectively in Agda:

```agda
data I/O : Set where
  I O : I/O

opposite : I/O → I/O
opposite I = O
opposite O = I
```

## Communication phases

Assumptions

3.  Each input is immediately followed by an output
4.  There are no asynchronous outputs

Possible scenarios:

-   ...|input|output|...|input|output|...|input|output|...
-   |output|...|input|output|...|input|output|...


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


### Assumption on interleaved input/output

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

## Dealing with more parties

### Notation

```
        p          A : Agent O p
    A >---> B      B : Agent I p
```

d = (i/o , p)                      -- directed protocol
!(i/o , p) = opposite i/o , p      -- inversion of directed protocol
Agent' (i/o, p) = Agent i/o p

```
      d  !d        A : Agent' d
    A-------B      B : Agent' !d
```

### Agents with multiple protocols

```
      | r
      |
   p  |  q
   ---A---      A : Agent' (merge p q r)
```

### Interaction graphs

nodes: agents
edges: directed protocols

```
        B
     q / \ p
      /   \
     A-----C
        r
```

Modelling multiedges: ...

### Boundaries

boundary: closed suface which divides the space into two parts

bisection at a boundary:
-   merge all protocols which intersects the boundary
-   (partially) merge all agents which each side of a boundary

### Modeling oracles

oracle: an agent which is a black box
oracle elimination: bisect at a boundary which encloses all oracles and


```
     outer world
    ---------------+---+---+---+--+-------> time
     agent         |   ^   |   ^  |
                   |   |   |   |  |
    inputs/outputs v   |   v   |  v
                  
```



- kommunikáció két féllel (protokollok különböző összefésülése)
    - mint egy trafó
    - szinkronizáltan jönnek az üzenetek
    - vagy-vagy jönnek az üzenetek
- "lyukas" ágensek, ágens trafók
    - _o_
    - _x_
    - map
- speciális ágensek
    - véletlen szám generátor
    - timer


### Is the `Agent` type enough to describe all interactive algorithms?  

TODO: Explain how to describe effects like having a timer, random number generation, ...


### Are elements of the `Agent` type composable?  

TODO: Give hints about composition.






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


### Egyszerű operációs rendszer

    type Coords = (Int, Int)       -- (1, 1) és (1024, 768) között
    type Color = (Int, Int, Int)   -- rgb színek

bemenet: egér koordináták  Coords
         egér gomb         Bool

kimenet: képernyő          Coords → Color





