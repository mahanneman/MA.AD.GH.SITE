#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import os
import requests
import sys
from datetime import datetime

# ============================================================
# تنظیمات
# ============================================================
BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN')
CHAT_ID = os.environ.get('TELEGRAM_CHAT_ID')
QUEUE_FILE = 'member/orders/orders-queue.json'
MANAGER_LINK = 'https://mahanneman.github.io/MA.AD.GH.SITE/manager.html?token=ADMIN2026'

# ============================================================
# توابع
# ============================================================
def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")
    sys.stdout.flush()

def load_queue():
    try:
        with open(QUEUE_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        log("⚠️ فایل وجود ندارد، ایجاد می‌شود...")
        data = {"pending": [], "sent": []}
        save_queue(data)
        return data
    except json.JSONDecodeError:
        log("❌ فایل خراب است، بازنشانی می‌شود...")
        data = {"pending": [], "sent": []}
        save_queue(data)
        return data

def save_queue(data):
    with open(QUEUE_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def send_telegram(text):
    if not BOT_TOKEN or not CHAT_ID:
        log("❌ توکن یا چت آیدی تنظیم نشده!")
        return False
    url = f'https://api.telegram.org/bot{BOT_TOKEN}/sendMessage'
    payload = {
        'chat_id': CHAT_ID,
        'text': text,
        'parse_mode': 'Markdown',
        'disable_web_page_preview': True
    }
    try:
        resp = requests.post(url, json=payload, timeout=10)
        log(f"📡 وضعیت: {resp.status_code}")
        if resp.status_code == 200:
            return True
        else:
            log(f"❌ خطا: {resp.text[:200]}")
            return False
    except Exception as e:
        log(f"❌ خطا: {e}")
        return False

def make_message(orders):
    if not orders:
        return None
    total = len(orders)
    total_amount = sum(o.get('total', 0) for o in orders)
    
    # کاربران
    users = {}
    for o in orders:
        uid = o.get('userId', 'unknown')
        if uid not in users:
            users[uid] = {'name': o.get('userName', 'ناشناس'), 'count': 0}
        users[uid]['count'] += 1
    user_text = "\n".join([f"• {d['name']} (ID: {uid}): {d['count']} سفارش" for uid, d in users.items()])
    
    # محصولات
    products = {}
    for o in orders:
        for item in o.get('items', []):
            name = item.get('productName', 'محصول')
            qty = item.get('quantity', 1)
            products[name] = products.get(name, 0) + qty
    sorted_products = sorted(products.items(), key=lambda x: x[1], reverse=True)[:5]
    product_text = "\n".join([f"• {name} × {qty}" for name, qty in sorted_products])
    if len(products) > 5:
        product_text += f"\n• ... و {len(products)-5} محصول دیگر"
    
    return f"""📦 **{total} سفارش جدید!**

💰 مبلغ کل: {total_amount:,} تومان

👤 کاربران:
{user_text}

📦 محصولات:
{product_text}

🔗 [مشاهده در پنل]({MANAGER_LINK})"""

def main():
    log("🚀 شروع پردازش...")
    
    # ۱. بارگذاری صف
    queue = load_queue()
    pending = queue.get('pending', [])
    
    if not pending:
        log("✅ هیچ سفارشی در صف نیست.")
        return
    
    log(f"📦 {len(pending)} سفارش در صف.")
    
    # ۲. ارسال پیام
    msg = make_message(pending)
    if msg and send_telegram(msg):
        log("✅ پیام ارسال شد.")
        # انتقال به sent
        queue['sent'].extend(pending)
        queue['pending'] = []
        save_queue(queue)
        log(f"🗑️ {len(pending)} سفارش به sent منتقل شد.")
    else:
        log("❌ ارسال ناموفق، سفارش‌ها در صف می‌مانند.")

if __name__ == "__main__":
    main()
