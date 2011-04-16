from django.shortcuts import render_to_response
from django.http import HttpResponse, HttpResponseServerError, HttpResponseRedirect, HttpResponseNotFound
from django.core import serializers
from django.core.paginator import Paginator, InvalidPage, EmptyPage
from django.utils import simplejson
from packages.models import BikeshareStation, Route, RouteLocation
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User
from django.template import RequestContext


# Create your views here.

def index(request):
    context = RequestContext(request, {})
    context["user"] = request.user
    if request.user.is_authenticated():
        context["routes"] = Route.objects.filter(createuser=request.user)
        context["routelocations"] = RouteLocation.objects.all()
    else:
        context["routes"] = []
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
            locationArray_raw = simplejson.loads(request.POST["locationArray"])
        except simplejson.JSONDecodeError:
            return HttpResponseServerError("Bad route provided")
        route_json = simplejson.dumps(route_raw_json)
        route = Route(createuser=user, route=route_json)
        route.save()
		
        # saves the locations traversed in the route
        for i, location in enumerate(locationArray_raw):
            print i,location
            route_location = RouteLocation(route=route,order=i,location=location)
            route_location.save()

        return HttpResponse("Success")

def route_get(request, route_id):
    try:
        route = Route.objects.get(pk=route_id)
        locations = route.routelocation_set.all()
    except Route.DoesNotExist:
        return HttpResponseNotFound("Route not found")
    json_route = route.jsonize()
    json_locations = [loc.location for loc in locations]

    context = RequestContext(request, {})
    context["saved_route"] = simplejson.dumps(json_route)
    context["saved_locations"] = json_locations

    return render_to_response("map.html", context)

@login_required
def route_remove(request, route_id):
    user = request.user    
    try:
        route = Route.objects.get(pk=route_id, createuser=user)
    except Route.DoesNotExist:
        return HttpResponseNotFound("Route not found")
    route.delete()

    return HttpResponseRedirect(request.META["HTTP_REFERER"])

def account_logout(request):
    logout(request)
    return HttpResponseRedirect("/")

class MyUserCreationForm(UserCreationForm):
    def __init__(self, *args, **kwargs):
        super(MyUserCreationForm, self).__init__(*args, **kwargs)
        self.fields["first_name"].required = True
        self.fields["last_name"].required = True
        self.fields["email"].required = True
    class Meta:
        model = User
        fields = ("first_name", "last_name", "email")

def account_create(request):
    if request.method == "POST":
        form = MyUserCreationForm(request.POST)
        if form.is_valid():
            first_name = form.cleaned_data["first_name"]
            last_name = form.cleaned_data["last_name"]
            email = form.cleaned_data["email"]
            username = form.cleaned_data["username"]
            password = form.cleaned_data["password1"]

            user = User.objects.create_user(username, email, password)
            user.first_name = first_name
            user.last_name = last_name
            user.save()
            
            user = authenticate(username=username, password=password)
            login(request, user)

            return HttpResponseRedirect(request.POST.get("next", "/"))
    else:
        form = MyUserCreationForm()
    context = RequestContext(request, {})
    context["form"] = form
    context["next"] = request.GET.get("next", "")
    return render_to_response("account_create.html", context)

def map(request):
    user = request.user    
    context = RequestContext(request, {})
    context["user"] = request.user
    return render_to_response("map.html", context)

@login_required
def account_profile(request):
    context = RequestContext(request, {})
    user = request.user
    context["user"] = user

    routes = Route.objects.filter(createuser=user).order_by("-id")[:10]
    context["routes"] = routes

    return render_to_response("account/profile.html", context)

@login_required
def account_routes(request, page=1):
    context = RequestContext(request, {})
    user = request.user
    context["user"] = user

    route_list = Route.objects.filter(createuser=user).order_by("-id")
    paginator = Paginator(route_list, 5)

    try:
        routes = paginator.page(page)
    except (EmptyPage, InvalidPage):
        routes = paginator.page(paginator.num_pages)
    
    context["routes"] = routes

    return render_to_response("account/routes.html", context)
