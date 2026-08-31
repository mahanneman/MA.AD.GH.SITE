#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
fix_json.py - ابزار تعمیر و اعتبارسنجی فایل‌های JSON
ویژگی‌ها:
- حذف BOM و کاراکترهای کنترلی غیرمجاز (بدون حذف کاراکترهای فارسی)
- اعتبارسنجی JSON با حفظ داده‌ها
- تعمیر خطاهای رایج (کاماهای اضافی، کوتیشن‌های غیراستاندارد)
- پشتیبانی از UTF-8
"""

import json
import re
import sys
import os
from pathlib import Path

def clean_control_chars(content):
    """
    حذف کاراکترهای کنترلی غیرمجاز (به جز \n, \r, \t)
    کاراکترهای فارسی و UTF-8 را حفظ می‌کند
    """
    # حذف BOM
    content = content.lstrip('\ufeff')
    
    # حذف کاراکترهای کنترلی غیرمجاز (0x00-0x1F به جز 0x09, 0x0A, 0x0D)
    # از regex استفاده می‌کنیم تا کاراکترهای UTF-8 چندبایتی را حفظ کند
    content = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', content)
    
    return content

def fix_common_json_errors(content):
    """
    تعمیر خطاهای رایج JSON بدون تغییر داده‌ها
    """
    # حذف کاماهای اضافی قبل از } یا ]
    content = re.sub(r',(\s*[}\]])', r'\1', content)
    
    # اضافه کردن کوتیشن به کلیدهای بدون کوتیشن (فقط کلیدهای ساده)
    content = re.sub(r'(\w+):', r'"\1":', content)
    
    # حذف کاماهای انتهای خطوط
    content = re.sub(r',\s*$', '', content, flags=re.MULTILINE)
    
    # جایگزینی کوتیشن‌های غیراستاندارد
    content = content.replace('”', '"').replace('“', '"')
    content = content.replace('’', "'").replace('‘', "'")
    
    return content

def fix_json_file(filepath):
    """
    تعمیر و اعتبارسنجی یک فایل JSON
    """
    try:
        # خواندن فایل با UTF-8
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # پاکسازی کاراکترهای کنترلی
        content = clean_control_chars(content)
        
        # تلاش برای بارگذاری JSON
        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            # اگر خطا داشت، سعی در تعمیر
            print(f"  🔧 Trying to repair {filepath}...")
            content = fix_common_json_errors(content)
            try:
                data = json.loads(content)
            except json.JSONDecodeError as e:
                print(f"  ❌ Cannot repair {filepath}: {e}")
                return False
        
        # ذخیره با فرمت استاندارد (UTF-8 بدون BOM)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f"  ✅ {filepath} fixed and validated")
        return True
        
    except Exception as e:
        print(f"  ❌ Error processing {filepath}: {e}")
        return False

def main():
    if len(sys.argv) < 2:
        print("Usage: python fix_json.py <filename>")
        sys.exit(1)
    
    filepath = sys.argv[1]
    if not os.path.isfile(filepath):
        print(f"❌ File not found: {filepath}")
        sys.exit(1)
    
    success = fix_json_file(filepath)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
