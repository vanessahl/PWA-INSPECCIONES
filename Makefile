.PHONY: verify test build

verify:
	npm run verify

test:
	npm test

build:
	npm run build


.PHONY: test-all

test-all:
	npm run test:all
