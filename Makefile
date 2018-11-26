
all.js: rts2.js jAgda.Reactive.js
	cat rts2.js jAgda.Reactive.js > $@

jAgda.Reactive.js: Reactive.agda Prelude.agda externals.txt
	agda --js --js-optimize --js-minify --js-output=jAgda.Reactive.js --js-externals=externals.txt --no-main Reactive.agda

all.js.gz: all.js
	gzip -9knf $<

.PHONEY: run
run: all.js
	firefox index.html

#for personal use
.PHONEY: deploy
deploy: all.js
	cp index.html all.js ../../public_html/frp_agda/
