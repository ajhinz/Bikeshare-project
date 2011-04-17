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
    var content = "<h4>{station_name}</h4><div>Available bikes: <b>{number_bikes}</b></div><div>Empty docks: <b>{number_empty_docks}</b></div>".supplant(station);

    // Add a click handler to the marker to display the content in the
    // info window
    google.maps.event.addListener(marker, "click", function() {
            info_window.setContent(content);
            info_window.open(map, marker);
        });
}

function find_button_click_handler(map, directionsRenderer, stations) {
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
   			
                // create array of the steps in the trip
                var locationArray = new Array();
                for (var i = 0; i < locations.length; i++) {
                    locationArray[i] = locations[i].address_components[0].long_name;
                }

                if (locations.length == 1) {
                    var start_location = locations[0].geometry.location;
                    var nearest_station = find_nearest_station(start_location,
                                                               stations,
                                                               true, false);
                    $.when(get_route(directionsService,
                                     [start_location, nearest_station.location],
                                     "WALKING"))
                        .done(function(route) {
                                show_route(map, directionsRenderer, route);
                            });
                }
                else {
                    var start_location = locations[0].geometry.location;
                    var end_location = locations[locations.length - 1].geometry.location;
                    
                    var start_station = find_nearest_station(start_location,
                                                             stations, 
                                                             true, false);
                    var end_station = find_nearest_station(end_location,
                                                           stations,
                                                           false, true);
                    
                    
                    // add stations to list of points
                    var points = $.map(locations, function(location) {
                            return location.geometry.location;
                        });
                    var points = [].concat([start_station.location],
                                           points.slice(1, -1),
                                           [end_station.location]);
                    
                    var try_split = $("#split_30:checked").val() !== undefined;
                    
                    // Get start walking directions, bicycling directions,
                    // and the final walking directions
                    $.when(get_route(directionsService,
                                     [start_location, start_station.location],
                                     "WALKING"),
                           get_route(directionsService,
                                     points,
                                     "BICYCLING"),
                           get_route(directionsService,
                                     [end_station.location, end_location],
                                     "WALKING")
                           ).done(handle_route_results(directionsService,
                                                       directionsRenderer,
                                                       map, stations, 
                                                       locationArray,
                                                       try_split));
                }
            });
    }
}


    
function handle_route_results(directionsService, directionsRenderer,
                              map,
                              stations, locationArray, try_split){
    return function(start_walk, bike, end_walk) {
        
        if (try_split) {
            var duration = route_duration(bike);
            if (duration > 1800) {
                var points = split_bike_route(bike, duration, stations);
                
                $.when(start_walk,
                       get_route(directionsService, points, "BICYCLING"),
                       end_walk)
                    .done(handle_route_results(directionsService, 
                                               directionsRenderer,
                                               map, stations,
                                               locationArray, false));
            }
        }
        else {
            // Join the three directions results into
            // a single route
            var route = join_routes(start_walk, bike, end_walk);
            
            // Show the route on the map
            show_route(map, directionsRenderer, route);
            
            // Show the rating system and directions header
            $("#rating").show();
            $("#directions").show();

            // Add a save link under the Find button
            add_save_button(route, locationArray);
        }
    }
}
function add_click_handlers(map, directionsRenderer, stations) {
    // Add all DOM event listeners

    // Handler for the Plus button
    $("div#add_destination").hover(function() {
            $(this).addClass("hover_cursor");
        }, function() {
            $(this).removeClass("hover_cursor");
        }).click(function() {
                var input = $("input.find_input").last();
                var new_input = input.clone();
                new_input.val("");
                input.after(new_input);
                new_input.focus();
            });

    // Handler for the Find button
    $("#find_button").click(find_button_click_handler(map, directionsRenderer, 
                                                      stations));
                                                      
    // Handler for the Find Location Button
    $("#locate_button").hover(function() {
            $(this).addClass("hover_cursor");
        }, function() {
            $(this).removeClass("hover_cursor");
        }).click(function() {
                find_location();
            });
}

function find_location() {
    navigator.geolocation.getCurrentPosition(showmap, location_error);
}

// handle location errors
// from http://mobile.tutsplus.com/tutorials/mobile-web-apps/html5-geolocation/
function location_error(error) {
    switch(error.code)  
    {  
        case error.PERMISSION_DENIED: alert("user did not share geolocation data");  
        break;  

        case error.POSITION_UNAVAILABLE: alert("could not detect current position");  
        break;  

        case error.TIMEOUT: alert("retrieving position timed out");  
        break;  

        default: alert("unknown error");  
        break;  
    }
}

function showmap(position) {
    var latitude = position.coords.latitude;
    var longitude = position.coords.longitude;
    
    geocoder = new google.maps.Geocoder();
    var latlng = new google.maps.LatLng(latitude,longitude);
    
    geocoder.geocode({'latLng': latlng}, function(results,status){
        
        if (status == google.maps.GeocoderStatus.OK) {
            if (results[1]) {
                var current_address = results[1].formatted_address;
                $("input.find_input").first().val(current_address);
            }
        }
        
        else {
            alert ("Geocoder failed due to:" + status);
        }
    })
}

function add_save_button(route, locationArray) {
    // Show the save button.  Remove any existing event handlers
    // and add a new event handler with the current route and locationArray
    $("#save_route").show().hover(function() {
            $(this).addClass("hover_cursor");
        }, function() {
            $(this).removeClass("hover_cursor");
        }).unbind("click").click(function() {
                save_route(route, locationArray);
            });
}

function geocode(geocoder, address) {
    // Convert an address to an object containing latitude/longitude
    var defer = $.Deferred();

    var sw = new google.maps.LatLng(38.82065567674717, -77.1682017375);
    var ne = new google.maps.LatLng(38.98096687330668, -76.90727644453125);
    var bounds = new google.maps.LatLngBounds(sw, ne);

    geocoder.geocode({address : address,
                     bounds: bounds},
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

function find_nearest_station(point, stations, origin, destination) {
    // Find the nearest station from the list of stations to the given point
    var nearest_station = null;
    var nearest_distance = null;
    $.each(stations, function() {
            
            // Skip stations that aren't open yet (e.g. Metro Center)
            if (this.number_bikes == 0 && this.number_empty_docks == 0) {
                return true;
            }

            // Skip stations where bikes or empty docks are not available
            if ((origin && this.number_bikes == 0) ||
                (destination && this.number_empty_docks == 0)) {
                return true;
            }
            var d = distance(point, this["location"]);
            if (nearest_station == null ||
                d < nearest_distance) {
                nearest_station = this;
                nearest_distance = d;
            }
        });
    return nearest_station;
}

function get_route(directionsService, points, travel_mode) {
    var defer = $.Deferred();
    var origin = points[0];
    var destination = points[points.length - 1];
    
    var waypoints = $.map(points.slice(1, -1), function(point) {
            return {
                location: point,
                stopover: true
            };
        });

    var request = {
        origin: origin,
        destination: destination,
        waypoints: waypoints,
        travelMode: google.maps.DirectionsTravelMode[travel_mode]
    };
    directionsService.route(request, function(result, status) {
            if (status != google.maps.DirectionsStatus.OK) {
                alert("Error getting directions. Status = " + status);
                defer.reject();
            }
            else {
                defer.resolve(result);
            }
        });
    return defer.promise();
}

function route_duration(route) {
    var duration = 0;
    $.each(route.routes[0].legs, function() {
            duration += this.duration.value;
        });
    return duration
}

function split_bike_route(route, duration, stations) {
    var number_stops = Math.floor(duration / 1500);
    var leg_duration = duration / (number_stops + 1);
    var points = [];
    var running_duration = 0;
    $.each(route.routes[0].legs, function(index) {
            if (index == 0) {
                points.push(this.start_location);
            }
            $.each(this.steps, function() {
                    running_duration += this.duration.value;
                    if (running_duration > leg_duration) {
                        points.push(find_nearest_station(this.end_location,
                                                         stations,
                                                         false, true).location);
                        running_duration = 0;
                                                            
                    }
                });
            points.push(this.end_location);
        });
    return points;
}

function show_route(map, directionsRenderer, route) {
    directionsRenderer.setMap(map);
    directionsRenderer.setDirections(route);

    // Show directions
    $("#directions").empty();
    $("#directions").show();
    $.each(route.routes[0].legs, function(i) {
            $('<div class="travel_mode"><img class="dir_marker" src="http://www.google.com/mapfiles/marker_green{letter}.png" /><a href="javascript:;">{travel_mode}</a> - {distance} - {duration}</div>'.supplant(
              {letter: String.fromCharCode('A'.charCodeAt() + i),
               travel_mode: this.steps[0].travel_mode, 
               distance: this.distance.text, 
               duration: this.duration.text}))
                .appendTo("#directions")
                .click(function() { $(this).next().toggle(); });
            var ol = $("<ol></ol>").appendTo("#directions");
            $.each(this.steps, function() {
                    $('<li class="step">' + this.instructions + '</li>')
                        .appendTo(ol);
                });
        });
}

function join_routes(start_walk, bike, end_walk) {
    var legs = [];

    var thirty_minute_limit = 0;

    var start_walk_route = start_walk.routes[0];
    var bike_route = bike.routes[0];
    var end_walk_route = end_walk.routes[0];

    var route = {
        routes: [{
                bounds: bike_route.bounds,
                copyrights: bike_route.copyrights,
                legs: [].concat(start_walk_route.legs,
                                bike_route.legs,
                                end_walk_route.legs),
                overview_path: [].concat(start_walk_route.overview_path,
                                         bike_route.overview_path,
                                         end_walk_route.overview_path),
                warnings: [].concat(start_walk_route.warnings,
                                    bike_route.warnings,
                                    end_walk_route.warnings)
            }]
    };

    return route;
}

function reverse_leg(leg) {
    var new_leg = {
        // copy
        distance: leg.distance,
        duration: leg.duration,

        // swap
        end_address: leg.start_address,
        start_address: leg.end_address,
        
        // swap
        end_location: leg.start_location,
        start_location: leg.end_location,
        
        // reverse
        steps: reverse_steps(leg.steps)
    };

    return new_leg;
}

function reverse_steps(steps) {
    new_steps = steps.slice(0);
    new_steps.reverse();
    return $.map(new_steps, function(step) {
            new_step = {
                // copy
                distance: step.distance,
                duration: step.duration,
                instructions: step.instructions,
                travel_mode: step.travel_mode,
                
                // swap
                start_location: step.end_location,
                end_location: step.start_location,
                
                // Copy and reverse
                path: step.path.slice(0)
            };
            new_step.path.reverse();
            return new_step;
        });
    return new_steps;
}

// Send an AJAX POST request to save the route
// Needs to handle errors better:
//   500 = Server error
//   403 = Authentication error.  Ask for login credentials
function save_route(route, _locationArray) {
    var encoded_route = encode_route(route);
    
    // gets the currently selected rating
    var new_rating = $('input:radio[name=ratings]:checked').val();
    new_rating = parseInt(new_rating);
    new_rating = JSON.stringify(new_rating);
    $.post("/route/add/", {
            route: encode_route(route),
			locationArray: encode_locations(_locationArray),
			rating: new_rating
                })
        .success(function() {alert("Saved!")})
        .error(function(jqXHR, textStatus, errorThrown) {
                alert("Error! " + textStatus + ", " + errorThrown)});
}

// Take a directions result and convert into a JSON string
// Handles google.maps.LatLng and google.maps.LatLngBounds
function encode_route(route) {
    return JSON.stringify(route, function(key, value) {
            if (value instanceof google.maps.LatLngBounds) {
                return {"LatLngBounds":
                        {"sw": value.getSouthWest(),
                                "ne": value.getNorthEast()}};
                }
            else if (value instanceof google.maps.LatLng) {
                return {"LatLng" : 
                        {"lat": value.lat(),
                                "lng": value.lng()}};
            }
            else return value;
        });
}

// Converts the array of travel locations to a JSON string
function encode_locations(locationArray) {
	var stringy = JSON.stringify(locationArray);
	return stringy;
}

// Takes a JSON string and converts into a directions result
// Handles google.maps.LatLng and google.maps.LatLngBounds
function decode_route(route) {
    return JSON.parse(route, function(key, value) {
            if (value["LatLngBounds"]) {
                return new google.maps.LatLngBounds(value["LatLngBounds"]["sw"],
                                                    value["LatLngBounds"]["ne"]);
            }
            else if (value["LatLng"]) {
                var lat = value["LatLng"]["lat"];
                var lng = value["LatLng"]["lng"];
                //return new google.maps.LatLng(value["lat"], value["lng"]);
                return new google.maps.LatLng(lat, lng);
            }
            else return value;
        });
}

$(document).ready(function() {

        // Get the station info, adn then show the map, add the station
        // markers, and add the click handlers
        $.when(get_stations()).then(function(stations) {
                var map = show_map(stations);

                var directionsRenderer = new google.maps.DirectionsRenderer();
                
                add_stations(map, stations);

                add_click_handlers(map, directionsRenderer, stations);

                // Global variable
                // Load a saved route
                if (saved_route) {
                    show_route(map, directionsRenderer,
                               decode_route(saved_route["route"]));
                }
                
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


// Allow CSRF token to be sent with AJAX POST requests
// http://docs.djangoproject.com/en/1.2/ref/contrib/csrf/
$('html').ajaxSend(function(event, xhr, settings) {
        function getCookie(name) {
            var cookieValue = null;
            if (document.cookie && document.cookie != '') {
                var cookies = document.cookie.split(';');
                for (var i = 0; i < cookies.length; i++) {
                    var cookie = jQuery.trim(cookies[i]);
                    // Does this cookie string begin with the name we want?
                    if (cookie.substring(0, name.length + 1) == (name + '=')) {
                        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                        break;
                    }
                }
            }
            return cookieValue;
        }
        if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
            // Only send the token to relative URLs i.e. locally.
            xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
        }
    });