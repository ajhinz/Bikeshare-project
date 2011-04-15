from django.db import models
from django.contrib.auth.models import User
from django.db import transaction
import external.stations
import datetime

# Create your models here.
class Route(models.Model):
    createuser = models.ForeignKey(User)
    createdate = models.DateField(auto_now_add=True)
    route = models.TextField()
    rating = models.SmallIntegerField(null=True, blank=True)

    def jsonize(self):
        json_route = {}
        json_route["createuser"] = self.createuser.username
        json_route["createdate"] = self.createdate.isoformat()
        json_route["route"] = self.route
        json_route["rating"] = self.rating
        return json_route

class RouteLocation(models.Model):
    route = models.ForeignKey('Route')
    order = models.IntegerField()
    location = models.TextField()
			
class BikeshareUpdate(models.Model):
    # editable=True makes it show up in the admin interface
    createdate = models.DateTimeField(auto_now_add=True, editable=True)

    def __unicode__(self):
        return unicode(self.createdate.strftime("%Y%m%d %H:%M:%S"))

    def get_max_update(cls):
        if BikeshareUpdate.objects.count() == 0:
            return None
        createdate = BikeshareUpdate.objects.all().aggregate(models.Max("createdate"))["createdate__max"]
        return BikeshareUpdate.objects.get(createdate=createdate)
    get_max_update = classmethod(get_max_update)

class BikeshareStation(models.Model):
    update = models.ForeignKey(BikeshareUpdate)
    station_id = models.IntegerField()
    station_name = models.TextField()
    latitude = models.FloatField()
    longitude = models.FloatField()
    installed = models.BooleanField()
    locked = models.BooleanField()
    number_bikes = models.IntegerField()
    number_empty_docks = models.IntegerField()

    def _save_new_stations(cls, stations, update):
        for station in stations.values():
            new_station = cls(update=update)
            new_station.station_id = station["station_id"]
            new_station.station_name = station["station_name"]
            new_station.latitude = station["latitude"]
            new_station.longitude = station["longitude"]
            new_station.installed = station["installed"]
            new_station.locked = station["locked"]
            new_station.number_bikes = station["number_bikes"]
            new_station.number_empty_docks = station["number_empty_docks"]
            new_station.save()
    _save_new_stations = classmethod(_save_new_stations)

    @transaction.commit_on_success
    def get_stations(cls):
        update = BikeshareUpdate.get_max_update()
        if not update or update.createdate < datetime.datetime.today() - datetime.timedelta(minutes=30):
            update = BikeshareUpdate()
            update.save()
            stations = external.stations.all_locations()
            cls._save_new_stations(stations, update)
        return cls.objects.filter(update=update)
    get_stations = classmethod(get_stations)

    
    def jsonize(self):
        json_station = {}
        json_station["station_id"] = self.station_id
        json_station["station_name"] = self.station_name
        json_station["latitude"] = self.latitude
        json_station["longitude"] = self.longitude
        json_station["installed"] = self.installed
        json_station["locked"] = self.locked
        json_station["number_bikes"] = self.number_bikes
        json_station["number_empty_docks"] = self.number_empty_docks
        return json_station
