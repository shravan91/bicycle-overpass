#!/bin/bash
if [ $# -gt 0 ]
then
    ext="."$2;
    input=$1;
    classname=$1"-sprite";

    css="$classname.css";
    html="$classname.html";

	rm $css $html $classname$ext -f
    touch $css $html;
    convert $input/*$ext -append $classname$ext;
    echo -e "<html>\n<head>\n\t<link rel=\"stylesheet\" href=\"$css\" />\n</head>\n<body>\n\t<h1>Sprite test page</h1>\n" >> $html
    echo -e ".$classname {\n\tbackground:url('$classname$ext') no-repeat top left; display:inline-block;\n}" >> $css;
    counter=0;
    offset=0;
    for file in $input/*$ext
    do
        width=`identify -format "%[fx:w]" "$file"`;
        height=`identify -format "%[fx:h]" "$file"`;
        idname=`basename "$file" $ext`;
        clean=${idname// /-}
        echo ".$classname-$clean {" >> $css;
        echo -e "\tbackground-position:0 -${offset}px;" >> $css;
        echo -e "\twidth: ${width}px;" >> $css;
        echo -e "\theight: ${height}px;\n}" >> $css;
        echo -e "<a href=\"#\" class=\"$classname-$clean\"></a>\n" >> $html;
        let offset+=$height;
        let counter+=1;
    done

    echo -e "<h2>Full sprite:</h2>\n<img src=\"$classname$ext\" />" >> $html;
    echo -e "</body>\n</html>" >> $html;

    echo -e "\t\tComplete! - $counter sprites created.";

else

    echo -e "There should be at least 1 argument!\n\tgensprite.sh input_dir classname input_extension"

fi
