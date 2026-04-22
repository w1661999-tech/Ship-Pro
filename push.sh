#!/bin/bash
# 📤 Push script for Ship Pro GitHub

# تعيين البيانات الشخصية
git config user.name "w1661999-tech"
git config user.email "w1661999@gmail.com"

# تعيين الـ remote
git remote add origin https://github.com/w1661999-tech/Ship-ProFile.git 2>/dev/null || true

# عرض حالة الـ repository
echo "📊 حالة المستودع:"
git log --oneline -5

echo ""
echo "🔄 محاولة الـ push..."

# محاولة الـ push
git push -u origin master

echo ""
echo "✅ تم الـ push بنجاح!"
echo "✨ تحقق من: https://github.com/w1661999-tech/Ship-ProFile"
