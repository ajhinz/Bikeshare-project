function get_stations() {
    // Load the list of stations and then load the map
    var defer = $.Deferred();

    $.get("/stations")
        .success(function(stations) {
                // Add a location property that is a google LatLng object
                $.each(stations, function(index, station) {
                        var lat = station["latitude"];
                        var lng = station["longitude"];
                        station["location"] = new google.maps.LatLng(lat, lng);
                    });
                defer.resolve(stations);
            })
        .error(function(xhr) {
                alert("Error getting station info. Status = " + xhr.status);
                defer.resolve(stations);
            });
    return defer.promise();
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

    return map;
};

function add_stations(map, stations) {
    // Create a single info window for showing station information
    var info_window = new google.maps.InfoWindow({});

    // Add each station marker and click handlers
    $.each(stations, function(index, station) {
        marker = add_station(map, station);
        add_info_window(map, marker, info_window, station);
        });
}

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

function find_button_click_handler(map, stations) {
    // Create the services
    var geocoder = new google.maps.Geocoder();
    var directionsService = new google.maps.DirectionsService();
    
    return function() {

        // values will be an array of deferred objects that will
        // eventually contain geocoded locations
        var geocodes = $("input.find_input").map(function() {
                return geocode(geocoder, $(this).val());
            });

        // This tells what to do when all the geocode locations are in
        $.when.apply(null, geocodes.get()).done(function() {

                // Turn arguments object into an array
                // http://debuggable.com/posts/turning-javascripts-arguments-object-into-an-array:4ac50ef8-3bd0-4a2d-8c2e-535ccbdd56cb
                var locations = Array.prototype.slice.call(arguments);

                // Get the nearest stations for each location
                var nearest_stations = $.map(locations, function(station) {
                        var location = station.geometry.location;
                        return find_nearest_station(location, stations);
                    });
                    
                // walks will be an array of deferred objects that will
                // eventually contain directions results
                var walks = $.map(locations, function(location, index) {
                        
                        // Get the directions from the user's location to the
                        // nearest bike station
                        var location_loc = location.geometry.location;
                        var nearest_loc = nearest_stations[index]["location"];

                        // Returns a list of deferred objects
                        return get_route(directionsService,
                                         [location_loc, nearest_loc],
                                         "WALKING");
                    });

                // get the bicycle route between all the stations along
                // the route
                walks.push(get_route(directionsService,
                                     $.map(nearest_stations,
                                            function(station) {
                                                return station["location"];
                                            }),
                                     "BICYCLING"));

                // Tells what to do when all directions are in
                $.when.apply(null, walks).done(function() {
                        
                        // Turn arguments object into an array
                        var routes = Array.prototype.slice.call(arguments);
                        
                        // Show each walking route and the full bicycle route
                        $.each(routes, function(index, route) {
                                show_route(map, route);
                            });
                    });
            });
    }
}
    
function add_click_handlers(map, stations) {
    // Add all DOM event listeners

    // Handler for the Plus button
    $("div#find_buttons span").hover(function() {
            $(this).addClass("hover_cursor");
        }, function() {
            $(this).removeClass("hover_cursor");
        }).click(function() {
                var input = $("input.find_input").last();
                var new_input = input.clone();
                new_input.val("");
                input.after(new_input);
            });

    // Handler for the Find button
    $("#find_button").click(find_button_click_handler(map, stations));
}


function geocode(geocoder, address) {
    // Convert an address to an object containing latitude/longitude
    var defer = $.Deferred();

    geocoder.geocode({"address" : address},
                     function(results, status) {
                         if (status != google.maps.GeocoderStatus.OK) {
                             alert("Error getting geocoded address. status = " + status);
                             defer.reject();
                         }
                         else {
                             defer.resolve(results[0]);
                         }
                     });
    return defer.promise();
}

function find_nearest_station(point, stations) {
    // Find the nearest station from the list of stations to the given point
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

function get_route(directionsService, points, travel_mode) {
    var defer = $.Deferred();
    var origin = points[0];
    var destination = points[points.length - 1];
    
    var waypoints = $.each(points.slice(1, -1), function(index, point) {
            return {
                location: point,
                stopover: true
            };
        });

    var request = {
        origin: origin,
        destination: destination,
        travelMode: google.maps.DirectionsTravelMode[travel_mode]
    };
    directionsService.route(request, function(result, status) {
            if (status != google.maps.DirectionsStatus.OK) {
                alert("Error getting walking directions. Status = " + status);
                defer.reject();
            }
            else {
                defer.resolve(result);
            }
        });
    return defer.promise();
}

function show_route(map, route) {
    // Do once per page load??
    var directionsDisplay = new google.maps.DirectionsRenderer();
    directionsDisplay.setMap(map);
    directionsDisplay.setDirections(route);
}

$(document).ready(function() {

        // Get the station info, adn then show the map, add the station
        // markers, and add the click handlers
        $.when(get_stations()).then(function(stations) {
                var map = show_map(stations);
                
                add_stations(map, stations);

                add_click_handlers(map, stations);

                $("div#find_buttons span").click();
                $("input.find_input").first().val("white house");
                $("input.find_input").last().val("washington monument");
                });
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

// Convert degrees to radians
function to_rad(n) {
    return n * Math.PI / 180;
}


// Finds distance (in km) between two LatLng objects
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
