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

def debug_print(msg):
    print(f"🔍 {msg}")

def send_telegram_message(text):
    """ارسال پیام به تلگرام با encoding درست"""
    if not BOT_TOKEN or not CHAT_ID:
        debug_print("❌ BOT_TOKEN یا CHAT_ID تنظیم نشده!")
        return False
    
    url = f'https://api.telegram.org/bot{BOT_TOKEN}/sendMessage'
    
    # استفاده از text ساده به جای Markdown برای جلوگیری از مشکل encoding
    payload = {
        'chat_id': CHAT_ID,
        'text': text,
        'parse_mode': 'HTML',  # استفاده از HTML به جای Markdown برای پشتیبانی بهتر از UTF-8
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

def get_new_messages():
    """خواندن پیام‌های جدید از notify.json با encoding درست"""
    try:
        with open(MAIN_FILE, 'r', encoding='utf-8') as f:
            content = f.read().strip()
            if not content:
                return []
            
            data = json.loads(content)
            # فقط پیام‌هایی که status='new' دارند برمی‌گردانیم
            return [msg for msg in data if msg.get('status') == 'new']
    except FileNotFoundError:
        debug_print("⚠️ فایل notify.json وجود ندارد!")
        return []
    except json.JSONDecodeError as e:
        debug_print(f"❌ خطا در parse JSON: {e}")
        return []
    except Exception as e:
        debug_print(f"❌ خطا در خواندن فایل: {e}")
        return []

def clear_notify_file():
    """خالی کردن کامل فایل notify.json"""
    try:
        with open(MAIN_FILE, 'w', encoding='utf-8') as f:
            json.dump([], f, ensure_ascii=False, indent=2)
        debug_print("🗑️ فایل notify.json خالی شد!")
        return True
    except Exception as e:
        debug_print(f"❌ خطا در خالی کردن فایل: {e}")
        return False

def move_to_history(messages):
    """انتقال پیام‌های ارسال‌شده به تاریخچه"""
    if not messages:
        return False
    
    try:
        # خواندن تاریخچه فعلی
        history = []
        try:
            with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
                history = json.load(f)
        except FileNotFoundError:
            debug_print("📂 فایل تاریخچه وجود ندارد، ایجاد می‌شود...")
        except Exception as e:
            debug_print(f"⚠️ خطا در خواندن تاریخچه: {e}")
        
        # اضافه کردن پیام‌ها با تاریخ ارسال
        for msg in messages:
            msg['sent_date'] = datetime.now().isoformat()
            msg['status'] = 'sent'
        history.extend(messages)
        
        # ذخیره تاریخچه
        with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
            json.dump(history, f, ensure_ascii=False, indent=2)
        debug_print(f"✅ تاریخچه ذخیره شد: {len(history)} پیام")
        
        # خالی کردن فایل اصلی
        clear_notify_file()
        
        return True
        
    except Exception as e:
        debug_print(f"❌ خطا در انتقال به تاریخچه: {e}")
        return False

def format_message(msg):
    """قالب‌بندی پیام برای تلگرام با HTML (پشتیبانی بهتر از UTF-8)"""
    name = msg.get('name', '---')
    email = msg.get('email', '---')
    phone = msg.get('phone', '---')
    subject = msg.get('subject', '---')
    message = msg.get('message', '---')
    msg_id = msg.get('id', '---')
    date = msg.get('datePersian', '---')
    source = msg.get('source', 'فرم تماس سایت')
    
    return f"""
<b>📩 پیام جدید از {source}</b>

🆔 <b>شناسه:</b> <code>{msg_id}</code>
👤 <b>نام:</b> {name}
📧 <b>ایمیل:</b> {email}
📱 <b>تلفن:</b> {phone}
📌 <b>موضوع:</b> {subject}

📝 <b>پیام:</b>
{message}

📅 <b>تاریخ:</b> {date}

📂 <b>منبع:</b> {source}
    """.strip()

def main():
    debug_print("🚀 شروع اسکریپت ارسال به تلگرام")
    
    # ===== بررسی متغیرهای محیطی =====
    if not BOT_TOKEN:
        debug_print("❌ TELEGRAM_BOT_TOKEN تنظیم نشده!")
        sys.exit(1)
    
    if not CHAT_ID:
        debug_print("❌ TELEGRAM_CHAT_ID تنظیم نشده!")
        sys.exit(1)
    
    debug_print(f"✅ BOT_TOKEN: {BOT_TOKEN[:10]}... (طول: {len(BOT_TOKEN)})")
    debug_print(f"✅ CHAT_ID: {CHAT_ID}")
    
    # ===== خواندن پیام‌های جدید =====
    new_msgs = get_new_messages()
    
    if not new_msgs:
        debug_print("✅ هیچ پیام جدیدی برای ارسال وجود ندارد.")
        sys.exit(0)
    
    debug_print(f"📨 {len(new_msgs)} پیام جدید پیدا شد.")
    sent_count = 0
    
    # ===== ارسال هر پیام =====
    for idx, msg in enumerate(new_msgs, 1):
        debug_print(f"📤 ارسال پیام {idx}/{len(new_msgs)}...")
        message = format_message(msg)
        if send_telegram_message(message):
            sent_count += 1
            debug_print(f"✅ پیام {msg.get('id')} ارسال شد.")
        else:
            debug_print(f"❌ ارسال پیام {msg.get('id')} ناموفق بود.")
    
    # ===== انتقال به تاریخچه و خالی کردن فایل =====
    if sent_count > 0:
        debug_print("📂 انتقال پیام‌های ارسال‌شده به تاریخچه...")
        if move_to_history(new_msgs):
            debug_print(f"✅ {sent_count} پیام با موفقیت ارسال و به تاریخچه منتقل شد.")
            debug_print(f"🗑️ فایل notify.json خالی شد!")
        else:
            debug_print("❌ خطا در انتقال به تاریخچه!")
    else:
        debug_print("❌ هیچ پیامی ارسال نشد.")

if __name__ == "__main__":
    main()
