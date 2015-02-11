#!/bin/bash
xgettext --keyword=t --output=template.pot ../js/*.js --language="perl";
grep data-i18n= ../index.html ../js/*.js | sed -r 's/^[^\n]*data-i18n="([^\"]+)".*/\1/' | sort | uniq | while read in; do echo "" >>template.pot;echo "msgid \"$in\"" >> template.pot;  echo "msgstr \"\"" >> template.pot; done; 
