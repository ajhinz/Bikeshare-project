from django.conf.urls.defaults import *

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('',
    (r'^account/login/$', 'django.contrib.auth.views.login',
     {'template_name': 'account/login.html'}),
    (r'^account/logout/$', 'packages.views.account_logout'),

    (r'^stations/$', 'packages.views.stations'),
    (r'^route/add/$', 'packages.views.route_add'),
    (r'^route/(?P<route_id>\d+)/$', 'packages.views.route_get'),
    (r'^$', 'packages.views.index'),

                        
    # Uncomment the admin/doc line below to enable admin documentation:
    # (r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    (r'^admin/', include(admin.site.urls)),
)
