from django.shortcuts import render_to_response
from django.http import HttpResponse, HttpResponseServerError, HttpResponseRedirect, HttpResponseNotFound
from django.core import serializers
from django.utils import simplejson
from packages.models import BikeshareStation, Route
from django.contrib.auth import logout
from django.contrib.auth.decorators import login_required
from django.template import RequestContext

# Create your views here.

def index(request):
    context = RequestContext(request, {})
    if request.user.is_authenticated():
        context["routes"] = Route.objects.filter(createuser=request.user)
    else:
        context["routes"] = []
    context["user"] = request.user
    return render_to_response("index.html", context)

def stations(request):
    fields = ("station_id",
              "station_name",
              "latitude",
              "longitude",
              "installed",
              "locked",
              "number_bikes",
              "number_empty_docks")
    stations = BikeshareStation.get_stations()
    json_stations = [station.jsonize() for station in stations]
    return HttpResponse(simplejson.dumps(json_stations),
                        mimetype="application/json")

def route_add(request):
    user = request.user
    if not user.is_authenticated():
        response = HttpResponse("Unauthorized")
        response.status_code = 401
        return response
    else:
        try:
            route_raw_json = simplejson.loads(request.POST["route"])
        except simplejson.JSONDecodeError:
            return HttpResponseServerError("Bad route provided")
        route_json = simplejson.dumps(route_raw_json)
        route = Route(createuser=user, route=route_json)
        route.save()
        return HttpResponseRedirect("/")

def route_get(request, route_id):
    try:
        route = Route.objects.get(pk=route_id)
    except Route.DoesNotExist:
        return HttpResponseNotFound("Route not found")
    json_route = route.jsonize()

    return HttpResponse(simplejson.dumps(json_route),
                        mimetype="application/json")

def account_logout(request):
    logout(request)
    return HttpResponseRedirect("/")

def map(request):
    return render_to_response("map.html")

