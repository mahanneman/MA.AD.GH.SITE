#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import os
import requests
from datetime import datetime
import sys

# ============================================================
# تنظیمات
# ============================================================
BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN')
CHAT_ID = os.environ.get('TELEGRAM_CHAT_ID')
MAIN_FILE = 'notify/notify.json'
HISTORY_FILE = 'notify/historynotify.json'
LAST_STATE_FILE = 'notify/last_state.json'

def debug_print(msg):
    print(f"🔍 {msg}")

def send_telegram_message(text):
    """ارسال پیام به تلگرام"""
    if not BOT_TOKEN or not CHAT_ID:
        debug_print("❌ BOT_TOKEN یا CHAT_ID تنظیم نشده!")
        return False
    
    url = f'https://api.telegram.org/bot{BOT_TOKEN}/sendMessage'
    payload = {
        'chat_id': CHAT_ID,
        'text': text,
        'parse_mode': 'Markdown',
        'disable_web_page_preview': True
    }
    
    try:
        response = requests.post(url, json=payload, timeout=30)
        if response.ok:
            debug_print("✅ پیام ارسال شد")
            return True
        else:
            debug_print(f"❌ خطا: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        debug_print(f"❌ خطا: {e}")
        return False

def get_last_state():
    """خواندن وضعیت قبلی فایل"""
    try:
        with open(LAST_STATE_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return {'was_empty': True, 'last_count': 0}

def save_last_state(was_empty, count):
    """ذخیره وضعیت فعلی"""
    try:
        with open(LAST_STATE_FILE, 'w', encoding='utf-8') as f:
            json.dump({'was_empty': was_empty, 'last_count': count}, f)
    except:
        pass

def get_new_messages():
    """خواندن پیام‌های جدید از notify.json"""
    try:
        with open(MAIN_FILE, 'r', encoding='utf-8') as f:
            content = f.read().strip()
            if not content:
                return [], True
            
            data = json.loads(content)
            new_msgs = [msg for msg in data if msg.get('status') == 'new']
            return new_msgs, False
    except FileNotFoundError:
        return [], True
    except json.JSONDecodeError:
        return [], True
    except Exception as e:
        debug_print(f"❌ خطا در خواندن: {e}")
        return [], True

def move_to_history(messages):
    """انتقال پیام‌های ارسال‌شده به تاریخچه"""
    if not messages:
        return
    
    try:
        history = []
        try:
            with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
                history = json.load(f)
        except:
            pass
        
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
        
        debug_print(f"✅ {len(messages)} پیام به تاریخچه منتقل شد")
        return True
    except Exception as e:
        debug_print(f"❌ خطا در انتقال به تاریخچه: {e}")
        return False

def format_message(msg):
    """قالب‌بندی پیام برای تلگرام"""
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
    debug_print("🚀 شروع اسکریپت ارسال به تلگرام")
    
    # ===== دریافت وضعیت قبلی =====
    last_state = get_last_state()
    debug_print(f"📊 وضعیت قبلی: empty={last_state.get('was_empty')}, count={last_state.get('last_count')}")
    
    # ===== خواندن پیام‌های جدید =====
    new_msgs, is_empty = get_new_messages()
    debug_print(f"📊 وضعیت فعلی: empty={is_empty}, new_msgs={len(new_msgs)}")
    
    # ============================================================
    # ۱. اگر فایل خالی شده (پاک شده)
    # ============================================================
    if is_empty and not last_state.get('was_empty'):
        debug_print("🗑️ فایل notify.json خالی شده! ارسال پیام پاک شدن...")
        send_telegram_message("🗑️ **فایل notify.json پاک شد!**\n\nهمه پیام‌های جدید حذف شده‌اند.")
        save_last_state(True, 0)
        sys.exit(0)
    
    # ============================================================
    # ۲. اگر پیام جدید وجود دارد
    # ============================================================
    if new_msgs:
        debug_print(f"📨 {len(new_msgs)} پیام جدید پیدا شد.")
        sent_count = 0
        
        for msg in new_msgs:
            message = format_message(msg)
            if send_telegram_message(message):
                sent_count += 1
                debug_print(f"✅ پیام {msg.get('id')} ارسال شد.")
            else:
                debug_print(f"❌ ارسال پیام {msg.get('id')} ناموفق بود.")
        
        if sent_count > 0:
            move_to_history(new_msgs)
            debug_print(f"✅ {sent_count} پیام ارسال و به تاریخچه منتقل شد.")
            save_last_state(False, len(new_msgs))
        else:
            debug_print("❌ هیچ پیامی ارسال نشد.")
    
    # ============================================================
    # ۳. اگر فایل خالی است و قبلاً هم خالی بوده
    # ============================================================
    elif is_empty and last_state.get('was_empty'):
        debug_print("ℹ️ فایل خالی است و قبلاً هم خالی بوده. هیچ اقدامی لازم نیست.")
    
    # ============================================================
    # ۴. اگر فایل خالی نیست ولی پیام جدیدی وجود ندارد
    # ============================================================
    else:
        debug_print("ℹ️ هیچ پیام جدیدی با status='new' وجود ندارد.")
        # به‌روزرسانی وضعیت
        try:
            with open(MAIN_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                save_last_state(False, len(data))
        except:
            pass

if __name__ == "__main__":
    main()
