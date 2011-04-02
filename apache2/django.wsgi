import os
import sys

sys.path.append("/usr/local/django/Bikeshare-project")
sys.path.append("/usr/local/django/Bikeshare-project/bike_project")

os.environ["DJANGO_SETTINGS_MODULE"] = "bike_project.settings"

import django.core.handlers.wsgi
application = django.core.handlers.wsgi.WSGIHandler()

def old_application(environ, start_resonse):
    status = '200 OK'
    output = 'Hello World!?!!!'

    response_headers = [('Content-type', 'text/plain'),
                        ('Content-Length', str(len(output)))]
    start_response(status, response_headers)

    return [output]
