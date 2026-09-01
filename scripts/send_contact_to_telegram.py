#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import os
import requests
from datetime import datetime
import sys

# ============================================================
# تنظیمات - از محیط (Environment Variables) می‌خواند
# ============================================================
BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN')
CHAT_ID = os.environ.get('TELEGRAM_CHAT_ID')
MAIN_FILE = 'notify/notify.json'
HISTORY_FILE = 'notify/historynotify.json'

def debug_print(msg):
    """چاپ پیام‌های دیباگ با خط جداکننده"""
    print(f"🔍 {msg}")

def send_telegram_message(message):
    """ارسال پیام به تلگرام با لاگ کامل"""
    if not BOT_TOKEN:
        debug_print("❌ BOT_TOKEN خالی است! متغیر محیطی تنظیم نشده.")
        return False
    
    if not CHAT_ID:
        debug_print("❌ CHAT_ID خالی است! متغیر محیطی تنظیم نشده.")
        return False
    
    # ساخت URL
    url = f'https://api.telegram.org/bot{BOT_TOKEN}/sendMessage'
    debug_print(f"📤 ارسال به: {url[:50]}...")
    debug_print(f"📱 CHAT_ID: {CHAT_ID}")
    
    payload = {
        'chat_id': CHAT_ID,
        'text': message,
        'parse_mode': 'Markdown',
        'disable_web_page_preview': True
    }
    headers = {'Content-Type': 'application/json; charset=utf-8'}
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        debug_print(f"📊 Status Code: {response.status_code}")
        
        # لاگ کامل پاسخ
        try:
            response_json = response.json()
            debug_print(f"📄 Response: {json.dumps(response_json, ensure_ascii=False, indent=2)}")
        except:
            debug_print(f"📄 Response Text: {response.text[:200]}...")
        
        if response.ok:
            debug_print("✅ پیام با موفقیت ارسال شد!")
            return True
        else:
            debug_print(f"❌ خطا در ارسال: {response.status_code} - {response.text}")
            return False
            
    except requests.exceptions.Timeout:
        debug_print("❌ Timeout: سرور پاسخ نداد")
        return False
    except requests.exceptions.ConnectionError:
        debug_print("❌ ConnectionError: اتصال به سرور برقرار نشد")
        return False
    except Exception as e:
        debug_print(f"❌ خطای غیرمنتظره: {type(e).__name__} - {e}")
        return False

def get_new_messages():
    """خواندن پیام‌های جدید از notify.json"""
    debug_print(f"📂 خواندن فایل: {MAIN_FILE}")
    
    try:
        with open(MAIN_FILE, 'r', encoding='utf-8') as f:
            content = f.read()
            debug_print(f"📄 محتوای فایل: {content[:200]}...")
            
            if not content.strip():
                debug_print("⚠️ فایل خالی است!")
                return []
            
            data = json.loads(content)
            debug_print(f"📊 {len(data)} پیام در فایل وجود دارد.")
            
            new_messages = [msg for msg in data if msg.get('status') == 'new']
            debug_print(f"📨 {len(new_messages)} پیام جدید با status='new'")
            
            return new_messages
            
    except FileNotFoundError:
        debug_print(f"❌ فایل {MAIN_FILE} وجود ندارد!")
        return []
    except json.JSONDecodeError as e:
        debug_print(f"❌ خطا در parse JSON: {e}")
        debug_print(f"📄 محتوای مشکل‌دار: {content[:200]}...")
        return []
    except Exception as e:
        debug_print(f"❌ خطا در خواندن فایل: {e}")
        return []

def move_to_history(messages):
    """انتقال پیام‌های ارسال‌شده به تاریخچه"""
    if not messages:
        debug_print("⚠️ هیچ پیامی برای انتقال به تاریخچه وجود ندارد.")
        return False
    
    try:
        # خواندن تاریخچه فعلی
        history = []
        try:
            with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
                history = json.load(f)
                debug_print(f"📂 تاریخچه فعلی: {len(history)} پیام")
        except FileNotFoundError:
            debug_print("📂 فایل تاریخچه وجود ندارد، ایجاد می‌شود...")
        except Exception as e:
            debug_print(f"⚠️ خطا در خواندن تاریخچه: {e}")
        
        # اضافه کردن پیام‌ها با تاریخ ارسال
        for msg in messages:
            msg['sent_date'] = datetime.now().isoformat()
            msg['status'] = 'sent'
        history.extend(messages)
        debug_print(f"📊 تاریخچه جدید: {len(history)} پیام")
        
        # ذخیره تاریخچه
        with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
            json.dump(history, f, ensure_ascii=False, indent=2)
        debug_print(f"✅ تاریخچه ذخیره شد: {HISTORY_FILE}")
        
        # حذف پیام‌های ارسال‌شده از فایل اصلی
        with open(MAIN_FILE, 'r', encoding='utf-8') as f:
            main_data = json.load(f)
        
        sent_ids = [msg.get('id') for msg in messages]
        main_data = [msg for msg in main_data if msg.get('id') not in sent_ids]
        
        with open(MAIN_FILE, 'w', encoding='utf-8') as f:
            json.dump(main_data, f, ensure_ascii=False, indent=2)
        debug_print(f"✅ فایل اصلی به‌روز شد: {MAIN_FILE} ({len(main_data)} پیام باقی ماند)")
        
        return True
        
    except Exception as e:
        debug_print(f"❌ خطا در انتقال به تاریخچه: {e}")
        return False

def format_message(msg):
    """قالب‌بندی پیام برای ارسال به تلگرام"""
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
    debug_print("🚀 شروع اسکریپت ارسال پیام به تلگرام")
    debug_print(f"📂 مسیر فعلی: {os.getcwd()}")
    
    # ===== بررسی متغیرهای محیطی =====
    debug_print("🔑 بررسی متغیرهای محیطی...")
    if BOT_TOKEN:
        debug_print(f"✅ BOT_TOKEN: {BOT_TOKEN[:10]}... (طول: {len(BOT_TOKEN)})")
    else:
        debug_print("❌ BOT_TOKEN تنظیم نشده است!")
        sys.exit(1)
    
    if CHAT_ID:
        debug_print(f"✅ CHAT_ID: {CHAT_ID}")
    else:
        debug_print("❌ CHAT_ID تنظیم نشده است!")
        sys.exit(1)
    
    # ===== خواندن پیام‌های جدید =====
    new_msgs = get_new_messages()
    
    if not new_msgs:
        debug_print("✅ هیچ پیام جدیدی برای ارسال وجود ندارد.")
        return
    
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
    
    # ===== انتقال به تاریخچه =====
    if sent_count > 0:
        debug_print("📂 انتقال پیام‌های ارسال‌شده به تاریخچه...")
        move_to_history(new_msgs)
        debug_print(f"✅ {sent_count} پیام با موفقیت ارسال و به تاریخچه منتقل شد.")
    else:
        debug_print("❌ هیچ پیامی ارسال نشد.")

if __name__ == "__main__":
    main()
