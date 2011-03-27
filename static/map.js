function get_stations() {
    // Load the list of stations and then load the map

    // TODO: convert "latitude" and "longitude" into google's latLng object
    $.ajax({
	    url: "/stations/",
	    success: function(stations) {
		$.each(stations, function(index, station) {
			var lat = station["latitude"];
			var lng = station["longitude"];
			station["location"] = new google.maps.LatLng(lat, lng);
		    });
		show_map(stations)
	    },
	    error: function(xhr) {
		alert("Error getting station info. Status = " + xhr.status);
		show_map([]);
	    }
        });
}

function show_map(stations) {
    // Location of Washington, DC
    var latlng = new google.maps.LatLng(38.8951118, -77.0363658);

    var options = {
	zoom: 13,
	center: latlng,
	mapTypeId: google.maps.MapTypeId.ROADMAP
    };

    // Generate the map into div#map_canvas
    var map = new google.maps.Map($("#map_canvas")[0], options);

    // Add bike trail layer
    var bikeLayer = new google.maps.BicyclingLayer();
    bikeLayer.setMap(map);

    // Create a single info window for showing station information
    var info_window = new google.maps.InfoWindow({});

    // Add each station marker and add click handlers
    $.each(stations, function(index, station) {
	marker = add_station(map, station);
	add_info_window(map, marker, info_window, station);
	});

    add_click_handlers(map, stations);
};

function add_station(map, station) {
    // Don't show stations that aren't installed
    var installed = station["installed"];
    if (!installed) {
	return;
    }

    // Create marker at station's latitude and longitude
    var marker = new google.maps.Marker({
	    position: station["location"],
	    map: map,
	    title: station["station_name"]
	});

    return marker;
}

function add_info_window(map, marker, info_window, station) {
    // Create the stringed content of the infor window
    var content = "<h4>{station_name}</h4><div>available bikes: {number_bikes}</div><div>empty docks: {number_empty_docks}</div>".supplant(station);

    // Add a click handler to the marker to display the content in the
    // info window
    google.maps.event.addListener(marker, "click", function() {
	    info_window.setContent(content);
	    info_window.open(map, marker);
	});
}


function add_click_handlers(map, stations) {
    // Add all DOM event listeners
    $("#find_button").click(function() {
	    $("input.find_input").each(function() {
		    geocode(map, stations, $(this).val());
		})});
}


function geocode(map, stations, address) {
    // Do this once per page load???
    var geocoder = new google.maps.Geocoder();

    geocoder.geocode({"address" : address},
		     function(results, status) {
			 if (status != google.maps.GeocoderStatus.OK) {
			     alert("Error getting geocoded address. status = " + status);
			 }
			 else {
			     var location = results[0].geometry.location;
			     map.setCenter(location);
			     // Need a different image for this marker
			     var marker = new google.maps.Marker({
				     map: map,
				     position: results[0].geometry.location
				 });
			     var nearest_station = find_nearest_station(
								    location,
								    stations);
			     route = get_walking_route(map,
						       location,
						 nearest_station["location"]);
			 }
		     });
}

function find_nearest_station(point, stations) {
    var nearest_station = null;
    var nearest_distance = null;
    $.each(stations, function(index, station) {
	    var d = distance(point, station["location"]);
	    if (nearest_station == null ||
		d < nearest_distance) {
		nearest_station = station;
		nearest_distance = d;
	    }
	});
    return nearest_station;
}

function to_rad(n) {
    return n * Math.PI / 180;
}

function distance(point_a, point_b) {
    var lat_a = point_a.lat();
    var lng_a = point_a.lng();
    var lat_b = point_b.lat();
    var lng_b = point_b.lng();

    // See http://www.movable-type.co.uk/scripts/latlong.html
    var R = 6371; // earth's mean radius in km
    var dLat = to_rad(lat_b - lat_a);
    var dLng = to_rad(lng_b - lng_a);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
	Math.cos(to_rad(lat_a)) * Math.cos(to_rad(lat_b)) *
	Math.sin(dLng / 2) * Math.sin(dLng / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // distance in km
}

function get_walking_route(map, origin, destination) {
    // Do this once per page load??
    var directionsService = new google.maps.DirectionsService();

    var request = {
	origin: origin,
	destination: destination,
	travelMode: google.maps.DirectionsTravelMode.WALKING
    };
    directionsService.route(request, function(result, status) {
	    if (status != google.maps.DirectionsStatus.OK) {
		alert("Error getting walking directions. Status = " + status);
	    }
	    else {
		show_walking_route(map, result);
	    }
	});
}

function show_walking_route(map, route) {
    // Do once per page load??
    var directionsDisplay = new google.maps.DirectionsRenderer();
    directionsDisplay.setMap(map);
    directionsDisplay.setDirections(route);
}

$(document).ready(function() {
	get_stations();
    });




// Utilities

// String interpolation
// http://javascript.crockford.com/remedial.html
// Use:  "test {foo} test".supplant({"foo" : "test"}) => "test test test"
String.prototype.supplant = function (o) {
    return this.replace(/{([^{}]*)}/g,
        function (a, b) {
            var r = o[b];
            return typeof r === 'string' || typeof r === 'number' ? r : a;
        }
    );
};