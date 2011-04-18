import os
from django.conf.urls.defaults import *

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()
import settings

urlpatterns = patterns(
    '',
    (r'^account/login/$', 'django.contrib.auth.views.login',
     {'template_name': os.path.join('account', 'login.html')}),
    (r'^account/logout/$', 'packages.views.account_logout'),
    (r'^account/create/$', 'packages.views.account_create'),
    (r'^account/profile/$', 'packages.views.account_profile'),
    (r'^account/routes/$', 'packages.views.account_routes'),
    (r'^account/routes/(?P<page>\d+)/$', 'packages.views.account_routes'),

    (r'^route/add/$', 'packages.views.route_add'),
    (r'^route/remove/(?P<route_id>\d+)/$', 'packages.views.route_remove'),
    (r'^route/(?P<route_id>\d+)/$', 'packages.views.route_get'),

    (r'^stations/$', 'packages.views.stations'),

    (r'^bike_tours/$', 'packages.views.bike_tours'),

    (r'^map/$', 'packages.views.map'),
	
	# for testing the saved route locations
	(r'^account/$', 'packages.views.index'),

    (r'^$', 'packages.views.map'),

    # Use this only for development!!
    # http://docs.djangoproject.com/en/1.2/howto/static-files/
    (r'^static/(?P<path>.*)$', 'django.views.static.serve',
     {'document_root': settings.STATIC_DOC_ROOT}),
                        
    # Uncomment the admin/doc line below to enable admin documentation:
    # (r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    (r'^admin/', include(admin.site.urls)),
    
    url(r'', include('social_auth.urls')),
)
