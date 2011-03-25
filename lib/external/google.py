import json
import urllib


def get_location(address):
    url_base = "http://maps.googleapis.com/maps/api/geocode/json?"

    url_params = {
        "address" : address,
        "sensor" : "false",
        #"bounds" : "38.784599,-77.230453|39.032519,-76.832199",
        }

    url = url_base + urllib.urlencode(url_params)
    print url
    json_response = urllib.urlopen(url).read()
    print json_response
    response = json.loads(json_response)
    print response
