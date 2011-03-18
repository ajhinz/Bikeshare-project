from xml.dom.minidom import parseString
from xml.sax.saxutils import unescape
import urllib

URL = "http://capitalbikeshare.com/stations/bikeStations.xml"

def get_station_property(node, field):
    return node.getElementsByTagName(field)[0].firstChild.data

def parse_stations(stations):
    result = {}
    for station in stations:
        station_id = get_station_property(station, "id")
        station_name = get_station_property(station, "name")
        latitude = get_station_property(station, "lat")
        longitude = get_station_property(station, "long")
        installed = get_station_property(station, "installed")
        locked = get_station_property(station, "locked")
        number_bikes = get_station_property(station, "nbBikes")
        number_empty_docks = get_station_property(station, "nbEmptyDocks")

        result[int(station_id)] = {
            "station_id" : int(station_id),
            "station_name" : unescape(station_name),
            "latitude" : float(latitude),
            "longitude" : float(longitude),
            "installed" : bool(installed),
            "locked" : bool(locked),
            "number_bikes" : int(number_bikes),
            "number_empty_docks" : int(number_empty_docks),
            }
    return result


def get_xml():
    xml_string = urllib.urlopen(URL).read()
    return parseString(xml_string)

def all_locations():

    xml = get_xml()
    
    stations = xml.getElementsByTagName("station")
    return parse_stations(stations)
