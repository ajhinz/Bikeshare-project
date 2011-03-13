from django.db import models
from django.contrib.auth.models import User

# Create your models here.
class Route(models.Model):
    createuser = models.ForeignKey(User)
    createdate = models.DateField(auto_now_add=True)
    route = models.TextField()
    rating = models.SmallIntegerField()
