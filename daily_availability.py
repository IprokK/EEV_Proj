#!/usr/bin/env python3
# daily_availability.py

import logging
from datetime import date
import httpx
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger
from config import *

# ====== CONFIGURATION ======
API_BASE = "http://127.0.0.1:8000"
TIMEOUT = httpx.Timeout(connect=5.0, read=30.0, write=5.0, pool=5.0)

# ====== LOGGING SETUP ======
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(message)s',
    handlers=[logging.FileHandler("daily_availability.log", encoding="utf-8")]
)
logger = logging.getLogger(__name__)

# ====== JOB FUNCTION ======
def check_availability():
    today = date.today().isoformat()
    url = f"{API_BASE}/availability_group"
    headers = {
        "X-API-KEY": API_KEY,
        "Content-Type": "application/json"  # хотя httpx сам проставит, но можно явно
    }
    payload = {"dates": [today]}

    logger.info(f"Запрос создания доступности групп на {today}")
    try:
        with httpx.Client(timeout=TIMEOUT) as client:
            response = client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            logger.info(f"Успешно создана доступность: {data}")
    except httpx.HTTPStatusError as e:
        allow = e.response.headers.get("Allow")
        logger.error(f"Метод не разрешён (status={e.response.status_code}), Allow={allow}")
    except Exception as e:
        logger.error(f"Ошибка при запросе доступности: {e}")


# ====== SCHEDULER SETUP ======
if __name__ == "__main__":
    scheduler = BlockingScheduler(timezone="Asia/Yerevan")
    # Запускаем задачу каждый день в 00:01
    scheduler.add_job(
        check_availability,
        trigger=CronTrigger(hour=0, minute=1),
        name="daily_availability_check"
    )
    logger.info("Scheduler запущен. Ожидание выполнения задачи в 00:01...")
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("Scheduler остановлен пользователем")
