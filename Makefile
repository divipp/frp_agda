
all.js: rts.js jAgda.Reactive.js
	cat rts.js jAgda.Reactive.js > $@

jAgda.Reactive.js: Reactive.agda Prelude.agda externals.txt
	agda --js --js-optimize --js-minify --js-output=jAgda.Reactive.js --js-externals=externals.txt --no-main Reactive.agda


.PHONEY: run
run: all.js
	firefox index.html
