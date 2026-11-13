function mk(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
function prepSource(im){
  const M=800,k=Math.min(1,M/Math.max(im.width,im.height)),w=Math.max(1,Math.round(im.width*k)),h=Math.max(1,Math.round(im.height*k));
  const c=mk(w,h);c.getContext('2d',{willReadFrequently:true}).drawImage(im,0,0,w,h);return c;
}
function solve(A,b){
  const n=b.length;
  for(let i=0;i<n;i++){
    let m=i;for(let r=i+1;r<n;r++)if(Math.abs(A[r][i])>Math.abs(A[m][i]))m=r;
    [A[i],A[m]]=[A[m],A[i]];[b[i],b[m]]=[b[m],b[i]];const d=A[i][i]||1e-9;
    for(let r=i+1;r<n;r++){const f=A[r][i]/d;for(let c=i;c<n;c++)A[r][c]-=f*A[i][c];b[r]-=f*b[i]}
  }
  const x=new Array(n);for(let i=n-1;i>=0;i--){let s=b[i];for(let c=i+1;c<n;c++)s-=A[i][c]*x[c];x[i]=s/(A[i][i]||1e-9)}
  return x;
}
// 1. выравниваем освещение: подгоняем плавную поверхность «цвет бумаги» и делим на неё
function analyze(src){
  const w=src.width,h=src.height,N=w*h,p=src.getContext('2d').getImageData(0,0,w,h).data,d=new Uint8Array(N);
  let alpha=false;for(let i=3;i<p.length;i+=28)if(p[i]<250){alpha=true;break}
  if(alpha)return{w,h,px:p,d,alpha:true};
  const S=[],lum=[];
  for(let y=1;y<h;y+=3)for(let x=1;x<w;x+=3){const i=(y*w+x)*4,r=p[i],g=p[i+1],b=p[i+2],mx=Math.max(r,g,b),mn=Math.min(r,g,b);if(mx-mn<45){S.push(x/w,y/h,r,g,b);lum.push(mx)}}
  const sorted=lum.slice().sort((a,b)=>a-b),thr=sorted[(sorted.length*.45)|0]||0,co=[];
  for(let c=0;c<3;c++){
    let coef=null;
    for(let it=0;it<3;it++){
      const A=Array.from({length:6},()=>[0,0,0,0,0,0]),B=[0,0,0,0,0,0];let cnt=0;
      for(let k=0,j=0;k<S.length;k+=5,j++){
        if(lum[j]<thr)continue;const x=S[k],y=S[k+1],v=S[k+2+c],f=[1,x,y,x*x,y*y,x*y];
        if(coef){const res=v-(coef[0]+coef[1]*x+coef[2]*y+coef[3]*x*x+coef[4]*y*y+coef[5]*x*y);if(res<-12||res>25)continue}
        for(let a=0;a<6;a++){B[a]+=f[a]*v;for(let b=0;b<6;b++)A[a][b]+=f[a]*f[b]}cnt++;
      }
      if(cnt<20)break;coef=solve(A,B);
    }
    co.push(coef||[235,0,0,0,0,0]);
  }
  const px=new Uint8ClampedArray(N*4);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=y*w+x,X=x/w,Y=y/h;let mn=255;
    for(let c=0;c<3;c++){const k=co[c],s=k[0]+k[1]*X+k[2]*Y+k[3]*X*X+k[4]*Y*Y+k[5]*X*Y,v=Math.min(255,p[i*4+c]*255/Math.max(40,s));px[i*4+c]=v;if(v<mn)mn=v}
    px[i*4+3]=255;d[i]=255-mn;
  }
  return{w,h,px,d,alpha:false};
}
function comps(mask,w,h,fn){
  const N=w*h,seen=new Uint8Array(N),st=[];
  for(let s=0;s<N;s++){
    if(!mask[s]||seen[s])continue;const list=[];let edge=0;st.push(s);seen[s]=1;
    while(st.length){
      const q=st.pop();list.push(q);const x=q%w,y=(q/w)|0;if(x===0||y===0||x===w-1||y===h-1)edge++;
      if(x>0&&mask[q-1]&&!seen[q-1]){seen[q-1]=1;st.push(q-1)}
      if(x<w-1&&mask[q+1]&&!seen[q+1]){seen[q+1]=1;st.push(q+1)}
      if(y>0&&mask[q-w]&&!seen[q-w]){seen[q-w]=1;st.push(q-w)}
      if(y<h-1&&mask[q+w]&&!seen[q+w]){seen[q+w]=1;st.push(q+w)}
    }
    fn(list,edge);
  }
}
function box(src,w,h,r,mx){
  const t=new Uint8Array(w*h),o=new Uint8Array(w*h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){let v=mx?0:1;for(let k=-r;k<=r;k++){const xx=x+k;if(xx<0||xx>=w)continue;const s=src[y*w+xx];if(mx){if(s){v=1;break}}else if(!s){v=0;break}}t[y*w+x]=v}
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){let v=mx?0:1;for(let k=-r;k<=r;k++){const yy=y+k;if(yy<0||yy>=h)continue;const s=t[yy*w+x];if(mx){if(s){v=1;break}}else if(!s){v=0;break}}o[y*w+x]=v}
  return o;
}
// 2. рисунок = всё, что обведено линиями: расширяем линии, заливаем фон от краёв, остальное оставляем
function autoMask(an,tol){
  const w=an.w,h=an.h,d=an.d,N=w*h,keep=new Uint8Array(N);
  if(an.alpha){for(let i=0;i<N;i++)keep[i]=an.px[i*4+3]>20?1:0;return keep}
  const ink=new Uint8Array(N);for(let i=0;i<N;i++)ink[i]=d[i]>tol?1:0;
  const minA=Math.max(12,N*.0003);comps(ink,w,h,list=>{if(list.length<minA)for(const q of list)ink[q]=0});
  const r=Math.max(3,Math.round(Math.max(w,h)/100)),dil=box(ink,w,h,r,true),bg=new Uint8Array(N),st=[];
  for(let x=0;x<w;x++){st.push(x,(h-1)*w+x)}for(let y=0;y<h;y++){st.push(y*w,y*w+w-1)}
  while(st.length){
    const q=st.pop();if(bg[q]||dil[q])continue;bg[q]=1;const x=q%w,y=(q/w)|0;
    if(x>0)st.push(q-1);if(x<w-1)st.push(q+1);if(y>0)st.push(q-w);if(y<h-1)st.push(q+w);
  }
  let fg=new Uint8Array(N);for(let i=0;i<N;i++)fg[i]=bg[i]?0:1;
  fg=box(fg,w,h,Math.max(1,r-2),false);
  const cl=[];comps(fg,w,h,(list,edge)=>cl.push({list,edge}));
  const wide=(w+h)*.12;let big=0,inner=0;
  for(const c of cl){big=Math.max(big,c.list.length);if(c.edge<wide)inner=Math.max(inner,c.list.length)}
  for(const c of cl){
    if(c.list.length<big*.04)continue;
    if(c.edge>=wide&&inner>=c.list.length*.12)continue; // широкая полоса у края фото: стол, пол, тень
    for(const q of c.list)keep[q]=1;
  }
  return keep;
}
function compose(an,keep,tol){
  const w=an.w,h=an.h,px=an.px,d=an.d,id=new ImageData(w,h),o=id.data;let x0=w,y0=h,x1=-1,y1=-1;
  for(let i=0;i<w*h;i++){
    if(!keep[i])continue;const x=i%w,y=(i/w)|0;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;
    let r=px[i*4],g=px[i*4+1],b=px[i*4+2];
    if(!an.alpha&&d[i]<tol*.55){r=r*.3+178;g=g*.3+178;b=b*.3+178}
    const edge=(x>0&&!keep[i-1])||(x<w-1&&!keep[i+1])||(y>0&&!keep[i-w])||(y<h-1&&!keep[i+w]);
    o[i*4]=r;o[i*4+1]=g;o[i*4+2]=b;o[i*4+3]=an.alpha?px[i*4+3]:edge?150:255;
  }
  if(x1<x0)return null;
  const c=mk(w,h);c.getContext('2d').putImageData(id,0,0);
  const bw=x1-x0+1,bh=y1-y0+1,s=Math.min(1,520/Math.max(bw,bh)),out=mk(Math.max(1,Math.round(bw*s)),Math.max(1,Math.round(bh*s)));
  out.getContext('2d').drawImage(c,x0,y0,bw,bh,0,0,out.width,out.height);return out;
}
