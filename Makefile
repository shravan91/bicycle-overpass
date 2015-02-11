SUBDIRS = locales res

.PHONY: bicycle $(SUBDIRS)

bicycle: $(SUBDIRS)

$(SUBDIRS):
	$(MAKE) CFLAGS="$(CFLAGS)" -C $@

clean:
	for d in $(SUBDIRS); do $(MAKE) -C $$d clean; done
