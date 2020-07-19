
# Interactive Programming in Agda – Objects and Graphical User Interfaces

ANDREAS ABEL, STEPHAN ADELSBERGER, ANTON SETZER  
http://www.cse.chalmers.se/~abela/ooAgda.pdf

`Tree` is related to state dependent interface data type defined in the paper:

```agda
record Interface : Set where
  field
    State  : Set
    Method : (s : State) → Set
    Result : (s : State) → (m : Method s) → Set
    next   : (s : State) → (m : Method s) → (r : Result s m) → State
```

`Tree` is at least as expressive as `Interface`, because one can make a `Tree` from an `Interface` by the following function:

```agda
mkTree : (i : Interface) → i .State → Tree
mkTree i s .Branch = i .Method s
mkTree i s .child m .Branch = i .Result s m
mkTree i s .child m .child r = mkTree i (i .next s m r)
```

Basically, `Interface` ties two levels in `Tree` together, an input and an output level.
I prefer to keep levels separated because then there is more freedom in transformations.

The state-dependent object type in the paper is related to `Agent`:

    Object i s   ~   Agent I (mkTree i s)

The first parameter of `Agent` is `I` which stands for 'input'.
One can start an agent in the output phase also which again gives more freedom. 



# Specifing Interaction with Dependent Types

Peter Hancock, Anton Setzer,  2010  
http://www.cs.swan.ac.uk/~csetzer/articles/dtp00.pdf


# TODO

Discuss the relation with the following works:

https://pigworker.wordpress.com/2015/01/04/traffic-dependent-session-types/

https://pigworker.wordpress.com/2015/01/29/compositional-processes-for-dependent-sessions/

https://vimeo.com/106073134  -- sent by Máté Kovács

