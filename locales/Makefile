CONV=i18next-conv

SRCS:=$(wildcard *.po)
OBJS:=$(SRCS:.po=.json)

RES:=$(shell rm -f languages.txt)

all: clean $(OBJS)

$(OBJS):
	grep "# Language:" $(@:.json=.po) | awk '{print $$3 ":$(@:.json=)"}' >> languages.txt
	$(CONV) -l $(@:.json=) -s $(@:.json=.po) -t translation-$@

clean:
	rm -f languages.txt
	rm -f *.mo
	rm -f *.json
