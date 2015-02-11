Object.size = function(obj) {
	var size = 0, key;
	for (key in obj) {
		if (obj.hasOwnProperty(key)) size++;
	}
	return size;
};

L.OwnLayersPack = L.Class.extend({
	options: {
		wayColors: {noneway:"yellow",opposite_lane:"orange",lane: "green", shared:"purple",cycleway:"red"}
	},

    initialize: function (options) {
		var _this = this;
        L.Util.setOptions(this, options);
		this._overpassQueue = new L.OverpassQueue({
			//onLoadingStarted: function(){$("#text-zbox-loading").css("display","inline");},
			//onLoadingFinished: function(){$("#text-zbox-loading").css("display","none");}
		});
		//POI
		this._poiLayer = L.markerClusterGroup({ 
					disableClusteringAtZoom: 14,
					iconCreateFunction: function(cluster) {
						var childCount = cluster.getChildCount();
						return new L.DivIcon({ html: '<div><span>' + childCount + '</span></div>',
								className: 'marker-cluster marker-cluster-poi',
								iconSize: new L.Point(40, 40) });
					}
				});
		this._addPOIPart();
		//Hazard
		
		this._hazardLayer = L.markerClusterGroup({
					disableClusteringAtZoom: 14,
					iconCreateFunction: function(cluster) {
						var childCount = cluster.getChildCount();
						return new L.DivIcon({ html: '<div><span>' + childCount + '</span></div>',
								className: 'marker-cluster marker-cluster-hazard',
								iconSize: new L.Point(40, 40) });
					}
					});
		this._addHazardPart();

		//Way
		this._wayLayer = L.featureGroup();
		this._addWayPart();
		this.wayzoomlevel = 18;
		this._waysZoomedLayer = L.featureGroup();
		this.options.map.on("zoomend",function(){
				if(_this.options.map.getZoom() < _this.wayzoomlevel){
					_this._hideLayer(_this._waysZoomedLayer);
					_this._showLayer(_this._wayLayer);
				}else{
					_this._showLayer(_this._waysZoomedLayer);
					_this._hideLayer(_this._wayLayer);
				}
			});
		//Trail
		this._trailLayer = L.featureGroup();
		this._addTrailPart();
	},

	_hideLayer: function(layer){
		if(this.options.map.hasLayer(layer))
			this.options.map.removeLayer(layer);
	},

	_showLayer: function(layer){
		if(!this.options.map.hasLayer(layer))
			this.options.map.addLayer(layer);
	},

	hidePOILayer: function(){
		this._hideLayer(this._poiLayer);
		this._hideLayer(this._poifetcher);
	},

	showPOILayer: function(){
		this._showLayer(this._poiLayer);
		this._showLayer(this._poifetcher);
	},

	_addPOIPart: function (){
		var selector = "(node[amenity=bicycle_parking](%BBOX%);node[amenity=bicycle_repair_station](%BBOX%);node[shop=bicycle](%BBOX%););out;"+
					"(way[amenity=bicycle_parking](%BBOX%);way[amenity=bicycle_repair_station](%BBOX%);way[shop=bicycle](%BBOX%););out center;";

		this._poifetcher = new L.OverpassFetcher({
					minZoom:13,
					selector: selector,
					layer: this._poiLayer,
					createMarker: 	function(e){
						var pos = new L.LatLng(e.lat, e.lon);
						marker = new L.MarkerPOI(pos, {element: e,riseOnHover: true});
						if(e.tags["name"] != undefined)
							marker.bindLabel(e.tags["name"]);
						return marker;
					},
					overpassQueue: this._overpassQueue});
	},

	hideHazardLayer: function(){
		this._hideLayer(this._hazardLayer);
		this._hideLayer(this._hazardfetcher);
	},

	showHazardLayer: function(){
		this._showLayer(this._hazardLayer);
		this._showLayer(this._hazardfetcher);
	},

	_addHazardPart: function(){
		var selector = "(node['hazard:bicycle'](%BBOX%););out;(way['hazard:bicycle'](%BBOX%););out center;";
		this._hazardfetcher = new L.OverpassFetcher({
					minZoom:13,
					selector: selector,
					layer: this._hazardLayer,
					createMarker: 	function(e){
						var pos = new L.LatLng(e.lat, e.lon);
						marker=new L.MarkerPOI(pos, {element: e,riseOnHover: true});
						if(e.tags["description"] != undefined)
							marker.bindLabel(e.tags["description"]);
						return marker;
					},
					overpassQueue: this._overpassQueue});
	},

	hideWayLayer: function(){
		this._hideLayer(this._waysZoomedLayer);
		this._hideLayer(this._wayLayer);
		this._hideLayer(this._wayfetcher);
	},

	showWayLayer: function(){
		if(this.options.map.getZoom() >= this.wayzoomlevel)
			this._showLayer(this._waysZoomedLayer);
		else
			this._showLayer(this._wayLayer);
		this._showLayer(this._wayfetcher);
	},

	_addWayPart: function(){
		var selector =	//one way for cars no for bc
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
				'way["bicycle"="designated"](%BBOX%););out geom;';
		var _this = this;
	 	this._wayfetcher = new L.OverpassFetcher({
			minZoom:13,
			selector: selector,
			createPolyline:function(ll,el){ return _this._createWay(ll,el);},
			layer: this._wayLayer,
			overpassQueue: this._overpassQueue});
	},

	hideTrailLayer: function(){
		this._hideLayer(this._wayLayer);
		this._hideLayer(this._wayfetcher);
	},

	showTrailLayer: function(){
		this._showLayer(this._trailLayer);
		this._showLayer(this._trailfetcher);
	},

	_addTrailPart: function(){
		var selector = 'relation[route=bicycle](%BBOX%);out;'+
					'way(r)(%BBOX%);out ids tags geom;';
		var _this = this;
		this._trailfetcher = new L.OverpassFetcher({
			minZoom:13,
			selector: selector,
			createPolyline: function(nn,el){ return _this._createTrail(nn,el);},
			layer: this._trailLayer,
			overpassQueue: this._overpassQueue});
	},

	_checkTag: function (tags,key,value,type){
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
	},

	_addLanes: function(ll,el){
		if(this._checkTag(el.tags,"bicycle:lanes","designated","~")){
			var lanes = el.tags["bicycle:lanes"].split("|");
			var i = 0;
			for(var lane in lanes){
				var n = L.polyline( ll);
				if(lanes[lane] == 'no')
					n.setStyle({'color': 'black'});
				else if(lanes[lane] == 'yes')
					n.setStyle({'color': 'blue'});
				else if(lanes[lane] == 'designated'){
					n.setStyle({'color': 'red'});
					console.log('red');
				}
				n.setOffset((i-lanes.length/2+1)*5);
				this._waysZoomedLayer.addLayer(n);
				++i;
			}
		}
	},

	_createWay: function(ll,el){
		var feature = L.polyline( ll);
		var color = "blue";

		if(this._checkTag(el.tags,"oneway:bicycle","no",'=') && this._checkTag(el.tags,"oneway","yes",'='))
			color = 'yellow';
		if(this._checkTag(el.tags,"oneway:bicycle","no",'=') && this._checkTag(el.tags,"oneway","-1",'='))
			color = 'yellow';

		if(this._checkTag(el.tags,"cycleway:left","lane",'=')){
			color = 'green';

		}
		if(this._checkTag(el.tags,"cycleway:right","lane",'=')){
			color = 'green';
		}

		if(this._checkTag(el.tags,"cycleway","lane",'='))
			color = 'green';

		if(this._checkTag(el.tags,"cycleway:left","opposite_lane",'=')){
			color = 'orange';
		}

		if(this._checkTag(el.tags,"cycleway:right","opposite_lane",'=')){
			color = 'orange';
		}

		if(this._checkTag(el.tags,"cycleway","opposite_lane",'='))
			color = 'orange';

		if(this._checkTag(el.tags,"highway","cycleway",'='))
			color = 'red';
		if(this._checkTag(el.tags,"bicycle","designated",'='))
			color = 'red';

		if(this._checkTag(el.tags,"foot","designated",'=') && this._checkTag(el.tags,"bicycle","designated",'=') && this._checkTag(el.tags,"segregated","yes",'!='))
			color = 'purple';
		if(this._checkTag(el.tags,"foot","designated",'=') && this._checkTag(el.tags,"highway","cycleway",'=') && this._checkTag(el.tags,"segregated","yes",'!='))
			color = 'purple';

		this._addLanes(ll,el);

		feature.setStyle({'color':color});
		return feature;
	},
	_createTrail: function (ll,el){
		var array = [];
		var rlength = Object.size(el.relations);
		var i = 0;
		for(var rel in el.relations){
			var n = L.polyline( ll);
			var color = el.relations[rel].tags["colour"];
			n.setStyle({'color': color});
		
			n.setOffset((i-rlength+1)*6);
			array.push(n);
			++i;
		}
		return array;
	}

});
