#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import os
import sys
from datetime import datetime

PAYMENT_FILE = 'payment/payments.json'
PROCESSED_CACHE = 'payment/processed-payments.json'

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

def get_user_orders(user_id):
    path = f'member/member{user_id}/orders.json'
    data = load_json(path)
    return data if data else []

def save_user_orders(user_id, orders):
    path = f'member/member{user_id}/orders.json'
    return save_json(path, orders)

def update_order_status(user_id, order_id, new_status):
    orders = get_user_orders(user_id)
    updated = False
    for order in orders:
        if order.get('id') == order_id:
            order['status'] = new_status
            updated = True
            break
    if updated:
        save_user_orders(user_id, orders)
        log(f"✅ وضعیت سفارش {order_id} کاربر {user_id} به {new_status} تغییر کرد.")
        return True
    else:
        log(f"⚠️ سفارش {order_id} برای کاربر {user_id} یافت نشد.")
        return False

def main():
    log("🚀 شروع پردازش پرداخت‌ها...")
    
    payments = load_json(PAYMENT_FILE)
    if not payments:
        log("ℹ️ هیچ پرداختی یافت نشد.")
        return
    
    processed = load_json(PROCESSED_CACHE) or []
    processed_ids = {p.get('id') for p in processed}
    
    new_payments = [p for p in payments if p.get('id') not in processed_ids]
    if not new_payments:
        log("ℹ️ هیچ پرداخت جدیدی یافت نشد.")
        return
    
    for payment in new_payments:
        user_id = payment.get('userId')
        order_id = payment.get('orderId')
        if not user_id or not order_id:
            log(f"⚠️ پرداخت {payment.get('id')} فاقد userId یا orderId است.")
            continue
        
        # بروزرسانی وضعیت سفارش به paid
        if update_order_status(user_id, order_id, 'paid'):
            processed.append(payment)
            log(f"✅ پرداخت {payment.get('id')} پردازش شد.")
        else:
            log(f"❌ پرداخت {payment.get('id')} ناموفق بود.")
    
    save_json(PROCESSED_CACHE, processed)
    log("✅ پردازش پرداخت‌ها کامل شد.")

if __name__ == "__main__":
    main()
