from django.conf.urls.defaults import *

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()
import settings

urlpatterns = patterns(
    '',
    (r'^account/login/$', 'django.contrib.auth.views.login',
     {'template_name': 'account/login.html'}),
    (r'^account/logout/$', 'packages.views.account_logout'),
    (r'^account/create/$', 'packages.views.account_create'),

    (r'^stations/$', 'packages.views.stations'),
    (r'^route/add/$', 'packages.views.route_add'),
    (r'^route/(?P<route_id>\d+)/$', 'packages.views.route_get'),

    (r'^map/$', 'packages.views.map'),

    (r'^$', 'packages.views.index'),

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
