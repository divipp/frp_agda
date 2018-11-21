
all.js: rts.js jAgda.Reactive.js
	cat rts.js jAgda.Prelude.js jAgda.Reactive.js > $@

jAgda.Reactive.js: Reactive.agda Prelude.agda
	agda --js --js-optimize --no-main Reactive.agda

.PHONEY: run
run: all.js
	firefox index.html
