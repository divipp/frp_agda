
jAgda.Reactive.js: Reactive.agda Prelude.agda
	agda --js --no-main Reactive.agda

.PHONEY: run
run: jAgda.Reactive.js
	firefox index.html
