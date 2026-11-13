"""Собирает index.html из исходников в src/. Запуск: python3 build.py
Тексты в исходниках русские; при сборке каждая русская строка оборачивается в T(...),
а переводы берутся из src/i18n/<язык>.json (ключ — русская строка)."""
import os,re,json,sys
R=os.path.dirname(os.path.abspath(__file__));S=os.path.join(R,'src')
rd=lambda n:open(os.path.join(S,n),encoding='utf-8').read()
CYR=re.compile('[А-Яа-яЁё]')
LANGS=[['ru','Русский'],['en','English'],['es','Español'],['pt','Português'],['fr','Français'],['de','Deutsch'],['it','Italiano'],['nl','Nederlands'],['pl','Polski'],['uk','Українська'],['tr','Türkçe'],['ar','العربية'],['ur','اردو'],['hi','हिन्दी'],['bn','বাংলা'],['id','Bahasa Indonesia'],['vi','Tiếng Việt'],['th','ไทย'],['zh','中文'],['ja','日本語'],['ko','한국어']]
def js_literals(src):
    i=0;n=len(src);out=[]
    while i<n:
        c=src[i]
        if c=='/' and src[i+1:i+2]=='/':
            j=src.find('\n',i);i=n if j<0 else j;continue
        if c=='/' and src[i+1:i+2]=='*':
            j=src.find('*/',i+2);i=n if j<0 else j+2;continue
        if c in '\'"`':
            j=i+1
            while j<n and src[j]!=c:
                if src[j]=='\\':j+=1
                j+=1
            out.append((i,j+1,c,src[i+1:j]));i=j+1;continue
        if c=='/' and re.search(r'[=(,:;!&|?{}\[\n]\s*$',src[max(0,i-20):i]):
            j=i+1;cls=False
            while j<n and (src[j]!='/' or cls):
                if src[j]=='\\':j+=1
                elif src[j]=='[':cls=True
                elif src[j]==']':cls=False
                elif src[j]=='\n':break
                j+=1
            i=j+1;continue
        i+=1
    return out
def collect():
    js=rd('game.js').replace('/*EXTRAS*/',rd('extras.js')).replace('/*CUTOUT*/',rd('cutout.js')).replace('/*MANIFEST*/',rd('manifest.json'))
    tpl=rd('template.html');keys=set();out=[];last=0
    for a,b,q,body in js_literals(js):
        if q!='`' and CYR.search(body):
            keys.add(body.strip());out.append(js[last:a]+'T('+js[a:b]+')');last=b
    out.append(js[last:]);js=''.join(out)
    body=tpl[tpl.index('<body'):tpl.index('<script>')]
    for x in re.findall(r'>([^<>]+)<',body):
        if CYR.search(x):keys.add(x.strip())
    for x in re.findall(r'(?:title|aria-label|placeholder)="([^"]+)"',body):
        if CYR.search(x):keys.add(x.strip())
    keys.add(re.search(r'<title>(.*?)</title>',tpl).group(1))
    return js,tpl,sorted(keys)
if __name__=='__main__':
    js,tpl,keys=collect()
    if '--keys' in sys.argv:
        json.dump(keys,open(os.path.join(S,'i18n','keys.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=0);print(len(keys),'строк');sys.exit()
    t={};langs=[]
    for code,name in LANGS:
        if code=='ru':langs.append([code,name]);continue
        p=os.path.join(S,'i18n',code+'.json')
        if not os.path.exists(p):continue
        d=json.load(open(p,encoding='utf-8'));t[code]=[d.get(k,'') for k in keys];langs.append([code,name])
        miss=sum(1 for v in t[code] if not v)
        if miss and code=='en':print('en: нет перевода для',miss,'строк:',[k for k in keys if not d.get(k)][:8])
    data=json.dumps({'langs':langs,'keys':keys,'t':t},ensure_ascii=False,separators=(',',':'))
    js=js.replace('/*I18N*/',data,1)
    open(os.path.join(R,'index.html'),'w',encoding='utf-8').write(tpl.replace('/*JS*/',js))
    print('index.html собран:',len(js)//1024,'КБ скрипта, языков:',len(langs))
