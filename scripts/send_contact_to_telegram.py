#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import os
import requests
from datetime import datetime

BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN')
CHAT_ID = os.environ.get('TELEGRAM_CHAT_ID')
MAIN_FILE = 'notify/notify.json'
HISTORY_FILE = 'notify/historynotify.json'

def send_telegram_message(message):
    url = f'https://api.telegram.org/bot{BOT_TOKEN}/sendMessage'
    payload = {
        'chat_id': CHAT_ID,
        'text': message,
        'parse_mode': 'Markdown',
        'disable_web_page_preview': True
    }
    headers = {'Content-Type': 'application/json; charset=utf-8'}
    try:
        response = requests.post(url, json=payload, headers=headers)
        return response.ok
    except Exception as e:
        print(f"Error sending message: {e}")
        return False

def get_new_messages():
    try:
        with open(MAIN_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return [msg for msg in data if msg.get('status') == 'new']
    except Exception as e:
        print(f"Error reading file: {e}")
        return []

def move_to_history(messages):
    if not messages:
        return
    
    try:
        # خواندن تاریخچه فعلی
        history = []
        try:
            with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
                history = json.load(f)
        except:
            history = []
        
        # اضافه کردن پیام‌ها با تاریخ ارسال
        for msg in messages:
            msg['sent_date'] = datetime.now().isoformat()
            msg['status'] = 'sent'
        history.extend(messages)
        
        # ذخیره تاریخچه
        with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
            json.dump(history, f, ensure_ascii=False, indent=2)
        
        # حذف پیام‌های ارسال‌شده از فایل اصلی
        with open(MAIN_FILE, 'r', encoding='utf-8') as f:
            main_data = json.load(f)
        
        sent_ids = [msg.get('id') for msg in messages]
        main_data = [msg for msg in main_data if msg.get('id') not in sent_ids]
        
        with open(MAIN_FILE, 'w', encoding='utf-8') as f:
            json.dump(main_data, f, ensure_ascii=False, indent=2)
        
        print(f"✅ {len(messages)} message(s) moved to history.")
        return True
    except Exception as e:
        print(f"Error moving to history: {e}")
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
    print("🔍 Checking for new messages...")
    new_msgs = get_new_messages()
    
    if not new_msgs:
        print("✅ No new messages to send.")
        return
    
    print(f"📨 {len(new_msgs)} new message(s) found.")
    sent_count = 0
    
    for msg in new_msgs:
        message = format_message(msg)
        if send_telegram_message(message):
            sent_count += 1
            print(f"✅ Message {msg.get('id')} sent.")
        else:
            print(f"❌ Failed to send {msg.get('id')}")
    
    if sent_count > 0:
        # انتقال فوری به تاریخچه
        move_to_history(new_msgs)
        print(f"✅ {sent_count} message(s) sent and moved to history.")
    else:
        print("❌ No messages were sent.")

if __name__ == "__main__":
    main()

