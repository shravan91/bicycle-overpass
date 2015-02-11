GEN=../gensprite.sh

OBJS=pois.sprite

to-md5 = $(patsubst %,%.md5,$1)
from-md5 = $(patsubst %.md5,%,$1)

all: sprit

sprit: $(OBJS)

%.sprite:
	$(GEN) $(@:.sprite=) png

clean:
	rm *sprite*
