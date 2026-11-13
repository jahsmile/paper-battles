import cv2,numpy as np,sys,json,os
U='/mnt/user-data/uploads/';OUT='/home/claude/pb-work/'
# crop in displayed px (ref size), flip to face right, tol, opts
C={
 'blade':  dict(f='23158c9f',ref=(1512,2016),crop=(40,840,1480,1718),flip=1,tol=34),
 'witch':  dict(f='70ccdacc',ref=(1512,2016),crop=(380,460,1252,1775),flip=0,tol=30,keepfrac=.06),
 'fort':   dict(f='c8c6b6c8',ref=(2212,1659),crop=(105,110,2020,1452),flip=0,tol=34,max=540,fill=[[(532,196),(716,196),(716,356),(532,356)]],src=1),
 'dino':   dict(f='5bcd58ba',ref=(1512,2016),crop=(80,872,1280,1700),flip=0,tol=40,excl=[[(80,872),(592,872),(592,893),(80,893)]],openpx=3,keepfrac=.05),
 'saw':    dict(f='baf967f4',ref=(1512,2016),crop=(200,422,1290,1815),flip=0,tol=34),
 'black':  dict(f='2503499e',ref=(1512,2016),crop=(420,1050,1240,1640),flip=1,tol=40,excl=[[(420,1050),(492,1050),(492,1310),(420,1310)]]),
 'teeth':  dict(f='8ac533b6',ref=(1512,2016),crop=(30,1090,1240,1690),flip=0,tol=58,dil=9),
 'rider':  dict(f='df2277d6',ref=(1512,2016),crop=(340,1030,1290,1740),flip=1,tol=34),
 'golem':  dict(f='b97064e0',ref=(1512,2016),crop=(465,575,1110,1885),flip=0,tol=38),
 'purple': dict(f='187e5cab',ref=(1512,2016),crop=(320,590,1325,1768),flip=0,tol=30),
 'king':   dict(f='4edb1e03',ref=(1512,2016),crop=(335,945,1255,1565),flip=1,tol=60,nogreen=1,excl=[[(335,945),(465,945),(465,1215),(400,1262),(335,1262)]]),
}
def fit_bg(img):
    h,w=img.shape[:2];ys,xs=np.mgrid[0:h:4,0:w:4];s=img[::4,::4].astype(np.float32)
    x=xs.ravel()/w;y=ys.ravel()/h;A=np.stack([np.ones_like(x),x,y,x*x,y*y,x*y],1)
    hsv=cv2.cvtColor(img[::4,::4],cv2.COLOR_BGR2HSV).reshape(-1,3);v=s.reshape(-1,3)
    ok=(hsv[:,1]<45)&(hsv[:,2]>np.percentile(hsv[:,2],45))
    X=np.mgrid[0:h,0:w];fx=(X[1]/w).ravel();fy=(X[0]/h).ravel();AF=np.stack([np.ones_like(fx),fx,fy,fx*fx,fy*fy,fx*fy],1)
    out=np.zeros((h*w,3),np.float32)
    for c in range(3):
        m=ok.copy()
        for it in range(3):
            co,_,_,_=np.linalg.lstsq(A[m],v[m,c],rcond=None);res=v[:,c]-A@co;m=ok&(res>-12)&(res<25)
        out[:,c]=AF@co
    return out.reshape(h,w,3)
def run(name,p=None):
    p=p or C[name];im=cv2.imread(U+p['f']+'-image.jpg');H,W=im.shape[:2];sx=W/p['ref'][0];sy=H/p['ref'][1]
    x0,y0,x1,y1=p['crop'];x0=int(x0*sx);x1=int(x1*sx);y0=int(y0*sy);y1=int(y1*sy)
    pad=40;im=im[max(0,y0-pad):y1+pad,max(0,x0-pad):x1+pad].copy()
    ox=x0-max(0,x0-pad);oy=y0-max(0,y0-pad)
    bg=fit_bg(im);n=np.clip(im.astype(np.float32)/np.maximum(bg,40)*255,0,255)
    d=255-n.min(2);hsv=cv2.cvtColor(n.astype(np.uint8),cv2.COLOR_BGR2HSV)
    ink=(d>p['tol'])
    if p.get('nogreen'):
        g=(hsv[:,:,0]>32)&(hsv[:,:,0]<95)&(hsv[:,:,2]>120);ink&=~g
    h,w=ink.shape;m=np.zeros((h,w),np.uint8);m[oy:oy+(y1-y0),ox:ox+(x1-x0)]=1;ink&=m.astype(bool)
    for poly in p.get('excl',[]):
        pts=np.array([[(a*sx-x0+ox),(b*sy-y0+oy)] for a,b in poly],np.int32);e=np.zeros((h,w),np.uint8);cv2.fillPoly(e,[pts],1);ink&=~e.astype(bool)
    ink=ink.astype(np.uint8)
    if p.get('openpx'):ink=cv2.morphologyEx(ink,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(p['openpx'],)*2))
    # specks
    nl,lab,st,_=cv2.connectedComponentsWithStats(ink,8);keep=np.zeros_like(ink)
    for i in range(1,nl):
        if st[i,4]>=p.get('minarea',60):keep[lab==i]=1
    ink=keep
    dk=p.get('dil',7);k=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(dk*2+1,)*2)
    dil=cv2.dilate(ink,k);inv=(1-dil).astype(np.uint8)
    ff=np.zeros((h+2,w+2),np.uint8);inv2=inv.copy()
    for sxp in range(0,w,5):
        for syp in (0,h-1):
            if inv2[syp,sxp]==1:cv2.floodFill(inv2,ff,(sxp,syp),2)
    for syp in range(0,h,5):
        for sxp in (0,w-1):
            if inv2[syp,sxp]==1:cv2.floodFill(inv2,ff,(sxp,syp),2)
    fg=(inv2!=2).astype(np.uint8)
    for poly in p.get('fill',[]):
        pts=np.array([[(a*sx-x0+ox),(b*sy-y0+oy)] for a,b in poly],np.int32);cv2.fillPoly(fg,[pts],1)
    mg=p.get('margin',4);er=dk-mg
    if er>0:fg=cv2.erode(fg,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(er*2+1,)*2))
    nl,lab,st,_=cv2.connectedComponentsWithStats(fg,8)
    if nl>1:
        big=1+np.argmax(st[1:,4]);thr=st[big,4]*p.get('keepfrac',.02);fg=np.isin(lab,[i for i in range(1,nl) if st[i,4]>=thr]).astype(np.uint8)
    a=cv2.GaussianBlur(fg.astype(np.float32)*255,(0,0),1.1);a=np.clip((a-90)*255/75,0,255)
    col=n.copy();col=np.clip((col-128)*1.12+128+6,0,255)
    # paper-ish pixels inside -> clean white
    pap=(d<p['tol']*.55);col[pap]=col[pap]*.3+255*.7
    rgba=np.dstack([col,a]).astype(np.uint8)
    if p.get('src'):
        w3=(col*(a[:,:,None]/255.)+255*(1-a[:,:,None]/255.)).astype(np.uint8);ys,xs=np.where(fg>0);cv2.imwrite(OUT+name+'_src.png',cv2.copyMakeBorder(w3[ys.min():ys.max()+1,xs.min():xs.max()+1],60,60,60,60,cv2.BORDER_CONSTANT,value=(255,255,255)))
    ys,xs=np.where(fg>0);rgba=rgba[ys.min():ys.max()+1,xs.min():xs.max()+1]
    if p.get('flip'):rgba=rgba[:,::-1]
    M=p.get('max',420);s=min(1,M/max(rgba.shape[:2]));rgba=cv2.resize(rgba,None,fx=s,fy=s,interpolation=cv2.INTER_AREA)
    cv2.imwrite(OUT+name+'.png',rgba);return rgba
def sheet(names,fn,grid=True,cols=3,cell=(520,440)):
    rows=(len(names)+cols-1)//cols;S=np.full((rows*cell[1],cols*cell[0],3),(116,166,200),np.uint8)
    for i,nm in enumerate(names):
        r=cv2.imread(OUT+nm+'.png',cv2.IMREAD_UNCHANGED);h,w=r.shape[:2];s=min((cell[0]-40)/w,(cell[1]-50)/h);r=cv2.resize(r,None,fx=s,fy=s);h,w=r.shape[:2]
        X=(i%cols)*cell[0]+20;Y=(i//cols)*cell[1]+34;a=r[:,:,3:4]/255.;S[Y:Y+h,X:X+w]=(r[:,:,:3]*a+S[Y:Y+h,X:X+w]*(1-a)).astype(np.uint8)
        if grid:
            for t in range(11):
                c=(0,0,255) if t%5==0 else (60,60,60)
                cv2.line(S,(X+int(w*t/10),Y),(X+int(w*t/10),Y+h),c,1);cv2.line(S,(X,Y+int(h*t/10)),(X+w,Y+int(h*t/10)),c,1)
        cv2.putText(S,nm+' %dx%d'%(cv2.imread(OUT+nm+'.png').shape[1],cv2.imread(OUT+nm+'.png').shape[0]),(X,Y-10),cv2.FONT_HERSHEY_SIMPLEX,.6,(0,0,0),2)
    cv2.imwrite(OUT+fn,S)
if __name__=='__main__':
    names=sys.argv[1:] or list(C)
    for nm in names:run(nm);print(nm,'ok')
    L=list(C);sheet(L[:6],'sheetA.jpg');sheet(L[6:],'sheetB.jpg')
