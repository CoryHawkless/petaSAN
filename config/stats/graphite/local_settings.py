#SECRET_KEY = 'UNSAFE_DEFAULT'
ALLOWED_HOSTS = [ 'localhost' ]
#TIME_ZONE = 'America/Los_Angeles'

LOG_RENDERING_PERFORMANCE = True
LOG_CACHE_PERFORMANCE = True
LOG_METRIC_ACCESS = True


GRAPHITE_ROOT = '/usr/share/graphite-web'
CONF_DIR = '/etc/graphite'
STORAGE_DIR = '/opt/petasan/config/shared/graphite/whisper'
CONTENT_DIR = '/usr/share/graphite-web/static'

WHISPER_DIR = '/opt/petasan/config/shared/graphite/whisper'
LOG_DIR = '/var/log/graphite'
INDEX_FILE = '/var/lib/graphite/search_index'  # Search index file



## REMOTE_USER authentication. See: https://docs.djangoproject.com/en/dev/howto/auth-remote-user/
#USE_REMOTE_USER_AUTHENTICATION = True

DATABASES = {
    'default': {
        'NAME': '/var/lib/graphite/graphite.db',
        'ENGINE': 'django.db.backends.sqlite3',
        'USER': '',
        'PASSWORD': '',
        'HOST': '',
        'PORT': ''
    }
}

