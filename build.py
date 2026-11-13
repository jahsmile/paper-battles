"""Собирает index.html из исходников в src/. Запуск: python3 build.py"""
import os
R=os.path.dirname(os.path.abspath(__file__));S=os.path.join(R,'src')
rd=lambda n:open(os.path.join(S,n),encoding='utf-8').read()
js=rd('game.js').replace('/*EXTRAS*/',rd('extras.js')).replace('/*CUTOUT*/',rd('cutout.js')).replace('/*MANIFEST*/',rd('manifest.json'))
open(os.path.join(R,'index.html'),'w',encoding='utf-8').write(rd('template.html').replace('/*JS*/',js))
print('index.html собран:',len(js)//1024,'КБ скрипта')
