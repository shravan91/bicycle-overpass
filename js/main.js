/* GLOBAL */
var box;
var map;

function setCookie(cname, cvalue, exdays) {
	var d = new Date();
	d.setTime(d.getTime() + (exdays*24*60*60*1000));
	var expires = "expires="+d.toUTCString();
	document.cookie = cname + "=" + cvalue + "; " + expires;
} 

function getCookie(cname) {
	var name = cname + "=";
	var ca = document.cookie.split(';');
	for(var i=0; i<ca.length; i++) {
		var c = ca[i];
		while (c.charAt(0)==' ') c = c.substring(1);
		if (c.indexOf(name) == 0) return c.substring(name.length,c.length);
	}
	return "";
} 

$(document).bind("mobileinit", function() {
	// let PathJS handle navigation
	$.mobile.ajaxEnabled = false;
	$.mobile.hashListeningEnabled = false;
	$.mobile.pushStateEnabled = false;
});

function loadme(){
	i18n.init({resGetPath: 'locales/__ns__-__lng__.json', debug: true, fallbackLng: 'en', useDataAttrOptions:true },function(e){afterInit()});
}

function i18n_gen(){
	$.get( "locales/languages.txt", function( data ){ 
		var select = $('#languages');
		var lines = data.split(/\n/);
		for( var n=0 ; n < lines.length ; n++ ){
			if(lines[n].length > 0){
				var lang = lines[n].split(":");
				var option = '<option class="lang" id="' +lang[1]+ '" value="' +lang[1]+ '">'+lang[0]+'</option>';            
				select.append(option)
			}
		}
		console.log($.i18n.lng());
		var selected = select.find("#"+$.i18n.lng());
        selected.attr('selected', 'selected');
		select.selectmenu();
		select.selectmenu('refresh', true);
		$('.lang').click(function () {
			var lang = $(this).attr('value');
			i18n.init({
				lng: lang
			}, function (t) {
				$(document).i18n();
			});
		});
	});
}

$(document).on( "pagecontainershow", function(){
    ScaleContentToDevice();
    $(window).on("resize orientationchange", function(){
        ScaleContentToDevice();
    })
});

function ScaleContentToDevice(){
    scroll(0, 0);
    var content = $.mobile.getScreenHeight() - $(".ui-header").outerHeight() - 
			$(".ui-footer").outerHeight() - $(".ui-content").outerHeight() + 
			$(".ui-content").height();
    $(".ui-content").height(content);
}
//====================================================
function newHazard(e){
	var pos = new L.LatLng(e.lat, e.lon);
	marker=(new L.MarkerPOI(pos, {element: e,riseOnHover: true}));
	if(e.tags["description"] != undefined)
		marker.bindLabel(e.tags["description"]);
	return marker;
}

function newPoint(e){
	var pos = new L.LatLng(e.lat, e.lon);
	marker=(new L.MarkerPOI(pos, {element: e,riseOnHover: true}));
	if(e.tags["name"] != undefined)
		marker.bindLabel(e.tags["name"]);
	return marker;
}

function addEvents(id,layer,req_layer){
	var status = 0;
	$(id).on("s_change",function(){
		console.log(id);
		if($(this).hasClass("ui-btn-active") && status != 2){
			status = 2;
			if(!map.hasLayer()){
				console.log("Add");
				map.addLayer(layer);
				map.addLayer(req_layer);
			}
		}else if(status != 1){
			status = 1;
			map.removeLayer(layer);
			map.removeLayer(req_layer);
		}
	});
}

var overpassQueue = new L.OverpassQueue({
			//onLoadingStarted: function(){$("#text-zbox-loading").css("display","inline");},
			//onLoadingFinished: function(){$("#text-zbox-loading").css("display","none");}
		});

function createPOILayers(layer,selector,id,newPOI){
	var overpass_f = new L.OverpassFetcher({minZoom:13,selector: selector, layer: layer,createMarker: newPOI,overpassQueue: overpassQueue});
	addEvents(id,layer,overpass_f);
}
//====================================================
function createWayLayers(layer,selector,id, createPolyline){
	var overpass_f;
	overpass_f = new L.OverpassFetcher({minZoom:13,selector: selector, createPolyline:createPolyline,layer: layer,overpassQueue: overpassQueue});
	addEvents(id,layer,overpass_f);
}

function checkTag(tags,key,value,type){
	if(tags.hasOwnProperty(key) && (type == '=' || type == '~')){
		if(tags[key] == value && type == '=')
			return true;
		if(tags[key].search(value) != -1)
			return true;
	}else if(!tags.hasOwnProperty(key) && type == '!='){
		return true;
	}else if(tags.hasOwnProperty(key) && tags[key] != value && type == '!='){
		return true;
	}
	return false;
}
var colors = {noneway:"yellow",opposite_lane:"orange",lane: "green", shared:"purple",cycleway:"red"};

Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};



function createTrails(ll,el){
	var array = [];
	var rlength = Object.size(el.relations);
	var i = 0;
	for(var rel in el.relations){
		console.log(el.relations[rel]);
		var n = L.polyline( ll);
		var color = el.relations[rel].tags["colour"];
		console.log(color);
		n.setStyle({'color': color});
		
		n.setOffset((i-rlength+1)*6);
		array.push(n);
		++i;
	}
	return array;
}

function createWays(ll,el){
	var feature = L.polyline( ll);
	var color = "blue";
	if(checkTag(el.tags,"oneway:bicycle","no",'=') && checkTag(el.tags,"oneway","yes",'='))
		color = 'yellow';
	if(checkTag(el.tags,"oneway:bicycle","no",'=') && checkTag(el.tags,"oneway","-1",'='))
		color = 'yellow';

	if(checkTag(el.tags,"cycleway:left","lane",'='))
		color = 'green';
	if(checkTag(el.tags,"cycleway:right","lane",'='))
		color = 'green';
	if(checkTag(el.tags,"cycleway","lane",'='))
		color = 'green';

	if(checkTag(el.tags,"cycleway:left","opposite_lane",'='))
		color = 'orange';
	if(checkTag(el.tags,"cycleway:right","opposite_lane",'='))
		color = 'orange';
	if(checkTag(el.tags,"cycleway","opposite_lane",'='))
		color = 'orange';

	if(checkTag(el.tags,"highway","cycleway",'='))
		color = 'red';
	if(checkTag(el.tags,"bicycle","designated",'='))
		color = 'red';

	if(checkTag(el.tags,"foot","designated",'=') && checkTag(el.tags,"bicycle","designated",'=') && checkTag(el.tags,"segregated","yes",'!='))
		color = 'purple';
	if(checkTag(el.tags,"foot","designated",'=') && checkTag(el.tags,"highway","cycleway",'=') && checkTag(el.tags,"segregated","yes",'!='))
		color = 'purple';


	feature.setStyle({'color':color});
	return feature;
}

function afterInit(){
	i18n_gen();
	var lat  = ( getCookie("lat" ) ? getCookie("lat" ) : 51.5 );
	var lon  = ( getCookie("lon" ) ? getCookie("lon" ) : 16 );
	var zoom = ( getCookie("zoom") ? getCookie("zoom") : 5 );
	map = L.map('map').setView([lat,lon], zoom);
	L.tileLayer('http://{s}.www.toolserver.org/tiles/bw-mapnik/{z}/{x}/{y}.png', {
		attribution: $.i18n.t('Map data &copy; %s contributors',"<a href='http://openstreetmap.org'>OSM</a>")+" "+
				$.i18n.t('Uses %s',"<a href'http://www.overpass-api.de/'>OverpassAPI</a>"),
		maxZoom: 21,
    	maxNativeZoom: 18
	}).addTo(map);

	var Box =  L.Control.extend({options: { position: 'bottomleft'},
		setText: function(html){
			this.controlDiv.innerHTML=html;
		},
		onAdd: function (map) {
			this.controlDiv = L.DomUtil.create('div', 'leaflet-control-own leaflet-control-message');
			return this.controlDiv;
		}
	});
	box = new Box();
	var zbox = new Box();
	zbox.setPosition( 'topright' ) 
	map.addControl(box);
	map.addControl(zbox);
	zbox.setText('<i id="#text-zbox-zoomin" data-i18n="Please, zoom in"></i><br/>'+
		'<i id="#text-zbox-loading" data-i18n="Loading"></i>...');
	map.on("zoomlevelschange",function(){
		if(map.getZoom() < 15)
			$("#text-zbox-zoomin").css("display","inline");
		else
			$("#text-zbox-zoomin").css("display","none");
	});
	box.setText('<i id="#text-leg" data-i18n="Hover over the button"></i>');

	var adBox = new Box();
	adBox.setPosition('bottomright');
	map.addControl(adBox);
	var adString ='<iframe scrolling="no" style="border: 0; width: 120px; height: 240px;" src="http://coinurl.com/get.php?id=33833&search=bicycle,sport"></iframe>';
	adBox.setText(adString);
	setInterval(function () {adBox.setText(adString);}, 60000*5);

	//$("#text-zbox-loading").css("display","none");

	//Create layers
	createPOILayers(
		L.markerClusterGroup({ disableClusteringAtZoom: 14,
				iconCreateFunction: function(cluster) {
					var childCount = cluster.getChildCount();
					return new L.DivIcon({ html: '<div><span>' + childCount + '</span></div>', className: 'marker-cluster marker-cluster-poi', iconSize: new L.Point(40, 40) });
				}}),
		"(node[amenity=bicycle_parking](%BBOX%);node[amenity=bicycle_repair_station](%BBOX%);node[shop=bicycle](%BBOX%););out;"+
		"(way[amenity=bicycle_parking](%BBOX%);way[amenity=bicycle_repair_station](%BBOX%);way[shop=bicycle](%BBOX%););out center;",
		"#nav-pois",newPoint);

	$("#nav-pois").on("mouseenter",function(){
		box.setText('<div class="pois-sprite pois-sprite-shop-bicycle"></div><i id="#text-leg" class="legend-text" data-i18n="Shop"></i><br/>'+
			'<div class="pois-sprite pois-sprite-amenity-bicycle_repair_station"></div><i id="#text-leg" class="legend-text" data-i18n="Repair station"></i><br/>'+
			'<div class="pois-sprite pois-sprite-amenity-bicycle_parking"></div><i id="#text-leg" class="legend-text" data-i18n="Parking"></i><br/>'
			);
		$(".legend-text").i18n();
	});

	createPOILayers(
		L.markerClusterGroup({ disableClusteringAtZoom: 14,
				iconCreateFunction: function(cluster) {
					var childCount = cluster.getChildCount();
					return new L.DivIcon({ html: '<div><span>' + childCount + '</span></div>', className: 'marker-cluster marker-cluster-hazard', iconSize: new L.Point(40, 40) });
				}}),
		"(node['hazard:bicycle'](%BBOX%););out;(way['hazard:bicycle'](%BBOX%););out center;",
		"#nav-hazards",newHazard);
	$("#nav-hazards").on("mouseenter",function(){
		box.setText('<div class="pois-sprite pois-sprite-hazard__bicycle"></div><i id="#text-leg" class="legend-text" data-i18n="Hazard"></i>');
		$(".legend-text").i18n();
	});
	//Ways
	var ways = L.featureGroup();
	createWayLayers(ways,
			//one way for cars no for bc
			'(way["oneway:bicycle"="no"]["oneway"="yes"](%BBOX%);'+
			'way["oneway:bicycle"="no"]["oneway"="-1"](%BBOX%);'+
			//opposite lane
			'way["cycleway:left"="opposite_lane"](%BBOX%);'+
			'way["cycleway:right"="opposite_lane"](%BBOX%);'+
			'way["cycleway"="opposite_lane"](%BBOX%);'+
			//lane
			'way["cycleway:left"="lane"](%BBOX%);'+
			'way["cycleway:right"="lane"](%BBOX%);'+
			'way["cycleway"="lane"](%BBOX%);'+
			'way["cycleway:lanes"~"designated"](%BBOX%);'+
			//cycleways
			'way["highway"="cycleway"](%BBOX%);'+
			'way["bicycle"="designated"](%BBOX%););out geom;'
		,'#nav-cycleways',createWays);

	//TODO: I can do it better.
	$("#nav-cycleways").on("mouseenter",function(){
		box.setText('<table class="nomargin"><tr><td><p style="color:'+colors.noneway+'">&#9646;</p></td><td><i id="#text-leg" class="legend-text" data-i18n="Not a one-way road for bicycles"></i></td></tr>'+
			'<tr><td><p style="color:'+colors.opposite_lane+'">&#9646;</p></td><td><i id="#text-leg" class="legend-text" data-i18n="Opposite lane"></i></td></tr>'+
			'<tr><td><p style="color:'+colors.lane+'">&#9646;</p></td><td><i id="#text-leg" class="legend-text" data-i18n="Lane"></i></td></tr>'+
			'<tr><td><p style="color:'+colors.shared+'">&#9646;</p></td><td><i id="#text-leg" class="legend-text" data-i18n="Shared cycle way"></i></td></tr>'+
			'<tr><td><p style="color:'+colors.cycleway+'">&#9646;</p></td><td><i id="#text-leg" class="legend-text" data-i18n="Cycleway"></i></td></tr></table>'
			);
		$(".legend-text").i18n();
	});

	//Trails
	var trails = L.featureGroup();
	createWayLayers(trails,
			//one way for cars no for bc
			'relation[route=bicycle](%BBOX%);out;'+
			'way(r)(%BBOX%);out ids tags geom;'
		,'#nav-trails',createTrails);

	$("#nav-trails").on("mouseenter",function(){
		box.setText('<i id="#text-leg" class="legend-text" data-i18n="Colour on the map means trail colour"></i>'
			);
		$(".legend-text").i18n();
	});



	$(".toogle-button.ui-btn-active").trigger("s_change");

	$(".toogle-button").on('click', function() {
		var a = $(this).data("toogle-group");
		var b = $(this).hasClass("ui-btn-active");
		if(a != undefined){
			$("[data-toogle-group="+a+"].ui-btn-active").removeClass("ui-btn-active").trigger("s_change");
		}
		if(b){
			$(this).removeClass("ui-btn-active");
		}else{
			$(this).addClass("ui-btn-active");
		}
		$(this).trigger("s_change");
	});
	map.on("moveend", function(){
		setCookie("lat", map.getCenter().lat,64);
		setCookie("lon", map.getCenter().lng,64);
		setCookie("zoom",map.getZoom(),     64);
	} );
	i18n.init();
	$("[data-i18n]").i18n();	
}

