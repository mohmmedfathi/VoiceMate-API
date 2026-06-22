from celery import Celery

import config

celery_app = Celery("voicemate", broker=config.REDIS_URL, backend=config.REDIS_URL, include=["tasks"])
celery_app.conf.task_always_eager = config.CELERY_ALWAYS_EAGER
