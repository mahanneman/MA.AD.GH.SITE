#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import os
import requests
from datetime import datetime

# تنظیمات تلگرام
BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN')
CHAT_ID = os.environ.get('TELEGRAM_CHAT_ID')

# مسیر فایل‌ها (نسبت به محل اجرای اسکریپت)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MAIN_FILE = os.path.join(BASE_DIR, '../notify/notify.json')
HISTORY_FILE = os.path.join(BASE_DIR, '../notify/historynotify.json')

def send_telegram_message(message):
    if not BOT_TOKEN or not CHAT_ID:
        print("❌ توکن یا چت آیدی تلگرام تنظیم نشده است.")
        return False
    
    url = f'https://api.telegram.org/bot{BOT_TOKEN}/sendMessage'
    payload = {
        'chat_id': CHAT_ID,
        'text': message,
        'parse_mode': 'Markdown',
        'disable_web_page_preview': True
    }
    try:
        response = requests.post(url, json=payload, timeout=10)
        if response.ok:
            return True
        else:
            print(f"❌ خطا در ارسال: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ خطا: {e}")
        return False

def get_new_messages():
    if not os.path.exists(MAIN_FILE):
        print(f"⚠️ فایل {MAIN_FILE} وجود ندارد.")
        return []
    
    try:
        with open(MAIN_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return [msg for msg in data if msg.get('status') == 'new']
    except Exception as e:
        print(f"❌ خطا در خواندن فایل: {e}")
        return []

def move_to_history(messages):
    if not messages:
        return
    
    try:
        history = []
        if os.path.exists(HISTORY_FILE):
            with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
                history = json.load(f)
        
        for msg in messages:
            msg['sent_date'] = datetime.now().isoformat()
            msg['status'] = 'sent'
        history.extend(messages)
        
        with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
            json.dump(history, f, ensure_ascii=False, indent=2)
        
        with open(MAIN_FILE, 'r', encoding='utf-8') as f:
            main_data = json.load(f)
        
        sent_ids = [msg.get('id') for msg in messages]
        main_data = [msg for msg in main_data if msg.get('id') not in sent_ids]
        
        with open(MAIN_FILE, 'w', encoding='utf-8') as f:
            json.dump(main_data, f, ensure_ascii=False, indent=2)
        
        print(f"✅ {len(messages)} پیام به تاریخچه منتقل شد.")
        return True
    except Exception as e:
        print(f"❌ خطا در انتقال به تاریخچه: {e}")
        return False

def format_message(msg):
    return f"""
📩 **New message from {msg.get('source', 'Contact Form')}**

🆔 **ID:** `{msg.get('id', '---')}`
👤 **Name:** {msg.get('name', '---')}
📧 **Email:** {msg.get('email', '---')}
📱 **Phone:** {msg.get('phone', '---')}
📌 **Subject:** {msg.get('subject', '---')}

📝 **Message:**
{msg.get('message', '---')}

📅 **Date:** {msg.get('datePersian', '---')}

📂 **Source:** {msg.get('source', 'Contact Form')}
    """.strip()

def main():
    print("🔍 در حال بررسی پیام‌های جدید...")
    new_msgs = get_new_messages()
    
    if not new_msgs:
        print("✅ پیام جدیدی برای ارسال وجود ندارد.")
        return
    
    print(f"📨 {len(new_msgs)} پیام جدید پیدا شد.")
    sent_count = 0
    
    for msg in new_msgs:
        message = format_message(msg)
        if send_telegram_message(message):
            sent_count += 1
            print(f"✅ پیام {msg.get('id')} ارسال شد.")
        else:
            print(f"❌ ارسال پیام {msg.get('id')} ناموفق بود.")
    
    if sent_count > 0:
        move_to_history(new_msgs)
        print(f"✅ {sent_count} پیام ارسال و به تاریخچه منتقل شد.")
    else:
        print("❌ هیچ پیامی ارسال نشد.")

if __name__ == "__main__":
    main()
