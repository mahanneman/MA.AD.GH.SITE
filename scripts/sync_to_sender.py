#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import os
import sys
from datetime import datetime

# ============================================================
# تنظیمات
# ============================================================
MEMBER_DIR = 'member'
SENDER_FILE = 'member/orders/pendingorder-sender.json'
IDS_FILE = '_data/ids.json'
PENDING_FILE = 'member/orders/pendingorder.json'

# ============================================================
# توابع
# ============================================================
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

def get_member_ids():
    """دریافت لیست شناسه‌های کاربران از پوشه member"""
    if not os.path.exists(MEMBER_DIR):
        return []
    ids = []
    for item in os.listdir(MEMBER_DIR):
        if item.startswith('member') and len(item) == 10:
            try:
                user_id = item.replace('member', '')
                if user_id.isdigit():
                    ids.append(user_id)
            except:
                continue
    return sorted(ids, key=lambda x: int(x))

def get_user_info(user_id):
    path = f"{MEMBER_DIR}/member{user_id}/info.json"
    data = load_json(path)
    if data:
        return data
    return None

def get_user_orders(user_id):
    path = f"{MEMBER_DIR}/member{user_id}/orders.json"
    data = load_json(path)
    if data and isinstance(data, list):
        return data
    return []

def sync_users_to_ids():
    """همگام‌سازی کاربران به _data/ids.json"""
    log("🔄 همگام‌سازی کاربران به _data/ids.json...")
    
    user_ids = get_member_ids()
    if not user_ids:
        log("⚠️ هیچ کاربری یافت نشد.")
        return
    
    existing = load_json(IDS_FILE) or []
    existing_map = {str(u.get('id', '')): u for u in existing if u.get('id')}
    
    for user_id in user_ids:
        info = get_user_info(user_id)
        if info:
            info['id'] = str(user_id)
            existing_map[user_id] = info
    
    new_list = list(existing_map.values())
    if save_json(IDS_FILE, new_list):
        log(f"✅ {len(new_list)} کاربر در ids.json ذخیره شدند.")

def sync_to_sender():
    """همگام‌سازی سفارشات pending/paid به pendingorder-sender.json"""
    log("🔄 همگام‌سازی سفارشات به pendingorder-sender.json...")
    
    user_ids = get_member_ids()
    if not user_ids:
        log("⚠️ هیچ کاربری یافت نشد.")
        return
    
    # بارگذاری sender.json فعلی
    sender_orders = load_json(SENDER_FILE) or []
    existing_ids = {o.get('id') for o in sender_orders if o.get('id')}
    
    # بارگذاری تاریخچه ارسال
    history = load_json('member/orders/pendingorder-history.json') or []
    history_ids = {h.get('id') for h in history if h.get('id')}
    
    # جمع‌آوری سفارشات جدید
    new_orders = []
    added_count = 0
    
    for user_id in user_ids:
        orders = get_user_orders(user_id)
        user_info = get_user_info(user_id)
        user_name = user_info.get('name', 'کاربر') if user_info else 'کاربر'
        
        # فیلتر سفارشات pending/paid که قبلاً به sender اضافه نشده‌اند
        for order in orders:
            order_id = order.get('id')
            if order_id and order_id not in existing_ids and order.get('status') in ['pending', 'paid']:
                order['userId'] = user_id
                order['userName'] = user_name
                new_orders.append(order)
                existing_ids.add(order_id)
                added_count += 1
    
    # افزودن به sender
    if new_orders:
        sender_orders.extend(new_orders)
        if save_json(SENDER_FILE, sender_orders):
            log(f"✅ {added_count} سفارش جدید به pendingorder-sender.json اضافه شد.")
        else:
            log("❌ خطا در ذخیره sender.json")
    else:
        log("ℹ️ هیچ سفارش جدیدی برای اضافه کردن وجود ندارد.")
    
    return added_count

def sync_pending_orders():
    """به‌روزرسانی pendingorder.json برای نمایش در پنل"""
    log("🔄 به‌روزرسانی pendingorder.json...")
    
    user_ids = get_member_ids()
    if not user_ids:
        return
    
    all_pending = []
    for user_id in user_ids:
        orders = get_user_orders(user_id)
        user_info = get_user_info(user_id)
        user_name = user_info.get('name', 'کاربر') if user_info else 'کاربر'
        
        pending = [o for o in orders if o.get('status') in ['pending', 'paid']]
        if pending:
            all_pending.append({
                'userId': user_id,
                'userName': user_name,
                'orders': pending
            })
    
    data = {
        'updated': datetime.now().isoformat(),
        'total_pending': sum(len(u['orders']) for u in all_pending),
        'orders': all_pending
    }
    if save_json(PENDING_FILE, data):
        log(f"✅ pendingorder.json به‌روز شد ({data['total_pending']} سفارش).")

def main():
    log("🚀 شروع همگام‌سازی یکپارچه...")
    
    # ۱. همگام‌سازی کاربران به ids.jsonس
    sync_users_to_ids()
    
    # ۲. همگام‌سازی سفارشات جدید به sender
    added = sync_to_sender()
    
    # ۳. به‌روزرسانی pendingorder.json
    sync_pending_orders()
    
    if added is not None and added > 0:
        log(f"🎯 {added} سفارش جدید به صف ارسال اضافه شد.")
    else:
        log("✅ همگام‌سازی کامل شد. هیچ سفارش جدیدی یافت نشد.")

if __name__ == "__main__":
    main()
