from django.http import HttpResponse
from django.core import serializers
from packages.models import BikeshareStation

# Create your views here.

def index(request):
    return HttpResponse("Hi there")

def stations(request):
    fields = ("station_id",
              "station_name",
              "latitude",
              "longitude",
              "installed",
              "locked",
              "number_bikes",
              "number_empty_docks")

    json_serializer = serializers.get_serializer("json")()
    json_serializer.serialize(BikeshareStation.get_stations(), fields=fields)
    return HttpResponse(json_serializer.getvalue())
