#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import time
import sys
import subprocess
from datetime import datetime

def log(msg):
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}")
    sys.stdout.flush()

def main():
    # دریافت تاخیر از آرگومان خط فرمان (پیش‌فرض ۶۰ ثانیه)
    delay = 60
    if len(sys.argv) > 1:
        try:
            delay = int(sys.argv[1])
        except ValueError:
            pass
    
    log(f"⏳ منتظر {delay} ثانیه قبل از اجرای پاک‌سازی...")
    time.sleep(delay)
    
    log("🔄 اجرای اسکریپت پردازش صف‌ها...")
    try:
        # اجرای اسکریپت اصلی
        result = subprocess.run(
            ['python3', 'scripts/process_queues.py'],
            capture_output=True,
            text=True
        )
        log(result.stdout)
        if result.stderr:
            log(f"❌ خطا: {result.stderr}")
        if result.returncode == 0:
            log("✅ پاک‌سازی با موفقیت انجام شد.")
        else:
            log(f"❌ اسکریپت با کد {result.returncode} خاتمه یافت.")
    except Exception as e:
        log(f"❌ خطا در اجرای اسکریپت: {e}")

if __name__ == "__main__":
    main()
