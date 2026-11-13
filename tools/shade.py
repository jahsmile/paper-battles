import cv2,numpy as np
W='/home/claude/pb-work/'
im=cv2.imread(W+'fort_src.png').astype(np.float32);h,w=im.shape[:2]
d=255-im.min(2);ink=(d>34).astype(np.uint8)
dil=cv2.dilate(ink,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(15,15)));inv=(1-dil).astype(np.uint8);ff=np.zeros((h+2,w+2),np.uint8);cv2.floodFill(inv,ff,(2,2),2)
fg=cv2.erode((inv!=2).astype(np.uint8),np.ones((9,9),np.uint8))
paper=((d<26)&(fg>0)).astype(np.uint8);paper=cv2.erode(paper,np.ones((5,5),np.uint8))
n,lab,st,cen=cv2.connectedComponentsWithStats(paper,4)
rs=np.random.RandomState(7)
# pencil hatch texture
hat=np.zeros((h,w),np.float32)
for i in range(-h,w,7):
    j=rs.randint(-2,3);a=rs.uniform(.35,1);cv2.line(hat,(i+j,0),(i+j+h,h),float(a),rs.randint(2,5),cv2.LINE_AA)
hat=cv2.GaussianBlur(hat,(0,0),1.1)*(.75+.25*cv2.GaussianBlur(rs.rand(h,w).astype(np.float32),(0,0),6)*2)
hat=np.clip(hat+rs.rand(h,w).astype(np.float32)*.25-.1,0,1)
pal=[(168,160,154),(150,144,140),(182,176,170),(160,152,150),(140,150,160)]  # BGR greys
out=im.copy();k=0
for i in range(1,n):
    a=st[i,4]
    if a<2500 or a>h*w*.09:continue
    k+=1
    if k%4==0:continue
    m=(lab==i).astype(np.uint8);m=cv2.dilate(m,np.ones((5,5),np.uint8))
    al=(cv2.GaussianBlur(m.astype(np.float32),(0,0),1.5)*hat*.62)[:,:,None]
    out=out*(1-al)+np.array(pal[k%len(pal)],np.float32)*al
cv2.imwrite(W+'fort_shaded.png',out.astype(np.uint8));cv2.imwrite(W+'fort_shaded_view.jpg',cv2.resize(out.astype(np.uint8),None,fx=.5,fy=.5));print(k)
