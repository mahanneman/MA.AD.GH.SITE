#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import os
import requests
import sys
from datetime import datetime

BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN')
CHAT_ID = os.environ.get('TELEGRAM_CHAT_ID')
PENDING_FILE = 'member/orders/pendingorder.json'
HISTORY_FILE = 'member/orders/pendingorder-history.json'
MANAGER_LINK = 'https://mahanneman.github.io/MA.AD.GH.SITE/manager.html?token=ADMIN2026'

def log(msg):
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}")
    sys.stdout.flush()

def load_json(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return None

def save_json(path, data):
    try:
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except:
        return False

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
        if resp.status_code == 200:
            log("✅ پیام ارسال شد.")
            return True
        else:
            log(f"❌ خطا: {resp.status_code} - {resp.text[:200]}")
            return False
    except Exception as e:
        log(f"❌ خطا: {e}")
        return False

def format_order_message(order):
    status_map = {
        'pending': '⏳ در انتظار پرداخت',
        'paid': '✅ پرداخت شده',
        'shipped': '📦 ارسال شده',
        'completed': '✔️ تکمیل شده',
        'canceled': '❌ لغو شده'
    }
    status_text = status_map.get(order.get('status'), order.get('status', 'نامشخص'))
    
    items_text = "\n".join([
        f"  • {item.get('productName', 'محصول')} × {item.get('quantity', 1)} = {((item.get('price', 0)) * (item.get('quantity', 1))):,} تومان"
        for item in order.get('items', [])
    ]) or "  • بدون محصول"
    
    return f"""🛒 **سفارش جدید!**

🆔 شناسه: `{order.get('id', '---')}`
👤 کاربر: {order.get('userName', 'ناشناس')} (ID: {order.get('userId', '---')})
📅 تاریخ: {order.get('date', '---')}
📌 وضعیت: {status_text}
💰 مبلغ کل: {order.get('total', 0):,} تومان

📦 **محصولات:**
{items_text}

🚚 روش ارسال: {order.get('shipping', '---')}
🔗 کد پیگیری: `{order.get('tracking', '---')}`
📍 آدرس: {order.get('address', '---')}

🔗 [مشاهده و مدیریت]({MANAGER_LINK})"""

def main():
    log("🚀 شروع پردازش سفارشات جدید...")
    
    # ۱. بارگذاری سفارشات از pendingorder.json
    pending_data = load_json(PENDING_FILE)
    if not pending_data:
        log("ℹ️ فایل pendingorder.json وجود ندارد یا خالی است.")
        return
    
    # استخراج لیست سفارشات با userId و userName
    orders = []
    for user in pending_data.get('orders', []):
        for order in user.get('orders', []):
            order['userId'] = user.get('userId')
            order['userName'] = user.get('userName', 'کاربر')
            orders.append(order)
    
    if not orders:
        log("ℹ️ هیچ سفارشی در pendingorder.json وجود ندارد.")
        return
    
    # ۲. بارگذاری تاریخچه ارسال‌ها
    history = load_json(HISTORY_FILE) or []
    history_ids = {item.get('id') for item in history if item.get('id')}
    
    # ۳. فیلتر سفارشات جدید (ارسال‌نشده)
    new_orders = [o for o in orders if o.get('id') not in history_ids]
    
    if not new_orders:
        log("✅ همه سفارشات قبلاً ارسال شده‌اند.")
        return
    
    log(f"📨 {len(new_orders)} سفارش جدید برای ارسال وجود دارد.")
    
    # ۴. ارسال هر سفارش جدید به‌صورت جداگانه
    sent_count = 0
    for order in new_orders:
        msg = format_order_message(order)
        if send_telegram(msg):
            # اضافه کردن به تاریخچه
            history.append({
                'id': order.get('id'),
                'userId': order.get('userId'),
                'sent_at': datetime.now().isoformat()
            })
            sent_count += 1
            log(f"✅ سفارش {order.get('id')} ارسال شد.")
        else:
            log(f"❌ ارسال سفارش {order.get('id')} ناموفق بود.")
    
    # ۵. ذخیره تاریخچه
    if sent_count > 0:
        save_json(HISTORY_FILE, history)
        log(f"✅ {sent_count} سفارش به تاریخچه اضافه شد.")
    else:
        log("⚠️ هیچ سفارشی ارسال نشد.")

if __name__ == "__main__":
    main()
