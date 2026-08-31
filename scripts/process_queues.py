#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import os
import sys
from datetime import datetime
from pathlib import Path

# ============================================================
# تنظیمات مسیرها
# ============================================================
SENDER_FILE = 'member/orders/pendingorder-sender.json'
PENDING_FILE = 'member/orders/pendingorder.json'
NOTIFY_FILE = 'notify/notify.json'
NOTIFY_HISTORY_FILE = 'notify/historynotify.json'

def log(msg):
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}")
    sys.stdout.flush()

def load_json(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return None
    except json.JSONDecodeError as e:
        log(f"⚠️ خطا در JSON {path}: {e}")
        return None

def save_json(path, data):
    try:
        # ایجاد پوشه در صورت نیاز
        Path(os.path.dirname(path)).mkdir(parents=True, exist_ok=True)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        log(f"❌ خطا در ذخیره {path}: {e}")
        return False

def transfer_sender_to_pending():
    """انتقال سفارشات از sender به pendingorder.json"""
    log("🔄 شروع انتقال sender → pendingorder...")
    
    sender_orders = load_json(SENDER_FILE)
    if sender_orders is None:
        log("ℹ️ فایل sender وجود ندارد یا خراب است.")
        return False
    
    if not sender_orders:
        log("✅ هیچ سفارشی در sender وجود ندارد.")
        return True
    
    # بارگذاری pendingorder.json
    pending_data = load_json(PENDING_FILE)
    if pending_data is None:
        # اگر فایل وجود نداشت، ساختار خالی ایجاد کن
        pending_data = {"updated": datetime.now().isoformat(), "total_pending": 0, "orders": []}
    elif not isinstance(pending_data, dict):
        pending_data = {"updated": datetime.now().isoformat(), "total_pending": 0, "orders": []}
    
    # استخراج سفارشات از sender
    new_orders = []
    for order in sender_orders:
        # اگر سفارش دارای userId نبود، از اطلاعات موجود استفاده کن
        if 'userId' not in order:
            order['userId'] = 'unknown'
        if 'userName' not in order:
            order['userName'] = 'کاربر'
        new_orders.append(order)
    
    if not new_orders:
        log("ℹ️ هیچ سفارش جدیدی برای انتقال وجود ندارد.")
        return True
    
    # اضافه کردن به pendingorder.json (ساختار گروه‌بندی شده بر اساس userId)
    orders_list = pending_data.get('orders', [])
    
    # برای هر سفارش جدید، آن را به گروه کاربر مناسب اضافه کن
    for order in new_orders:
        user_id = order.get('userId')
        user_name = order.get('userName', 'کاربر')
        
        # پیدا کردن گروه کاربر
        user_group = None
        for group in orders_list:
            if group.get('userId') == user_id:
                user_group = group
                break
        
        if user_group is None:
            # ایجاد گروه جدید
            user_group = {
                'userId': user_id,
                'userName': user_name,
                'orders': []
            }
            orders_list.append(user_group)
        
        # اضافه کردن سفارش (بدون userId و userName تکراری)
        order_copy = {k: v for k, v in order.items() if k not in ['userId', 'userName']}
        user_group['orders'].append(order_copy)
    
    # به‌روزرسانی کل
    pending_data['orders'] = orders_list
    pending_data['total_pending'] = sum(len(g['orders']) for g in orders_list)
    pending_data['updated'] = datetime.now().isoformat()
    
    if save_json(PENDING_FILE, pending_data):
        log(f"✅ {len(new_orders)} سفارش به pendingorder.json اضافه شد.")
        # خالی کردن فایل sender
        if save_json(SENDER_FILE, []):
            log("🗑️ فایل sender خالی شد.")
            return True
        else:
            log("❌ خطا در خالی کردن sender")
            return False
    else:
        log("❌ خطا در ذخیره pendingorder.json")
        return False

def transfer_notify_to_history():
    """انتقال پیام‌های جدید از notify.json به historynotify.json"""
    log("🔄 شروع انتقال notify → historynotify...")
    
    notify_data = load_json(NOTIFY_FILE)
    if notify_data is None:
        log("ℹ️ فایل notify.json وجود ندارد یا خراب است.")
        return False
    
    if not notify_data:
        log("✅ هیچ پیامی در notify.json وجود ندارد.")
        return True
    
    # فیلتر پیام‌های جدید (status == 'new')
    new_messages = [msg for msg in notify_data if msg.get('status') == 'new']
    
    if not new_messages:
        log("ℹ️ هیچ پیام جدیدی برای انتقال وجود ندارد.")
        return True
    
    # بارگذاری تاریخچه
    history = load_json(NOTIFY_HISTORY_FILE) or []
    
    # اضافه کردن پیام‌های جدید به تاریخچه
    for msg in new_messages:
        # اضافه کردن زمان انتقال
        msg['transferred_at'] = datetime.now().isoformat()
        history.append(msg)
    
    if save_json(NOTIFY_HISTORY_FILE, history):
        log(f"✅ {len(new_messages)} پیام به historynotify.json اضافه شد.")
        
        # حذف پیام‌های جدید از فایل اصلی (فقط آنهایی که status='new' هستند)
        remaining = [msg for msg in notify_data if msg.get('status') != 'new']
        if save_json(NOTIFY_FILE, remaining):
            log("🗑️ فایل notify.json به‌روز شد (پیام‌های جدید حذف شدند).")
            return True
        else:
            log("❌ خطا در به‌روزرسانی notify.json")
            return False
    else:
        log("❌ خطا در ذخیره historynotify.json")
        return False

def main():
    log("🚀 شروع پردازش صف‌ها و پاک‌سازی...")
    
    # ۱. انتقال sender → pendingorder
    sender_ok = transfer_sender_to_pending()
    
    # ۲. انتقال notify → historynotify
    notify_ok = transfer_notify_to_history()
    
    if sender_ok and notify_ok:
        log("✅ همه عملیات با موفقیت انجام شد.")
    else:
        log("⚠️ برخی عملیات با خطا مواجه شدند.")

if __name__ == "__main__":
    main()
