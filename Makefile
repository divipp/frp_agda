
.PHONY: all
all: index.html index.min.html

index.min.html: index1.html rts.min.js Reactive.js index2.html
	cat $^ > $@

index.html: index1.html rts.js Reactive.js index2.html
	cat $^ > $@

Reactive.js: Reactive.agda Prelude.agda externals.txt
	agda --js --js-optimize --js-minify --js-output=$@ --js-externals=externals.txt --no-main $<

