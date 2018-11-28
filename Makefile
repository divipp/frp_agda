
index.html: index1.html rts2.js jAgda.Reactive.js index2.html
	cat $^ > $@

jAgda.Reactive.js: Reactive.agda Prelude.agda externals.txt
	agda --js --js-optimize --js-minify --js-output=$@ --js-externals=externals.txt --no-main $<

#for benchmarking
%.gz: %
	gzip -9knf $<

.PHONEY: run
run: index.html
	firefox $<

#for personal use
.PHONEY: deploy
deploy: index.html
	cp $^ ../../public_html/frp_agda/
