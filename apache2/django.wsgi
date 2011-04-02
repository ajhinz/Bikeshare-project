import os
import sys

PARENT_PATH = os.path.dirname(os.path.dirname(__file__))
sys.path.append(PARENT_PATH)
sys.path.append(os.path.join(PARENT_PATH, "bike_project"))

os.environ["DJANGO_SETTINGS_MODULE"] = "bike_project.settings"

import django.core.handlers.wsgi
application = django.core.handlers.wsgi.WSGIHandler()
