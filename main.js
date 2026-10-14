/* ==========================================================================
   Ingrid Lima · main.js
   Hero com olho em WebGL + animações de rolagem (GSAP/ScrollTrigger + Lenis)
   ========================================================================== */
(() => {
  'use strict';

  /* ------------------------------------------------------------------------
     CONFIGURAÇÃO — edite aqui
     ------------------------------------------------------------------------ */
  const CONFIG = {
    whatsapp: '5548996966456',
    waMessage: 'Oi, Ingrid! Vim pelo seu site e quero conversar sobre conteúdo para a minha marca.',
    // Opcional: URL que recebe os leads do formulário via POST (JSON).
    // Ex.: Formspree, Make, Zapier, Google Apps Script. Deixe vazio para só abrir o WhatsApp.
    formEndpoint: '',
  };

  // Depoimentos reais. Enquanto a lista estiver vazia, a seção fica oculta.
  // Exemplo: { quote: 'Texto do depoimento', name: 'Nome', role: 'Empresa' }
  const TESTIMONIALS = [];

  /* ------------------------------------------------------------------------
     Utilitários e ambiente
     ------------------------------------------------------------------------ */
  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const mm = (q) => window.matchMedia(q).matches;

  const reduced = mm('(prefers-reduced-motion: reduce)');
  const finePointer = mm('(hover: hover) and (pointer: fine)');
  const hasGSAP = !!(window.gsap && window.ScrollTrigger);
  const waURL = (msg) => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`;

  if (reduced) root.classList.add('reduced');
  if (!hasGSAP) root.classList.add('no-gsap');

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!location.hash) window.scrollTo(0, 0);

  let lenis = null;
  let lockCount = 0;
  const lockScroll = () => {
    lockCount++;
    if (lenis) lenis.stop();
    else root.style.overflow = 'hidden';
  };
  const unlockScroll = () => {
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount) return;
    if (lenis) lenis.start();
    else root.style.overflow = '';
  };

  /* ------------------------------------------------------------------------
     Links de WhatsApp + ano
     ------------------------------------------------------------------------ */
  $$('[data-wa]').forEach((a) => { a.href = waURL(CONFIG.waMessage); });
  $$('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });

  /* ------------------------------------------------------------------------
     GSAP + Lenis
     ------------------------------------------------------------------------ */
  if (hasGSAP) {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });
    if (!reduced && window.Lenis) {
      lenis = new window.Lenis({
        duration: 1.15,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
      });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    }
  }

  /* ========================================================================
     HERO EM WEBGL: olho castanho realista, desenhado por código
     ======================================================================== */
  const eyeState = { zoom: 1, rot: 0, blur: 0, lerp: 0, dilate: 0, deep: 0, open: reduced || !hasGSAP ? 1 : 0, defocus: reduced || !hasGSAP ? 0 : 1 };
  const IRIS_R = 0.42; // raio da íris em unidades do olho (o olho vai de -1 a 1 na horizontal)

  const VERT = 'attribute vec2 aPos;void main(){gl_Position=vec4(aPos,0.0,1.0);}';

  const HASH = `
float hash(vec2 p){vec3 p3=fract(vec3(p.xyx)*0.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}`;

  const EYE_FRAG = `precision highp float;
uniform vec2 uRes;uniform float uTime;uniform float uZoom;uniform float uOpen;uniform float uRot;
uniform float uScale;uniform float uLerp;uniform float uDilate;uniform float uDeep;uniform float uMaxOct;
uniform vec2 uLook;uniform vec2 uCenter;
const vec3 BG=vec3(0.027,0.043,0.086);
const float R=${IRIS_R.toFixed(2)};
${HASH}
float noise(vec2 x){vec2 i=floor(x);vec2 f=fract(x);vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),u.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),u.x),u.y);}
float fbm3(vec2 x){float v=0.0;float a=0.5;for(int i=0;i<3;i++){v+=a*noise(x);x=x*2.03+vec2(1.7,9.2);a*=0.5;}return v/0.875;}
float pnoise(vec2 x,float per){vec2 i=floor(x);vec2 f=fract(x);vec2 u=f*f*(3.0-2.0*f);
  float i0=mod(i.x,per);float i1=mod(i.x+1.0,per);
  return mix(mix(hash(vec2(i0,i.y)),hash(vec2(i1,i.y)),u.x),mix(hash(vec2(i0,i.y+1.0)),hash(vec2(i1,i.y+1.0)),u.x),u.y);}
/* fbm periódico com nível de detalhe contínuo: novas oitavas surgem suavemente com o zoom */
float pfbm(vec2 x,float per,float oct){float v=0.0;float a=0.5;float n=0.0;
  for(int k=0;k<8;k++){float w=clamp(oct-float(k),0.0,1.0);if(w<=0.0)break;
    v+=a*w*pnoise(x,per);n+=a*w;x*=2.0;x.y+=17.31;per*=2.0;a*=0.5;}
  return n>0.0?v/n:0.5;}
float inv(float a,float b,float x){return 1.0-smoothstep(a,b,x);}

/* íris castanha fotorrealista, nas cores do olho da Ingrid (q em unidades do raio da íris) */
vec3 iris(vec2 q,float r,float pr,float lod,float pxq){
  float u=clamp((r-pr)/(1.0-pr),0.0,1.0);
  float t=atan(q.y,q.x+0.000001)/6.2831853+0.5;
  float tw=t+0.010*(pnoise(vec2(t*24.0,u*5.0),24.0)-0.5)+0.004*(pnoise(vec2(t*96.0,u*16.0+2.0),96.0)-0.5);
  float fib=smoothstep(0.18,0.82,pfbm(vec2(tw*64.0,u*3.2),64.0,lod));
  float fine=smoothstep(0.28,0.74,pfbm(vec2(tw*256.0,u*9.0+5.0),256.0,lod-2.0));
  float strand=lod>4.8?smoothstep(0.66,0.9,pnoise(vec2(tw*640.0,u*4.0+1.0),640.0))*clamp(lod-4.8,0.0,1.0):0.0;
  float cu=0.30+0.09*(pnoise(vec2(t*9.0,2.0),9.0)-0.5)+0.04*(pnoise(vec2(t*36.0,5.0),36.0)-0.5)+0.015*(pnoise(vec2(t*120.0,8.0),120.0)-0.5);
  vec3 cDark=vec3(0.12,0.065,0.04);
  vec3 cBrown=vec3(0.34,0.185,0.095);
  vec3 cAmber=vec3(0.58,0.34,0.14);
  vec3 cGold=vec3(0.82,0.57,0.29);
  float near=smoothstep(3.5,6.0,lod);
  float pz=1.0-smoothstep(cu-0.03,cu+0.03,u);
  vec3 col=mix(mix(cDark,cBrown,fib),mix(cBrown*0.8,cAmber,fib),pz*0.85);
  /* brilho dourado ao redor do colarete e pequenos flocos */
  float glow=exp(-pow((u-cu-0.06)/0.12,2.0));
  col=mix(col,cGold*(0.55+0.6*fib),glow*(0.22+0.2*near)*smoothstep(0.35,0.8,fib));
  col+=cGold*0.35*pow(fine,5.0)*smoothstep(cu,cu+0.2,u)*inv(0.6,0.85,u);
  /* fibras finas: luz e sombra, com filamentos dourados nítidos de perto */
  col*=mix(0.8+0.36*fine,0.66+0.62*fine,near);
  col+=cGold*0.32*strand*inv(0.05,0.85,u)*(0.5+fib);
  /* colarete: a crista em zigue-zague */
  float ridge=exp(-pow((u-cu)/0.022,2.0));
  col=mix(col,cAmber*1.1,ridge*0.38*(0.4+0.6*fib)*(0.5+0.5*pnoise(vec2(t*30.0,6.0),30.0)));
  /* criptas de Fuchs com bordas claras */
  float cr=0.65*pnoise(vec2(tw*30.0,u*3.6+4.0),30.0)+0.35*pnoise(vec2(tw*60.0,u*7.0+9.0),60.0);
  float zone=smoothstep(cu+0.01,cu+0.08,u)*inv(0.48,0.72,u);
  col*=1.0-0.48*smoothstep(0.6,0.74,cr)*zone;
  col+=cAmber*0.16*smoothstep(0.52,0.6,cr)*inv(0.6,0.68,cr)*zone;
  /* sulcos de contração */
  float fur=0.0;
  for(int i=0;i<3;i++){float fi=float(i);
    float uc=0.6+0.11*fi+0.07*(pnoise(vec2(t*10.0,fi*5.0+1.0),10.0)-0.5);
    fur+=exp(-pow((u-uc)/0.02,2.0))*smoothstep(0.45,0.72,pnoise(vec2(t*7.0,fi*3.0),7.0));}
  col*=1.0-0.2*clamp(fur,0.0,1.0)*(0.6+0.6*fib);
  /* anel limbal */
  col=mix(col,vec3(0.055,0.032,0.022),smoothstep(0.8,1.0,u));
  /* franja pupilar */
  float ruff=0.035+0.02*pnoise(vec2(t*90.0,1.0),90.0);
  col=mix(col,vec3(0.11,0.045,0.025),inv(0.0,ruff,u)*0.85);
  /* pupila com borda nítida em qualquer zoom */
  float pe=pr*(1.0+0.012*(pnoise(vec2(t*36.0,3.0),36.0)-0.5));
  vec3 pc=vec3(0.006,0.005,0.007)+vec3(0.02,0.012,0.01)*smoothstep(0.0,pe,r);
  col=mix(col,pc,inv(pe-pxq*1.5,pe+pxq*1.5,r));
  /* profundidade: a íris é levemente côncava */
  col*=0.88+0.12*smoothstep(0.0,0.6,u);
  /* brilho úmido da córnea */
  col+=vec3(0.05,0.06,0.08)*inv(0.0,0.9,length(q-vec2(-0.25,0.35)));
  return col;
}

/* contorno das pálpebras (acompanha o olhar e o piscar) */
void lids(float x,out float top,out float bot){
  float ax=clamp(1.0-x*x,0.0,1.0);
  float topO=0.45*pow(ax,0.95)*(1.0-0.14*x)+0.055*x+uLook.y*0.05*ax;
  float botO=-0.35*pow(ax,1.15)*(1.0+0.1*x)+0.045*x+uLook.y*0.015*ax;
  bot=mix(botO*0.8+0.012*ax,botO,uOpen);
  top=mix(bot+0.004,topO,uOpen);
}

/* relevo da pele ao redor do olho (para iluminar em 3D) */
float skinH(vec2 e,float top,float bot){
  float x=e.x;float ax=clamp(1.0-x*x,0.0,1.0);
  float du=e.y-top;float dl=bot-e.y;
  float creaseY=0.12+0.08*ax+0.018*(noise(vec2(x*2.6,4.0))-0.5);
  float h=0.0;
  h+=0.22*exp(-pow((e.y-1.0)/0.28,2.0))*inv(0.9,1.7,abs(x+0.1));
  h+=0.12*exp(-pow((e.y+0.85)/0.32,2.0));
  h-=0.16*exp(-dot(e*vec2(0.85,1.5),e*vec2(0.85,1.5)));
  h+=0.026*smoothstep(0.0,0.06,du)*inv(creaseY-0.05,creaseY+0.02,du)*ax;
  h-=0.022*exp(-pow((du-creaseY)/0.03,2.0))*smoothstep(0.05,0.5,ax);
  h+=0.03*exp(-pow((du-creaseY-0.06)/0.06,2.0))*ax;
  h+=0.015*exp(-pow((dl-0.06)/(0.035+0.012*noise(vec2(x*3.0,1.0))),2.0))*ax*step(0.0,dl);
  h-=0.03*exp(-pow((dl-0.22)/0.07,2.0))*inv(-0.2,1.0,x);
  h+=(0.0009+0.0009*exp(-dot(e,e)*1.5))*fbm3(e*90.0)+0.0004*noise(e*400.0);
  h+=0.0007*(noise(vec2(x*9.0,du*160.0))-0.5)*smoothstep(0.02,0.06,du)*inv(creaseY-0.02,creaseY,du)*ax;
  h+=0.0007*(fbm3(vec2(e.x*14.0,dl*95.0))-0.5)*smoothstep(0.05,0.1,dl)*inv(0.16,0.3,dl)*ax;
  vec2 cf=e-vec2(1.05,0.0);
  h+=0.0004*sin(atan(cf.y,cf.x)*26.0+noise(e*20.0)*3.0)*smoothstep(0.08,0.25,length(cf))*inv(0.3,0.55,length(cf))*step(0.0,cf.x+0.15);
  return h;
}

/* cílios: nascem na pálpebra, curvam para fora e para cima e se juntam em tufos.
   Retorna (cobertura, posição no fio de 0 = raiz a 1 = ponta, brilho do fio) */
vec3 lashes(float x,float dd,float px,float seed,float dens,float lenB,float lenV,float thick,float cA,float cB,float sparse,float sg,float lg){
  float sx=sign(x);
  float s0=(x-sx*(dd*(cA+1.4*abs(x))+dd*dd*cB))*dens;
  vec3 res=vec3(0.0);
  for(int k=-2;k<=2;k++){
    float id=floor(s0)+float(k);
    float h=hash(vec2(id,seed));float h2=hash(vec2(id,seed+5.1));float h3=hash(vec2(id,seed+9.7));
    float cid=floor(id/4.0);float hc=hash(vec2(cid,seed+2.3));
    float x0=(id+0.5+(h2-0.5)*0.7)/dens;
    float xc=(cid*4.0+2.0+(hc-0.5)*1.5)/dens;
    float ax0=clamp(1.0-x0*x0,0.0,1.0);
    float len=(lenB+lenV*(0.6*h+0.4*hc))*inv(0.35,1.02,abs(x0))*smoothstep(0.0,0.08,ax0)*step(sparse-sg*x0,h3);
    len*=mix(1.0,0.6+0.7*smoothstep(-0.4,0.85,x0),lg);
    float t=dd/max(len,0.0001);
    if(t<0.0||t>1.0)continue;
    float lean=sign(x0)*(dd*(cA+1.4*abs(x0))+dd*dd*cB)+(h-0.5)*0.25*dd+(xc-x0)*0.55*t*t;
    float w=thick*(1.0-0.88*pow(t,1.3))+px*0.6;
    float dx=x-x0-lean;
    float c=inv(w*0.5,w*0.5+px,abs(dx))*(0.82+0.18*h)*inv(0.88,1.0,t);
    if(c>res.x){
      float hl=inv(0.0,w*0.2+px*0.6,abs(dx+w*0.2))*smoothstep(0.08,0.45,t)*inv(0.8,1.0,t);
      res=vec3(c,t,hl);
    }
  }
  return res;
}
void addLash(inout vec3 acc,vec3 l,float m){l.x*=m;if(l.x>acc.x)acc=l;}

/* sobrancelha feminina: fina, arqueada, fio a fio na direção natural */
float brow(vec2 e,float px){
  float x=e.x;
  float yc=0.78+0.22*exp(-pow((x-0.45)/0.48,2.0))-0.12*smoothstep(0.6,1.25,x)+0.03*smoothstep(-1.2,-0.7,x);
  float th=0.058*inv(-0.6,1.2,x)+0.014;
  float m=inv(th*0.5,th*0.5+0.022,abs(e.y-yc))*smoothstep(-1.22,-0.96,x)*inv(1.08,1.28,x);
  if(m<=0.0)return 0.0;
  float ang=mix(1.25,0.32,smoothstep(-1.0,-0.45,x))-0.55*smoothstep(0.45,1.15,x);
  float c=cos(ang);float s=sin(ang);
  vec2 hp=vec2(c*e.x+s*e.y,-s*e.x+c*e.y);
  float cw=0.0068;float cl=0.065;
  float cov=0.0;
  for(int k=-1;k<=1;k++){
    float j=floor(hp.y/cw)+float(k);
    float sh=hash(vec2(j,3.0));
    float row=floor(hp.x/cl+sh);
    float h1=hash(vec2(j,row));float h2=hash(vec2(j,row+7.0));float h3=hash(vec2(j,row+13.0));
    float along=hp.x/cl+sh-row;
    float len=0.55+0.4*h1;
    float t=(along-0.5*(1.0-len))/len;
    if(t<0.0||t>1.0)continue;
    float off=(j+0.5+(h2-0.5)*0.8)*cw+(h3-0.5)*0.014*t*t;
    float w=0.0026*(1.0-0.75*t)+px*0.5;
    cov=max(cov,inv(w*0.5,w*0.5+px,abs(hp.y-off))*(0.55+0.45*h1)*step(0.25,h3+0.3*m));
  }
  return clamp(cov*m*0.95+m*0.07,0.0,1.0);
}

vec3 shade(vec2 e,float px,float lod){
  float x=e.x;
  float ax=clamp(1.0-x*x,0.0,1.0);
  float top;float bot;lids(x,top,bot);
  float dTop=top-e.y;
  float dBot=e.y-bot;
  float inside=smoothstep(-px,px,min(dTop,dBot))*smoothstep(0.0,0.02,ax);
  float du=e.y-top;
  float dl=bot-e.y;
  float creaseY=0.12+0.08*ax;
  float mW=0.032*sqrt(ax)+0.005;
  float key=exp(-length((e-vec2(-0.1,0.3))*vec2(0.55,0.85))*1.25);

  /* sombra que os cílios superiores projetam logo abaixo deles */
  float dds=du-mW*0.35+0.035;
  float lashSh=exp(-pow((dds-0.028)/0.026,2.0))*smoothstep(0.05,0.45,ax)*(0.75+0.25*noise(vec2(x*18.0,2.0)));

  vec3 outside=BG;
  if(inside<1.0){
    /* ---------------- pele com relevo, luz e subsurface ---------------- */
    float eps=max(px*1.5,0.0015);
    float h0=skinH(e,top,bot);
    float tx;float bx;lids(x+eps,tx,bx);
    float hx=skinH(e+vec2(eps,0.0),tx,bx);
    float hy=skinH(e+vec2(0.0,eps),top,bot);
    vec3 n=normalize(vec3(-(hx-h0)/eps,-(hy-h0)/eps,1.0));
    vec3 Lk=normalize(vec3(-0.45,0.6,0.66));
    vec3 Lf=normalize(vec3(0.6,-0.3,0.75));
    float dk=clamp((dot(n,Lk)+0.35)/1.35,0.0,1.0);
    float df=clamp(dot(n,Lf),0.0,1.0);
    vec3 alb=vec3(0.68,0.48,0.39)*(0.92+0.12*fbm3(e*4.0));
    alb*=vec3(1.0,0.97+0.05*fbm3(e*9.0+4.0),0.96+0.06*fbm3(e*7.0+1.0));
    alb=mix(alb,vec3(0.42,0.27,0.22),inv(0.0,0.06,du)*step(0.0,du)*ax*0.6);
    float nearEye=exp(-dot(e*vec2(0.7,1.4),e*vec2(0.7,1.4))*0.9);
    alb*=1.0-0.05*smoothstep(0.66,0.94,noise(e*170.0))*nearEye;
    alb*=1.0-0.07*smoothstep(0.55,0.95,noise(e*60.0+3.0));
    alb=mix(alb,alb*vec3(1.06,0.92,0.9),smoothstep(0.4,0.8,fbm3(e*5.0+2.0))*0.5);
    vec2 cf2=e-vec2(1.04,0.02);
    float crow=smoothstep(0.82,1.0,abs(sin(atan(cf2.y,cf2.x)*13.0+fbm3(e*9.0)*2.5)))*smoothstep(0.06,0.18,length(cf2))*inv(0.22,0.42,length(cf2))*step(-0.1,cf2.x);
    alb*=1.0-0.03*crow;
    float peri=exp(-dot(e*vec2(0.75,1.5),e*vec2(0.75,1.5))*1.4);
    alb=mix(alb,vec3(0.55,0.36,0.30),peri*0.5);
    alb=mix(alb,vec3(0.74,0.45,0.41),smoothstep(0.0,0.03,du)*inv(creaseY-0.02,creaseY+0.02,du)*ax*0.45);
    float eyeshadow=step(0.0,du)*inv(creaseY*0.75,creaseY+0.13,du)*smoothstep(-1.1,-0.45,x)*inv(1.08,1.32,x);
    alb=mix(alb,mix(vec3(0.82,0.5,0.47),vec3(0.44,0.24,0.2),smoothstep(0.15,0.95,x)),eyeshadow*0.6);
    alb=mix(alb,vec3(0.5,0.35,0.33),exp(-pow((dl-0.12)/0.08,2.0))*step(0.0,dl)*ax*0.35);
    alb=mix(alb,vec3(0.46,0.31,0.3),exp(-pow((dl-0.14)/0.09,2.0))*step(0.0,dl)*ax*0.35);
    vec3 skin=alb*(dk*vec3(1.0,0.93,0.85)*1.22*key+df*vec3(0.12,0.15,0.22)+0.03);
    skin+=alb*vec3(0.34,0.06,0.03)*dk*(1.0-dk)*1.6*key;
    skin*=clamp(0.82+h0*2.0,0.42,1.05);
    vec3 hv=normalize(Lk+vec3(0.0,0.0,1.0));
    skin+=vec3(0.95,0.88,0.82)*pow(max(dot(n,hv),0.0),28.0)*(0.5+0.6*noise(e*25.0))*0.2*key;
    /* brilho da sombra (glitter fino) e iluminador no osso da sobrancelha */
    vec2 gc=floor(e/max(px*1.6,0.0016));
    skin+=vec3(1.0,0.92,0.84)*smoothstep(0.985,1.0,hash(gc))*eyeshadow*inv(creaseY*0.4,creaseY+0.05,du)*0.4*key;
    skin+=vec3(0.13,0.11,0.1)*exp(-pow((du-creaseY-0.22)/0.07,2.0))*inv(-0.6,0.9,abs(x-0.35))*key;
    /* sobrancelha */
    skin=mix(skin,vec3(0.11,0.075,0.058)*(0.6+0.6*key),clamp(brow(e,px),0.0,1.0)*0.85);
    /* linha dos cílios e margem da pálpebra */
    /* linha natural dos cílios */
    skin=mix(skin,vec3(0.04,0.03,0.026),inv(mW*0.35,mW*0.75+0.006,du)*step(0.0,du)*smoothstep(0.0,0.05,ax)*0.9);
    /* delineado: nasce fino no canto interno, segue rente aos cílios, engrossa no terço externo
       e termina num gatinho afilado que continua a curva da pálpebra inferior */
    float xc=0.97;
    float tc;float bc;lids(xc,tc,bc);
    float ext=max(x-xc,0.0);
    float tipX=1.21;
    float yb=x<=xc?top:tc+ext*0.36+ext*ext*0.4;
    float grow=smoothstep(-0.85,0.1,x)*0.45+smoothstep(0.1,0.93,x)*0.55;
    float lth=mix(0.0025,0.029,grow)*(1.0-smoothstep(0.0,1.0,pow(clamp(ext/(tipX-xc),0.0,1.0),0.8)));
    float aaL=px*1.2+0.0012;
    float liner=smoothstep(-aaL,aaL,e.y-yb+0.004)*smoothstep(-aaL,aaL,yb+lth-e.y)*smoothstep(-0.95,-0.72,x)*step(x,tipX);
    liner*=0.9+0.1*noise(e*700.0);
    skin=mix(skin,vec3(0.022,0.016,0.016),liner*0.96);
    /* acabamento acetinado: um reflexo fino ao longo do traço */
    skin+=vec3(0.42,0.4,0.4)*exp(-pow((e.y-(yb+lth*0.62))/(lth*0.16+px),2.0))*liner*key*0.5;
    /* esfumado marrom suave no canto externo, embaixo */
    float smudge=exp(-pow((dl-0.03)/0.022,2.0))*smoothstep(0.25,0.85,x)*inv(1.0,1.12,x)*step(0.0,dl);
    skin=mix(skin,skin*vec3(0.62,0.54,0.54),smudge*0.55);
    /* pálpebra inferior: linha d'água rosada e úmida e borda iluminada */
    float water=step(0.0,dl)*inv(0.008,0.016,dl)*smoothstep(0.0,0.08,ax)*(0.55+0.45*inv(-0.2,0.8,x));
    skin=mix(skin,vec3(0.6,0.4,0.38)*(0.35+0.7*key),water*0.75);
    skin+=vec3(0.22)*exp(-pow((dl-0.003)/0.0025,2.0))*water*smoothstep(0.45,0.75,noise(vec2(x*40.0,1.0)));
    skin*=1.0+0.14*smoothstep(0.009,0.013,dl)*inv(0.017,0.021,dl)*ax*key;
    float roots=exp(-pow((dl-0.021)/0.0035,2.0))*smoothstep(0.4,0.75,noise(vec2(x*110.0,5.0)))*smoothstep(-0.6,0.3,x);
    skin*=1.0-0.5*roots*smoothstep(0.05,0.4,ax);
    skin*=1.0-0.18*exp(-pow((dl-0.05)/0.025,2.0))*smoothstep(-0.3,0.6,x)*ax;
    skin*=1.0-0.45*lashSh*step(0.0,du);
    /* cílios superiores (3 camadas) e inferiores */
    vec3 up=vec3(0.0);
    float dd=du-mW*0.35;
    float lc=0.6+0.4*uOpen;
    if(dd>-0.005&&dd<0.34&&ax>0.0){
      addLash(up,lashes(x,dd,px,7.0,36.0,0.1,0.13,0.0074,0.2,3.6*lc,0.0,0.0,0.9),1.0);
      addLash(up,lashes(x,dd,px,19.0,54.0,0.068,0.09,0.0052,0.27,4.0*lc,0.0,0.0,0.85),0.95);
      addLash(up,lashes(x,dd,px,41.0,72.0,0.036,0.055,0.0037,0.36,4.4*lc,0.25,0.0,0.5),0.88);
      addLash(up,lashes(x,dd,px,63.0,96.0,0.016,0.026,0.0028,0.5,4.0*lc,0.35,0.0,0.0),0.9);
    }
    float dl2=dl-0.021;
    vec3 lo=vec3(0.0);
    if(dl2>-0.003&&dl2<0.13){
      addLash(lo,lashes(x,dl2,px,31.0,32.0,0.034,0.058,0.0046,0.38,2.2,0.5,0.45,1.0),1.0);
      addLash(lo,lashes(x,dl2,px,53.0,48.0,0.02,0.036,0.0032,0.45,2.4,0.6,0.4,1.0),0.88);
      addLash(lo,lashes(x,dl2,px,77.0,72.0,0.009,0.016,0.0022,0.5,2.0,0.7,0.3,0.8),0.7);
    }
    vec3 upC=mix(vec3(0.01,0.008,0.007),vec3(0.085,0.055,0.04),pow(up.y,1.7))+vec3(0.32,0.28,0.25)*up.z*(0.35+0.65*key);
    skin=mix(skin,upC,clamp(up.x,0.0,1.0));
    vec3 loC=mix(vec3(0.03,0.022,0.019),vec3(0.1,0.07,0.055),pow(lo.y,1.5))+vec3(0.22,0.19,0.17)*lo.z*key;
    skin=mix(skin,loC,clamp(lo.x,0.0,1.0)*0.9);
    float fade=inv(0.8,2.2,length(e*vec2(0.6,1.0)));
    outside=mix(BG,skin,fade);
  }

  /* ---------------- globo ocular ---------------- */
  vec3 ball=vec3(0.0);
  if(inside>0.0){
    vec2 ic=uLook*vec2(0.16,0.07);
    vec2 q=(e-ic)/R;
    float r=length(q);
    vec2 se=(e-ic*0.35)*vec2(0.95,1.7);
    float sph=1.0-0.5*dot(se,se);
    vec2 nb=(e-ic*0.3)/1.15;
    vec3 nrm=vec3(nb,sqrt(max(0.0,1.0-dot(nb,nb))));
    float dif=clamp(dot(nrm,normalize(vec3(-0.35,0.45,0.82))),0.0,1.0);
    vec3 scl=mix(vec3(0.52,0.47,0.47),vec3(0.93,0.89,0.85),dif)*(0.32+0.72*dif)*clamp(0.55+0.5*sph,0.4,1.0);
    scl*=vec3(1.0,0.985+0.03*fbm3(e*6.0),0.96+0.05*fbm3(e*5.0+7.0));
    scl+=vec3(0.05)*pow(max(dot(nrm,normalize(vec3(-0.35,0.45,0.82)+vec3(0.0,0.0,1.0))),0.0),24.0);
    scl=mix(scl,vec3(0.86,0.64,0.6)*clamp(sph+0.2,0.3,1.0),smoothstep(0.6,0.98,abs(x))*0.45);
    float car=inv(-0.96,-0.8,x)*inv(0.0,0.16,abs(e.y-0.5*(top+bot)));
    scl=mix(scl,vec3(0.8,0.45,0.44)*(0.7+0.35*noise(e*70.0))*(0.45+0.6*dif),car*0.9);
    scl+=vec3(0.35)*car*smoothstep(0.75,0.95,noise(e*90.0+3.0));
    scl*=0.96+0.06*noise(e*3.0+9.0);
    float v1=abs(noise(e*vec2(7.0,11.0)+3.0)-0.5);
    float v2=abs(noise(e*vec2(17.0,25.0)+11.0)-0.5);
    float vein=(inv(0.0,0.012,v1)+0.5*inv(0.0,0.008,v2))*smoothstep(0.5,0.97,abs(x))*smoothstep(0.95,1.4,r);
    scl=mix(scl,vec3(0.76,0.38,0.38),clamp(vein,0.0,1.0)*0.24);
    scl*=mix(0.62,1.0,inv(0.55,0.95,abs(x)));
    scl*=1.0-0.14*exp(-pow((r-1.05)/0.07,2.0));
    scl*=1.0+0.1*exp(-pow((r-1.3)/0.35,2.0))*dif;
    vec2 wr=(e-ic*0.4-vec2(-0.5,0.17))*vec2(1.0,2.4);
    scl+=vec3(0.16,0.17,0.19)*inv(0.0,0.12,length(wr))*smoothstep(0.0,0.08,dTop);
    float pr=0.34+0.012*sin(uTime*1.3)+0.008*sin(uTime*2.7+1.0)+0.22*uDilate;
    ball=scl;
    if(r<1.08){
      vec3 ir=iris(q,r,pr,lod,px/R);
      /* cáustica: a córnea concentra luz no lado da íris oposto à fonte */
      float caus=smoothstep(0.0,0.9,dot(q,normalize(vec2(0.55,-0.55))))*smoothstep(0.35,0.95,r)*inv(0.95,1.0,r);
      ir*=1.0+vec3(0.38,0.27,0.16)*caus;
      ball=mix(scl,ir,inv(0.975,1.03+px/R,r));
    }
    /* oclusão colorida das pálpebras, sombra dos cílios e cantos */
    ball*=mix(vec3(0.2,0.14,0.13),vec3(1.0),smoothstep(0.0,0.22,dTop));
    ball*=0.55+0.45*smoothstep(0.0,0.018,dTop);
    ball*=mix(0.7,1.0,smoothstep(0.0,0.04,dBot))*mix(0.6,1.0,inv(0.8,1.0,abs(x)));
    ball*=1.0-0.35*lashSh;
    /* menisco lacrimal e reflexos */
    ball+=vec3(0.16)*exp(-pow((dBot-0.005)/0.0035,2.0))*smoothstep(0.25,0.8,ax)*smoothstep(0.35,0.7,noise(vec2(x*25.0,3.0)));
    ball+=vec3(0.05,0.06,0.08)*smoothstep(-0.2,0.5,e.y-ic.y)*inv(0.0,1.1,r);
    ball+=vec3(0.09)*exp(-pow((r-1.02)/0.02,2.0))*smoothstep(-0.2,0.6,dot(normalize(q+0.0001),normalize(vec2(-0.6,0.6))));
    vec2 rp=e-(ic*0.55+vec2(-0.15,0.12)+vec2(sin(uTime*1.7),cos(uTime*1.3))*0.0018);
    float ca=cos(0.12);float sa=sin(0.12);
    rp=vec2(ca*rp.x+sa*rp.y,-sa*rp.x+ca*rp.y);
    rp*=1.0+2.5*dot(rp,rp);
    vec2 hs=vec2(0.056,0.072);
    vec2 qd=abs(rp)-hs+0.016;
    float rb=length(max(qd,0.0))+min(max(qd.x,qd.y),0.0)-0.016;
    float win=inv(-0.006-px,0.006+px,rb);
    float bars=1.0-0.38*max(inv(0.0,0.0028+px,abs(rp.x+0.004)),inv(0.0,0.0028+px,abs(rp.y-0.012)));
    ball=mix(ball,vec3(0.98,0.98,1.0)*(0.7+0.3*smoothstep(-hs.y,hs.y,rp.y)),win*bars*0.88*smoothstep(0.0,0.06,dTop));
    ball+=vec3(0.07)*inv(0.0,0.05,rb)*(1.0-win);
    ball+=vec3(0.9)*inv(0.0,0.013+px,length(e-(ic*0.55+vec2(0.17,-0.11))))*0.6;
  }
  return mix(outside,ball,inside);
}

void main(){
  vec2 p=(gl_FragCoord.xy-0.5*uRes)/uRes.y;
  vec2 ic=uLook*vec2(0.16,0.07);
  vec2 fp=uCenter+ic*uScale;
  vec2 target=mix(fp,vec2(0.0),uLerp);
  vec2 d=p-target;
  float c=cos(uRot);float s=sin(uRot);
  d=vec2(c*d.x-s*d.y,s*d.x+c*d.y);
  vec2 e=(fp+d/uZoom-uCenter)/uScale;
  float px=1.0/(uRes.y*uScale*uZoom);
  float lod=clamp(log2(6.2831853*R/(px*3.0*64.0))+1.0,1.0,uMaxOct);
  vec3 col=shade(e,px,lod);
  float rpd=length(e-ic)/(R*(0.34+0.22*uDilate));
  col=mix(col,vec3(0.008,0.010,0.018),inv(0.5,1.15,rpd)*uDeep);
  /* gradação cinematográfica: sombras levemente frias, realces quentes */
  float l=dot(col,vec3(0.299,0.587,0.114));
  col=mix(col,col*vec3(0.9,0.96,1.1),inv(0.05,0.35,l)*0.6);
  col=mix(col,col*vec3(1.04,1.0,0.96),smoothstep(0.5,0.9,l)*0.5);
  gl_FragColor=vec4(col,1.0);
}`;

  const POST_FRAG = `precision highp float;
uniform sampler2D uTex;uniform vec2 uRes;uniform vec2 uFocus;uniform float uBlur;uniform float uTime;uniform float uDof;uniform vec2 uDofR;uniform float uDefocus;
${HASH}
void main(){
  vec2 uv=gl_FragCoord.xy/uRes;
  vec3 col;
  if(uBlur<0.001){
    col=texture2D(uTex,uv).rgb;
  }else{
    vec2 dir=uv-uFocus;
    float amt=uBlur*0.11;
    float ca=uBlur*0.012*length(dir);
    vec3 acc=vec3(0.0);float tot=0.0;
    for(int i=0;i<12;i++){
      float k=float(i)/11.0;
      float w=1.0-0.6*k;
      float sc=1.0-amt*k;
      acc.r+=texture2D(uTex,uFocus+dir*(sc+ca)).r*w;
      acc.g+=texture2D(uTex,uFocus+dir*sc).g*w;
      acc.b+=texture2D(uTex,uFocus+dir*(sc-ca)).b*w;
      tot+=w;
    }
    col=acc/tot;
  }
  if(uDof>0.001){
    /* lente macro: foco no olho, a pele ao redor desfoca com a distância */
    vec2 dv=(uv-uFocus)*vec2(uRes.x/uRes.y,1.0);
    float rad=uDof*0.01*smoothstep(uDofR.x,uDofR.y,length(dv))+uDefocus*0.016;
    vec3 acc2=col;
    for(int i=0;i<10;i++){float fi=float(i);float a=fi*2.39996;float rr=sqrt((fi+0.5)/10.0)*rad;
      acc2+=texture2D(uTex,uv+vec2(cos(a),sin(a))*rr*vec2(uRes.y/uRes.x,1.0)).rgb;}
    col=acc2/11.0;
  }
  /* bloom: os realces mais fortes 'vazam' levemente, como numa lente real */
  vec3 bl=vec3(0.0);
  for(int i=0;i<8;i++){float a=float(i)*0.785398;vec2 o=vec2(cos(a),sin(a))*vec2(uRes.y/uRes.x,1.0);
    bl+=max(texture2D(uTex,uv+o*0.006).rgb-0.72,0.0)+max(texture2D(uTex,uv+o*0.014).rgb-0.72,0.0)*0.6;}
  col+=bl*0.09;
  vec2 vc=(uv-0.5)*vec2(uRes.x/uRes.y,1.0);
  col*=1.0-0.3*smoothstep(0.45,1.15,length(vc));
  col+=(hash(gl_FragCoord.xy+fract(uTime*7.0)*311.0)-0.5)*0.025;
  gl_FragColor=vec4(col,1.0);
}`;

  class Eye {
    constructor(canvas) {
      this.canvas = canvas;
      this.ok = false;
      this.running = false;
      this.visible = true;
      this.quality = 1;
      this.slowFrames = 0;
      this.downgrades = 0;
      this.look = { x: 0, y: 0 };
      this.lookTarget = { x: 0, y: 0 };
      this.lastPointer = -1e9;
      this.nextSaccade = 0;
      this.nextBlink = performance.now() + 3500;
      this.blinkStart = -1;
      this.velBlur = 0;
      this.velTarget = 0;
      this.micro = { x: 0, y: 0 };
      this.nextMicro = 0;
      this.interest = 0;
      this.interestTarget = 0;
      this.flash = 0;
      this.last = performance.now();
      this.mobile = mm('(max-width: 767px)') || !finePointer;
      this.loop = this.loop.bind(this);
    }

    // posição da pupila na tela, em pixels relativos ao palco do hero
    pupilScreen() {
      const L = this.layout();
      const w = this.canvas.clientWidth;
      const h = this.canvas.clientHeight;
      const fx = L.cx + this.look.x * 0.16 * L.scale;
      const fy = L.cy + this.look.y * 0.07 * L.scale;
      return { x: w / 2 + fx * h, y: h / 2 - fy * h };
    }

    // olhada rápida em uma direção (ex.: para o texto que acabou de mudar)
    glance(x, y, ms) {
      if (finePointer && performance.now() - this.lastPointer < 2500) return;
      this.lookTarget.x = x;
      this.lookTarget.y = y;
      this.nextSaccade = performance.now() + ms;
    }

    init() {
      const opts = { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' };
      let gl = null;
      try { gl = this.canvas.getContext('webgl', opts) || this.canvas.getContext('experimental-webgl', opts); } catch (e) { gl = null; }
      if (!gl) return false;
      const hp = gl.getShaderPrecisionFormat && gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
      if (!hp || hp.precision <= 0) return false;
      this.gl = gl;

      this.eyeProg = this.program(VERT, EYE_FRAG);
      this.postProg = this.program(VERT, POST_FRAG);
      if (!this.eyeProg || !this.postProg) return false;

      this.uEye = this.locations(this.eyeProg, ['uRes', 'uTime', 'uZoom', 'uOpen', 'uRot', 'uScale', 'uLerp', 'uDilate', 'uDeep', 'uMaxOct', 'uLook', 'uCenter']);
      this.uPost = this.locations(this.postProg, ['uTex', 'uRes', 'uFocus', 'uBlur', 'uTime', 'uDof', 'uDofR', 'uDefocus']);

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

      this.tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      this.fbo = gl.createFramebuffer();

      this.W = this.H = 0;
      this.ok = this.resize();
      return this.ok;
    }

    program(vs, fs) {
      const gl = this.gl;
      const compile = (type, src) => {
        const sh = gl.createShader(type);
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
      };
      const v = compile(gl.VERTEX_SHADER, vs);
      const f = compile(gl.FRAGMENT_SHADER, fs);
      if (!v || !f) return null;
      const p = gl.createProgram();
      gl.attachShader(p, v);
      gl.attachShader(p, f);
      gl.bindAttribLocation(p, 0, 'aPos');
      gl.linkProgram(p);
      return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null;
    }

    locations(p, names) {
      const out = {};
      names.forEach((n) => { out[n] = this.gl.getUniformLocation(p, n); });
      return out;
    }

    resize() {
      const gl = this.gl;
      const w = this.canvas.clientWidth || window.innerWidth;
      const h = this.canvas.clientHeight || window.innerHeight;
      const maxPixels = this.mobile ? 1100000 : 2300000;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const scale = Math.min(dpr, Math.sqrt(maxPixels / (w * h))) * this.quality;
      const W = Math.max(2, Math.round(w * scale));
      const H = Math.max(2, Math.round(h * scale));
      if (W === this.W && H === this.H) return true;
      this.W = W; this.H = H;
      this.canvas.width = W;
      this.canvas.height = H;

      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.tex, 0);
      this.twoPass = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return true;
    }

    // Enquadramento: no desktop o olho fica à direita do texto; no celular, no alto da tela.
    layout() {
      const aspect = this.W / this.H;
      // o olho inteiro (com o gatinho do delineado) cabe na tela; no celular ele fica no alto
      const wide = clamp((aspect - 0.9) / 0.5, 0, 1);
      const scale = clamp(aspect * 0.42, 0.3, 0.62);
      const cx = wide * clamp(aspect / 2 - 1.2 * scale - 0.02, 0, 0.25) - (1 - wide) * 0.03;
      const cy = 0.17 - 0.12 * clamp((aspect - 1) / 0.5, 0, 1);
      return { aspect, scale, cx, cy };
    }

    // zoom necessário para a íris ter raio k (em relação à menor dimensão da tela)
    zoomFor(k) {
      const L = this.layout();
      return Math.max(1, (k * Math.min(L.aspect, 1)) / (IRIS_R * L.scale));
    }

    updateGaze(now, dt) {
      const pointerActive = finePointer && now - this.lastPointer < 2500;
      if (!pointerActive && now > this.nextSaccade) {
        const home = Math.random() < 0.3;
        this.lookTarget.x = home ? 0 : (Math.random() * 2 - 1) * 0.6;
        this.lookTarget.y = home ? 0 : (Math.random() * 2 - 1) * 0.4;
        this.nextSaccade = now + 1300 + Math.random() * 2200;
      }
      const k = 1 - Math.exp(-dt * (pointerActive ? 6 : 11));
      this.look.x += (this.lookTarget.x - this.look.x) * k;
      this.look.y += (this.lookTarget.y - this.look.y) * k;
      // microssacadas: pequenos saltos involuntários, como num olho de verdade
      if (now > this.nextMicro) {
        this.micro.x = (Math.random() * 2 - 1) * 0.022;
        this.micro.y = (Math.random() * 2 - 1) * 0.018;
        this.nextMicro = now + 350 + Math.random() * 750;
      }
      this.interest += (this.interestTarget - this.interest) * (1 - Math.exp(-dt * 3));
      this.flash *= Math.exp(-dt * 2.2);
    }

    blinkFactor(now) {
      if (reduced) return 1;
      if (this.blinkStart < 0 && now > this.nextBlink && eyeState.zoom < 1.05 && eyeState.open > 0.98) {
        this.blinkStart = now;
      }
      if (this.blinkStart >= 0) {
        const t = (now - this.blinkStart) / 320;
        if (t >= 1) {
          this.blinkStart = -1;
          this.nextBlink = now + (Math.random() < 0.18 ? 140 : 3000 + Math.random() * 4500);
          return 1;
        }
        // fecha rápido, abre devagar (às vezes pisca duas vezes)
        const f = t < 0.28 ? t / 0.28 : 1 - (t - 0.28) / 0.72;
        return 1 - f * f * (3 - 2 * f) * 0.97;
      }
      return 1;
    }

    render(now) {
      if (!this.ok) return;
      const gl = this.gl;
      const L = this.layout();
      const damp = 1 - clamp((eyeState.zoom - 1) / 1.5, 0, 1);
      const lx = (this.look.x + this.micro.x) * damp;
      const ly = (this.look.y + this.micro.y) * damp;
      const open = eyeState.open * this.blinkFactor(now);
      const t = now / 1000;

      gl.bindFramebuffer(gl.FRAMEBUFFER, this.twoPass ? this.fbo : null);
      gl.viewport(0, 0, this.W, this.H);
      gl.useProgram(this.eyeProg);
      const u = this.uEye;
      gl.uniform2f(u.uRes, this.W, this.H);
      gl.uniform1f(u.uTime, t);
      gl.uniform1f(u.uZoom, eyeState.zoom);
      gl.uniform1f(u.uOpen, open);
      gl.uniform1f(u.uRot, eyeState.rot);
      gl.uniform1f(u.uScale, L.scale);
      gl.uniform1f(u.uLerp, eyeState.lerp);
      gl.uniform1f(u.uDilate, eyeState.dilate + (this.interest * 0.14 - this.flash * 0.12) * damp);
      gl.uniform1f(u.uDeep, eyeState.deep);
      gl.uniform1f(u.uMaxOct, this.mobile ? 5.5 : 7.5);
      gl.uniform2f(u.uLook, lx, ly);
      gl.uniform2f(u.uCenter, L.cx, L.cy);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (!this.twoPass) return;
      // ponto focal do mergulho, em coordenadas de textura (para o desfoque radial)
      const fpx = L.cx + lx * 0.16 * L.scale;
      const fpy = L.cy + ly * 0.07 * L.scale;
      const tx = fpx * (1 - eyeState.lerp);
      const ty = fpy * (1 - eyeState.lerp);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, this.W, this.H);
      gl.useProgram(this.postProg);
      const p = this.uPost;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.uniform1i(p.uTex, 0);
      gl.uniform2f(p.uRes, this.W, this.H);
      gl.uniform2f(p.uFocus, tx / L.aspect + 0.5, ty + 0.5);
      // desfoque de movimento: forte só enquanto a pessoa rola; parado, a íris fica nítida
      const moving = this.velBlur * 0.55 * clamp((eyeState.zoom - 1.1) / 1.5, 0, 1);
      gl.uniform1f(p.uBlur, Math.max(eyeState.blur, moving));
      gl.uniform1f(p.uTime, t);
      // a área em foco cobre o olho inteiro (delineado e cílios nítidos); só a pele ao redor desfoca
      const dofR0 = Math.max(IRIS_R * 1.15, 0.86) * L.scale * eyeState.zoom;
      gl.uniform1f(p.uDefocus, eyeState.defocus);
      gl.uniform1f(p.uDof, (0.85 + 0.6 * clamp((eyeState.zoom - 1.15) / 1.2, 0, 1)) * (1 - eyeState.blur));
      gl.uniform2f(p.uDofR, dofR0, dofR0 + L.scale * eyeState.zoom * 0.85);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    loop(now) {
      this.raf = requestAnimationFrame(this.loop);
      const dt = Math.min(0.1, Math.max(0.001, (now - this.last) / 1000));
      this.last = now;
      this.updateGaze(now, dt);
      this.velBlur += (this.velTarget - this.velBlur) * (1 - Math.exp(-dt * 10));
      this.velTarget *= Math.exp(-dt * 5);
      if (heroDark() >= 0.999) return; // tela já coberta, nada a desenhar
      this.render(now);
      // qualidade adaptativa: reduz a resolução se o aparelho não acompanhar
      if (dt > 0.028) this.slowFrames++;
      else this.slowFrames = Math.max(0, this.slowFrames - 1);
      if (this.slowFrames > 45 && this.downgrades < 4) {
        this.slowFrames = 0;
        this.downgrades++;
        this.quality = Math.max(0.5, this.quality * 0.8);
        this.resize();
      }
    }

    start() {
      if (!this.ok || this.running || reduced) return;
      this.running = true;
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.loop);
    }

    stop() {
      this.running = false;
      cancelAnimationFrame(this.raf);
    }
  }

  const heroEl = $('.hero');
  const darkEl = $('.hero__dark');
  const heroDark = () => (darkEl ? parseFloat(darkEl.style.opacity || '0') : 0);

  const eye = new Eye($('.hero__canvas'));
  let eyeOK = false;
  try { eyeOK = eye.init(); } catch (e) { eyeOK = false; }
  if (!eyeOK) root.classList.add('no-webgl');
  const heroReady = Promise.resolve();

  if (eyeOK) {
    const canvas = eye.canvas;
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      eye.stop();
      eye.ok = false;
    });
    canvas.addEventListener('webglcontextrestored', () => {
      if (eye.init()) {
        if (eye.visible) eye.start();
        eye.render(performance.now());
      } else {
        root.classList.add('no-webgl');
      }
    });

    const onResize = () => {
      if (!eye.ok) return;
      eye.mobile = mm('(max-width: 767px)') || !finePointer;
      eye.resize();
      eye.render(performance.now());
    };
    if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(canvas);
    else window.addEventListener('resize', onResize);

    if (finePointer) {
      window.addEventListener('pointermove', (e) => {
        eye.lastPointer = performance.now();
        eye.lookTarget.x = clamp((e.clientX / window.innerWidth) * 2 - 1, -1, 1);
        eye.lookTarget.y = clamp(-((e.clientY / window.innerHeight) * 2 - 1), -1, 1);
      }, { passive: true });
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        eye.visible = entry.isIntersecting;
        if (eye.visible && !document.hidden) eye.start();
        else eye.stop();
      }).observe(heroEl);
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) eye.stop();
      else if (eye.visible) eye.start();
    });

    eye.render(performance.now());
    eye.start();

    // a pupila dilata quando a pessoa passa o mouse nos botões
    document.addEventListener('pointerover', (e) => {
      eye.interestTarget = e.target.closest && e.target.closest('.btn, [data-wa]') ? 1 : 0;
    });
  }

  /* ========================================================================
     LOADER + ENTRADA
     ======================================================================== */
  const markLoaded = () => root.classList.add('is-loaded');

  function intro() {
    if (!hasGSAP || reduced) {
      eyeState.open = 1;
      eyeState.defocus = 0;
      markLoaded();
      return;
    }
    if (lenis) lenis.stop();
    const heroBits = ['.hero__eyebrow', '.hero__sub', '.hero__ctas'];
    gsap.set('.hero__line > span', { yPercent: 115 });
    gsap.set(heroBits, { autoAlpha: 0, y: 24 });
    gsap.set('.nav', { autoAlpha: 0 });

    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .from('.loader__name > span', { yPercent: 110, duration: 0.7, stagger: 0.08 })
      .to('.loader__inner', { autoAlpha: 0, y: -16, duration: 0.4, ease: 'power2.in' }, '+=0.2')
      .to('.loader', {
        autoAlpha: 0,
        duration: 0.55,
        ease: 'power2.inOut',
        onComplete: () => {
          markLoaded();
          if (lenis) lenis.start();
        },
      })
      .addLabel('eyeOpen', '-=0.35')
      .to(eyeState, { keyframes: [{ open: 0.7, duration: 0.42, ease: 'power2.out' }, { open: 0.48, duration: 0.2, ease: 'power1.inOut' }, { open: 1, duration: 0.95, ease: 'expo.out' }] }, 'eyeOpen')
      .to('.hero__line > span', { yPercent: 0, duration: 1.15, stagger: 0.09, ease: 'expo.out' }, '<0.1')
      .to(heroBits, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.08 }, '<0.35')
      .to('.nav', { autoAlpha: 1, duration: 0.8, clearProps: 'opacity,visibility' }, '<')
      .to(eyeState, { defocus: 0, duration: 1.5, ease: 'power2.inOut' }, 'eyeOpen+=0.1')
      .call(() => {
        if (!eyeOK) return;
        const pp = eye.pupilScreen();
        focusPulse(pp.x, pp.y, false);
      }, null, 'eyeOpen+=0.8');
  }

  /* ========================================================================
     HERO: quadrado de autofoco e "toque para focar"
     ======================================================================== */
  const afBox = $('.af');
  function focusPulse(x, y, pull) {
    if (!afBox || !hasGSAP || reduced) return;
    gsap.killTweensOf(afBox);
    gsap.set(afBox, { x, y, scale: 1.55, autoAlpha: 0 });
    gsap.timeline()
      .to(afBox, { scale: 1, autoAlpha: 1, duration: 0.32, ease: 'power3.out' })
      .to(afBox, { opacity: 0.35, duration: 0.08, repeat: 3, yoyo: true, ease: 'none' }, '+=0.1')
      .to(afBox, { autoAlpha: 0, scale: 0.92, duration: 0.5, ease: 'power2.in' }, '+=0.55');
    if (eyeOK) {
      eye.flash = 1; // a pupila contrai com a "luz" do foco
      if (pull) gsap.fromTo(eyeState, { defocus: 0.6 }, { defocus: 0, duration: 0.8, ease: 'power2.out', overwrite: 'auto' });
    }
  }

  function heroTapFocus() {
    const stage = $('.hero__stage');
    if (!stage || !eyeOK || !hasGSAP || reduced) return;
    stage.addEventListener('pointerdown', (e) => {
      if (e.target.closest('a, button, input, select, textarea, label')) return;
      if (eyeState.zoom > 1.05) return;
      const r = stage.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      eye.glance(clamp((x / r.width) * 2 - 1, -1, 1), clamp(-((y / r.height) * 2 - 1), -1, 1), 1400);
      focusPulse(x, y, true);
    });
  }

  /* ========================================================================
     HERO: mergulho no olho controlado pela rolagem
     ======================================================================== */
  function heroScroll() {
    if (!hasGSAP || reduced) return;
    const zl = { v: 0 }; // zoom em escala logarítmica = velocidade percebida constante
    const applyZoom = () => { eyeState.zoom = Math.exp(zl.v); };
    const timeEl = $('.vf__time');
    const pad = (n) => String(n).padStart(2, '0');
    let lastTime = '';

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: heroEl,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          eye.velTarget = Math.max(eye.velTarget, Math.min(1, Math.abs(self.getVelocity()) / 2600));
          // cronômetro do "REC" avança com a rolagem no trecho final
          const f = Math.max(0, (self.progress - 0.86) / 0.14) * 4 * 30;
          const txt = `00:0${Math.floor(f / 30)}:${pad(Math.floor(f % 30))}`;
          if (timeEl && txt !== lastTime) { timeEl.textContent = txt; lastTime = txt; }
        },
      },
    });

    // textos e camadas
    tl.to('.hero__scroll', { autoAlpha: 0, duration: 0.06 }, 0.02)
      .fromTo('.hero__content', { y: 0, autoAlpha: 1, filter: 'blur(0px)' }, { y: () => -window.innerHeight * 0.08, autoAlpha: 0, filter: 'blur(10px)', duration: 0.2, ease: 'power2.in', immediateRender: false }, 0.12)
      .to('.hero__shade', { opacity: 0.3, duration: 0.2 }, 0.28)
      // 1) chegando nos olhos
      .fromTo('.story--1 > span', { autoAlpha: 0, yPercent: 60, filter: 'blur(6px)' }, { autoAlpha: 1, yPercent: 0, filter: 'blur(0px)', duration: 0.06, stagger: 0.02, ease: 'power3.out', immediateRender: false }, 0.36)
      .to('.story--1 > span', { autoAlpha: 0, yPercent: -40, filter: 'blur(6px)', duration: 0.05, stagger: 0.01, ease: 'power2.in' }, 0.5)
      // 2) a íris inteira na tela: a câmera desacelera para mostrar os detalhes
      .fromTo('.story--2 > span', { autoAlpha: 0, yPercent: 60, filter: 'blur(6px)' }, { autoAlpha: 1, yPercent: 0, filter: 'blur(0px)', duration: 0.05, stagger: 0.015, ease: 'power3.out', immediateRender: false }, 0.64)
      .to('.story--2 > span', { autoAlpha: 0, yPercent: -40, filter: 'blur(6px)', duration: 0.04, stagger: 0.01, ease: 'power2.in' }, 0.76)
      // 3) dentro da pupila: a escuridão vira o visor de uma câmera gravando
      .fromTo(darkEl, { opacity: 0 }, { opacity: 1, duration: 0.1, immediateRender: false }, 0.86)
      .fromTo('.viewfinder', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.05, immediateRender: false }, 0.89)
      .fromTo('.vf__c', { scale: 1.6, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.05, ease: 'power3.out', immediateRender: false }, 0.89)
      .fromTo('.vf__focus', { scale: 2.2, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.04, ease: 'power3.out', immediateRender: false }, 0.91)
      .fromTo('.vf__text', { autoAlpha: 0, y: 30, filter: 'blur(8px)' }, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.05, ease: 'power3.out', immediateRender: false }, 0.92)
      .set({}, {}, 1);

    // câmera: o olho inteiro → a íris ocupando a tela (devagar) → dentro da pupila
    // o zoom é calculado pelo tamanho da íris na tela, então funciona igual no celular e no desktop
    const lz = (k) => () => Math.log(eye.ok ? eye.zoomFor(k) : 1);
    tl.to(zl, { v: Math.log(1.3), duration: 0.2, ease: 'power1.in', onUpdate: applyZoom }, 0.13)
      .to(zl, { v: lz(0.46), duration: 0.29, ease: 'sine.inOut', onUpdate: applyZoom }, 0.33)
      .to(zl, { v: lz(0.95), duration: 0.16, ease: 'none', onUpdate: applyZoom }, 0.62)
      .to(zl, { v: lz(12), duration: 0.1, ease: 'power2.in', onUpdate: applyZoom }, 0.78)
      .to(eyeState, { lerp: 0.35, duration: 0.2, ease: 'power1.in' }, 0.13)
      .to(eyeState, { lerp: 1, duration: 0.29, ease: 'sine.inOut' }, 0.33)
      .to(eyeState, { rot: 0.05, duration: 0.55 }, 0.33)
      .to(eyeState, { dilate: 1, duration: 0.14, ease: 'power1.in' }, 0.74)
      .to(eyeState, { blur: 1, duration: 0.1, ease: 'power2.in' }, 0.78)
      .to(eyeState, { deep: 1, duration: 0.08 }, 0.82);

    // sem WebGL: o olho em CSS faz o mesmo mergulho
    gsap.set('.fb-eye', { x: 0, y: 0, xPercent: -50, yPercent: -50 });
    tl.to('.fb-eye', { scale: 1.3, duration: 0.2, ease: 'power1.in' }, 0.13)
      .to('.fb-eye', { scale: 4, duration: 0.45, ease: 'sine.inOut' }, 0.33)
      .to('.fb-eye', { scale: 30, duration: 0.1, ease: 'power2.in' }, 0.78);
  }

  /* ========================================================================
     HERO: palavra animada no subtítulo (e o olho acompanha)
     ======================================================================== */
  function heroCycle() {
    const words = $$('.cycle em');
    if (words.length < 2 || reduced) return;
    let i = 0;
    setInterval(() => {
      if (document.hidden || window.scrollY > heroEl.offsetHeight * 0.15) return;
      const cur = words[i];
      i = (i + 1) % words.length;
      const next = words[i];
      cur.classList.remove('is-active');
      cur.classList.add('is-leaving');
      next.classList.remove('is-leaving');
      next.classList.add('is-active');
      setTimeout(() => cur.classList.remove('is-leaving'), 800);
      if (eyeOK && eyeState.zoom < 1.05) {
        const wide = window.innerWidth > window.innerHeight;
        eye.glance(wide ? -0.8 : 0, wide ? -0.35 : -0.7, 950);
      }
    }, 2600);
  }

  /* ========================================================================
     TEXTO: divisão em palavras
     ======================================================================== */
  function splitWords(el, wrap) {
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === 3) {
          const parts = child.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          parts.forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(' '));
            else frag.appendChild(wrap(part));
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          walk(child);
        }
      });
    };
    walk(el);
  }

  const maskWord = (text) => {
    const outer = document.createElement('span');
    outer.className = 'sw';
    const inner = document.createElement('span');
    inner.className = 'sw__i';
    inner.textContent = text;
    outer.appendChild(inner);
    return outer;
  };

  const plainWord = (text) => {
    const s = document.createElement('span');
    s.className = 'mw';
    s.textContent = text;
    return s;
  };

  /* ========================================================================
     REVELAÇÕES POR SEÇÃO (criadas na ordem da página)
     ======================================================================== */
  function reveals(scope, triggerOverride) {
    $$('[data-split]', scope).forEach((el) => {
      splitWords(el, maskWord);
      gsap.from($$('.sw__i', el), {
        yPercent: 115,
        duration: 1.1,
        stagger: 0.05,
        ease: 'expo.out',
        scrollTrigger: { trigger: triggerOverride || el, start: triggerOverride ? 'top 70%' : 'top 86%', once: true },
      });
    });
    $$('[data-reveal]', scope).forEach((el) => {
      gsap.from(el, {
        y: 34,
        autoAlpha: 0,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: { trigger: triggerOverride || el, start: triggerOverride ? 'top 70%' : 'top 90%', once: true },
      });
    });
    $$('[data-reveal-group]', scope).forEach((group) => {
      gsap.from(group.children, {
        y: 40,
        autoAlpha: 0,
        duration: 1,
        stagger: 0.1,
        ease: 'power3.out',
        scrollTrigger: { trigger: group, start: 'top 86%', once: true },
      });
    });
  }

  function manifesto() {
    const text = $('.manifesto__text');
    if (!text) return;
    splitWords(text, plainWord);
    if (!hasGSAP || reduced) return;
    gsap.fromTo($$('.mw', text), { opacity: 0.14 }, {
      opacity: 1,
      stagger: 0.08,
      ease: 'none',
      scrollTrigger: { trigger: text, start: 'top 80%', end: 'bottom 45%', scrub: 0.6 },
    });
  }

  function services() {
    $$('[data-glow]').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - r.left}px`);
        card.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });
    if (!hasGSAP || reduced) return;
    const grid = $('.services__grid');
    gsap.fromTo($$('.card__icon svg *', grid), { strokeDashoffset: 1 }, {
      strokeDashoffset: 0,
      duration: 1.6,
      stagger: 0.08,
      ease: 'power2.out',
      scrollTrigger: { trigger: grid, start: 'top 82%', once: true },
    });
  }

  function marquee() {
    if (!hasGSAP || reduced) return;
    const track = $('.marquee__track');
    if (!track) return;
    const loop = gsap.to(track, { xPercent: -50, ease: 'none', duration: 36, repeat: -1 });
    let boost = 0;
    ScrollTrigger.create({
      trigger: '.brands',
      start: 'top bottom',
      end: 'bottom top',
      onToggle: (self) => (self.isActive ? loop.play() : loop.pause()),
      onUpdate: (self) => { boost = Math.min(Math.abs(self.getVelocity()) / 260, 5); },
    });
    gsap.ticker.add(() => {
      if (boost < 0.01 && loop.timeScale() === 1) return;
      boost *= 0.92;
      loop.timeScale(1 + boost);
    });
  }

  /* ========================================================================
     PORTFÓLIO: carrossel horizontal + vídeos + lightbox
     ======================================================================== */
  const work = $('.work');
  const reelButtons = $$('.reel__phone');
  const reelVideos = reelButtons.map((b) => $('video', b));
  let lightboxOpen = false;

  function workScroll() {
    if (!hasGSAP || reduced) return;
    const track = $('.work__track');
    const media = gsap.matchMedia();
    media.add('(min-width: 1024px)', () => {
      work.classList.add('work--h');
      const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
      const tween = gsap.to(track, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: work,
          start: 'top top',
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
          refreshPriority: 1,
          anticipatePin: 1,
        },
      });
      ScrollTrigger.sort();
      // teclado: ao focar um vídeo fora da tela, rola até ele
      const onFocus = (e) => {
        const card = e.target.closest('.reel');
        const st = tween.scrollTrigger;
        const dist = distance();
        if (!card || !st || !dist) return;
        const x = clamp(card.offsetLeft + card.offsetWidth / 2 - window.innerWidth / 2, 0, dist);
        const y = st.start + (x / dist) * (st.end - st.start);
        if (lenis) lenis.scrollTo(y, { immediate: true });
        else window.scrollTo(0, y);
      };
      track.addEventListener('focusin', onFocus);
      return () => {
        track.removeEventListener('focusin', onFocus);
        work.classList.remove('work--h');
        gsap.set(track, { clearProps: 'transform' });
      };
    });
  }

  function videoAutoplay() {
    const saveData = !!(navigator.connection && navigator.connection.saveData);
    const autoplay = !reduced && !saveData && 'IntersectionObserver' in window;
    const MAX_PLAYING = 2;
    const ratios = new Map();

    reelVideos.forEach((v) => {
      v.muted = true;
      const reel = v.closest('.reel');
      reel.classList.add('is-paused');
      v.addEventListener('playing', () => reel.classList.remove('is-paused'));
      v.addEventListener('pause', () => reel.classList.add('is-paused'));
    });

    if (!autoplay) return () => {};

    const tryPlay = (v) => {
      if (!v.paused) return;
      v.closest('.reel').classList.remove('is-paused'); // evita piscar o ícone enquanto carrega
      const p = v.play();
      if (p && typeof p.catch === 'function') p.catch(() => v.closest('.reel').classList.add('is-paused'));
    };

    const update = () => {
      const chosen = reelVideos
        .filter((v) => (ratios.get(v) || 0) >= 0.5)
        .sort((a, b) => ratios.get(b) - ratios.get(a))
        .slice(0, MAX_PLAYING);
      reelVideos.forEach((v) => {
        if (!lightboxOpen && !document.hidden && chosen.includes(v)) tryPlay(v);
        else if (!v.paused) v.pause();
      });
    };

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => ratios.set(e.target, e.isIntersecting ? e.intersectionRatio : 0));
      update();
    }, { threshold: [0, 0.25, 0.5, 0.75, 1] });
    reelVideos.forEach((v) => io.observe(v));
    document.addEventListener('visibilitychange', update);
    return update;
  }

  function lightbox(refreshAutoplay) {
    const dlg = $('.lightbox');
    const video = $('.lightbox__video');
    if (!dlg || !video) return;
    const canMp4 = !!video.canPlayType('video/mp4; codecs="avc1.640028, mp4a.40.2"');
    const items = reelButtons.map((btn) => {
      const reel = btn.closest('.reel');
      const sources = $$('source', btn);
      const pick = sources.find((s) => (canMp4 ? s.type === 'video/mp4' : s.type === 'video/webm')) || sources[0];
      return {
        src: pick.getAttribute('src'),
        poster: $('video', btn).getAttribute('poster'),
        title: $('.reel__meta h3', reel).textContent,
        client: $('.reel__meta p', reel).textContent,
        chip: $('.reel__meta .chip', reel).textContent,
      };
    });
    let index = 0;
    let opener = null;

    const load = (i) => {
      index = (i + items.length) % items.length;
      const it = items[index];
      video.pause();
      video.poster = it.poster;
      video.src = it.src;
      video.muted = false;
      $('#lightbox-title').textContent = it.title;
      $('.lightbox__client').textContent = it.client;
      $('.lightbox__chip').textContent = it.chip;
      const p = video.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    };

    const open = (i, btn) => {
      const it = items[i];
      if (typeof dlg.showModal !== 'function') {
        window.open(it.src, '_blank', 'noopener');
        return;
      }
      opener = btn;
      lightboxOpen = true;
      refreshAutoplay();
      lockScroll();
      dlg.showModal();
      load(i);
    };

    dlg.addEventListener('close', () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
      lightboxOpen = false;
      unlockScroll();
      refreshAutoplay();
      if (opener) opener.focus({ preventScroll: true });
    });
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg || e.target.classList.contains('lightbox__body')) dlg.close();
      const action = e.target.closest('[data-lb]');
      if (!action) return;
      const a = action.getAttribute('data-lb');
      if (a === 'close') dlg.close();
      if (a === 'prev') load(index - 1);
      if (a === 'next') load(index + 1);
    });
    dlg.addEventListener('keydown', (e) => {
      if (e.target === video) return; // setas controlam o vídeo quando ele está focado
      if (e.key === 'ArrowRight') { e.preventDefault(); load(index + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); load(index - 1); }
    });

    reelButtons.forEach((btn, i) => btn.addEventListener('click', () => open(i, btn)));
  }

  /* ========================================================================
     PROCESSO, SOBRE, DEPOIMENTOS
     ======================================================================== */
  function processLine() {
    const steps = $$('.step');
    if (!hasGSAP || reduced) {
      steps.forEach((s) => s.classList.add('is-active'));
      return;
    }
    gsap.fromTo('.steps__line-fg', { strokeDashoffset: 1 }, {
      strokeDashoffset: 0,
      ease: 'none',
      scrollTrigger: { trigger: '.steps', start: 'top 62%', end: 'bottom 62%', scrub: 0.6 },
    });
    steps.forEach((step) => {
      ScrollTrigger.create({
        trigger: step,
        start: 'top 62%',
        onEnter: () => step.classList.add('is-active'),
        onLeaveBack: () => step.classList.remove('is-active'),
      });
      gsap.from(step, {
        x: 30,
        autoAlpha: 0,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: { trigger: step, start: 'top 85%', once: true },
      });
    });
  }

  function aboutParallax() {
    if (!hasGSAP || reduced) return;
    $$('[data-parallax]').forEach((el) => {
      const v = parseFloat(el.getAttribute('data-parallax')) || 0;
      gsap.fromTo(el, { yPercent: -v / 2 }, {
        yPercent: v / 2,
        ease: 'none',
        scrollTrigger: { trigger: '.about', start: 'top bottom', end: 'bottom top', scrub: true },
      });
      const img = $('img', el);
      if (img) {
        gsap.fromTo(img, { scale: 1.15 }, {
          scale: 1,
          ease: 'none',
          scrollTrigger: { trigger: '.about', start: 'top bottom', end: 'bottom top', scrub: true },
        });
      }
    });
    gsap.from('.about__badge', {
      scale: 0,
      rotate: -40,
      duration: 1,
      ease: 'back.out(1.8)',
      scrollTrigger: { trigger: '.about__media', start: 'top 70%', once: true },
    });
  }

  function testimonials() {
    const section = $('#depoimentos');
    if (!section || !TESTIMONIALS.length) return;
    const grid = $('.testimonials__grid', section);
    TESTIMONIALS.forEach((t) => {
      const fig = document.createElement('figure');
      fig.className = 'testimonial';
      const q = document.createElement('blockquote');
      q.textContent = `“${t.quote}”`;
      const cap = document.createElement('figcaption');
      const name = document.createElement('strong');
      name.textContent = t.name;
      cap.appendChild(name);
      cap.appendChild(document.createTextNode(t.role || ''));
      fig.appendChild(q);
      fig.appendChild(cap);
      grid.appendChild(fig);
    });
    section.hidden = false;
  }

  /* ========================================================================
     FAQ
     ======================================================================== */
  function faq() {
    let refreshTimer = 0;
    const setOpen = (item, open) => {
      item.classList.toggle('is-open', open);
      $('.faq__q', item).setAttribute('aria-expanded', String(open));
    };
    $$('.faq__q').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.faq__item');
        const open = !item.classList.contains('is-open');
        $$('.faq__item.is-open').forEach((other) => { if (other !== item) setOpen(other, false); });
        setOpen(item, open);
        if (hasGSAP) {
          clearTimeout(refreshTimer);
          refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 560);
        }
      });
    });
  }

  /* ========================================================================
     FORMULÁRIO → WhatsApp
     ======================================================================== */
  function form() {
    const f = $('#lead-form');
    if (!f) return;
    const status = $('.form__status', f);
    const phone = $('#f-whats', f);
    let prevDigits = '';

    const mask = (d) => {
      if (!d) return '';
      if (d.length < 3) return `(${d}`;
      const ddd = d.slice(0, 2);
      const rest = d.slice(2);
      if (rest.length <= 4) return `(${ddd}) ${rest}`;
      if (d.length <= 10) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
      return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
    };
    phone.addEventListener('input', (e) => {
      let d = phone.value.replace(/\D/g, '').slice(0, 11);
      if (e.inputType && e.inputType.indexOf('delete') === 0 && d === prevDigits) d = d.slice(0, -1);
      prevDigits = d;
      phone.value = mask(d);
    });

    const rules = {
      nome: { el: $('#f-nome', f), err: $('#f-nome-err', f), test: (v) => v.trim().length >= 2, msg: 'Digite seu nome.' },
      whatsapp: { el: phone, err: $('#f-whats-err', f), test: (v) => /^\d{10,11}$/.test(v.replace(/\D/g, '')), msg: 'Digite um WhatsApp válido, com DDD.' },
      segmento: { el: $('#f-seg', f), err: $('#f-seg-err', f), test: (v) => !!v, msg: 'Escolha o segmento da sua marca.' },
    };
    const interestErr = $('#f-int-err', f);
    const interests = () => $$('input[name="interesse"]:checked', f).map((i) => i.value);

    const validateField = (key) => {
      const r = rules[key];
      const ok = r.test(r.el.value);
      r.el.setAttribute('aria-invalid', String(!ok));
      r.err.textContent = ok ? '' : r.msg;
      return ok;
    };
    const validateInterests = () => {
      const ok = interests().length > 0;
      interestErr.textContent = ok ? '' : 'Escolha pelo menos uma opção.';
      return ok;
    };

    Object.keys(rules).forEach((key) => {
      const r = rules[key];
      r.el.addEventListener('blur', () => { if (r.el.value) validateField(key); });
      r.el.addEventListener('input', () => { if (r.el.getAttribute('aria-invalid') === 'true') validateField(key); });
      r.el.addEventListener('change', () => { if (r.el.getAttribute('aria-invalid') === 'true') validateField(key); });
    });
    $$('input[name="interesse"]', f).forEach((i) => i.addEventListener('change', () => { if (interestErr.textContent) validateInterests(); }));

    const setStatus = (type, text, link, linkText) => {
      status.className = `form__status${type ? ` is-${type}` : ''}`;
      status.textContent = text;
      if (link) {
        status.appendChild(document.createTextNode(' '));
        const a = document.createElement('a');
        a.href = link;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = linkText || 'Abrir o WhatsApp';
        status.appendChild(a);
      }
    };

    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const results = Object.keys(rules).map(validateField);
      const okInterests = validateInterests();
      if (results.includes(false) || !okInterests) {
        setStatus('error', 'Confira os campos destacados.');
        const firstKey = Object.keys(rules).find((k) => rules[k].el.getAttribute('aria-invalid') === 'true');
        if (firstKey) rules[firstKey].el.focus();
        else $('input[name="interesse"]', f).focus();
        return;
      }

      const data = {
        nome: rules.nome.el.value.trim(),
        whatsapp: phone.value,
        segmento: rules.segmento.el.value,
        interesse: interests().join(', '),
        mensagem: $('#f-msg', f).value.trim(),
      };
      const lines = [
        'Oi, Ingrid! Vim pelo seu site ✦',
        '',
        `*Nome:* ${data.nome}`,
        `*WhatsApp:* ${data.whatsapp}`,
        `*Segmento:* ${data.segmento}`,
        `*Interesse:* ${data.interesse}`,
      ];
      if (data.mensagem) lines.push(`*Mensagem:* ${data.mensagem}`);
      const url = waURL(lines.join('\n'));

      f.classList.add('is-loading');
      setStatus('', 'Preparando sua mensagem…');

      // abre na mesma interação do clique para não ser bloqueado como pop-up
      const win = window.open(url, '_blank');
      if (win) { try { win.opener = null; } catch (err) { /* sem acesso */ } }

      if (CONFIG.formEndpoint) {
        try {
          fetch(CONFIG.formEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            keepalive: true,
          }).catch(() => {});
        } catch (err) { /* envio opcional */ }
      }

      setTimeout(() => {
        f.classList.remove('is-loading');
        if (win) {
          setStatus('success', 'Prontinho! Sua mensagem foi aberta no WhatsApp. Se não abriu,', url, 'toque aqui.');
          f.reset();
          prevDigits = '';
          Object.keys(rules).forEach((k) => rules[k].el.removeAttribute('aria-invalid'));
        } else {
          setStatus('error', 'Seu navegador bloqueou a nova aba.', url);
        }
      }, 700);
    });
  }

  /* ========================================================================
     NAVEGAÇÃO, MENU MOBILE, ÂNCORAS
     ======================================================================== */
  const nav = $('[data-nav]');
  const toggle = $('.nav__toggle');
  const menu = $('#menu-mobile');
  let menuOpen = false;

  function setMenu(open) {
    if (open === menuOpen) return;
    menuOpen = open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    nav.classList.remove('is-hidden');
    if (open) {
      menu.hidden = false;
      lockScroll();
      if (hasGSAP && !reduced) {
        gsap.fromTo(menu, { clipPath: 'circle(0% at 92% 4%)' }, { clipPath: 'circle(150% at 92% 4%)', duration: 0.75, ease: 'power3.inOut' });
        gsap.fromTo($$('a', menu), { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, stagger: 0.05, delay: 0.25, ease: 'power3.out' });
      }
    } else {
      const done = () => { menu.hidden = true; };
      unlockScroll();
      if (hasGSAP && !reduced) {
        gsap.to(menu, { clipPath: 'circle(0% at 92% 4%)', duration: 0.5, ease: 'power3.inOut', onComplete: done });
      } else done();
    }
  }

  function navigation() {
    toggle.addEventListener('click', () => setMenu(!menuOpen));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menuOpen) { setMenu(false); toggle.focus(); }
      if (e.key === 'Tab' && menuOpen) {
        const items = [toggle, ...$$('a', menu)];
        const i = items.indexOf(document.activeElement);
        if (e.shiftKey && (i === 0 || i === -1)) { e.preventDefault(); items[items.length - 1].focus(); }
        else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
      }
    });
    window.addEventListener('resize', () => { if (menuOpen && window.innerWidth > 900) setMenu(false); });

    // âncoras com rolagem suave
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = id === '#topo' ? document.body : $(id);
      if (!target) return;
      e.preventDefault();
      const wasOpen = menuOpen;
      if (menuOpen) setMenu(false);
      const go = () => {
        const focusTarget = () => {
          const el = id === '#topo' ? $('.nav__logo') : target;
          if (id !== '#topo' && !el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
          el.focus({ preventScroll: true });
        };
        if (lenis) {
          lenis.scrollTo(id === '#topo' ? 0 : target, { duration: 1.6, onComplete: focusTarget });
        } else {
          if (id === '#topo') window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
          else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
          focusTarget();
        }
        if (history.replaceState) history.replaceState(null, '', id === '#topo' ? location.pathname : id);
      };
      if (wasOpen) setTimeout(go, 60); else go();
    });
  }

  /* ========================================================================
     ROLAGEM: nav, barra de progresso, WhatsApp flutuante
     ======================================================================== */
  function scrollUI() {
    const bar = $('.progress span');
    const wa = $('.wa-float');
    const contact = $('#contato');
    let lastY = window.scrollY;
    let contactVisible = false;
    let ticking = false;

    if ('IntersectionObserver' in window && contact) {
      new IntersectionObserver(([en]) => { contactVisible = en.isIntersecting; onScroll(); }, { threshold: 0.15 }).observe(contact);
    }

    const update = () => {
      ticking = false;
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? clamp(y / max, 0, 1) : 0})`;

      nav.classList.toggle('is-scrolled', y > 30);
      const focusInNav = nav.contains(document.activeElement) && document.activeElement !== document.body;
      if (!menuOpen && !focusInNav && y > lastY + 4 && y > 240) nav.classList.add('is-hidden');
      else if (y < lastY - 4 || y < 240) nav.classList.remove('is-hidden');
      lastY = y;

      const heroEnd = heroEl.offsetTop + heroEl.offsetHeight - window.innerHeight * 0.6;
      wa.classList.toggle('is-visible', y > heroEnd && !contactVisible && !menuOpen);
    };
    const onScroll = () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    nav.addEventListener('focusin', () => nav.classList.remove('is-hidden'));
    update();
  }

  /* ========================================================================
     CURSOR + BOTÕES MAGNÉTICOS
     ======================================================================== */
  function pointerFX() {
    if (!finePointer || reduced || !hasGSAP) return;
    const cursor = $('.cursor');
    root.classList.add('has-cursor');
    gsap.set(cursor, { x: -100, y: -100 });
    const cursorLabel = $('.cursor__label', cursor);
    const xTo = gsap.quickTo(cursor, 'x', { duration: 0.35, ease: 'power3.out' });
    const yTo = gsap.quickTo(cursor, 'y', { duration: 0.35, ease: 'power3.out' });
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      xTo(e.clientX);
      yTo(e.clientY);
      cursor.classList.remove('is-hidden');
    }, { passive: true });
    document.addEventListener('pointerover', (e) => {
      const tag = e.target.closest('[data-cursor]');
      const kind = tag ? tag.getAttribute('data-cursor') : '';
      const link = !tag && e.target.closest('a, button, label, input, select, textarea');
      cursor.classList.toggle('is-play', kind === 'play');
      cursor.classList.toggle('is-focus', kind === 'focus' && eyeState.zoom < 1.05);
      cursor.classList.toggle('is-link', !!link);
      if (kind) cursorLabel.textContent = kind === 'focus' ? 'Foco' : 'Play';
    });
    document.documentElement.addEventListener('pointerleave', () => cursor.classList.add('is-hidden'));

    $$('[data-magnetic]').forEach((el) => {
      const xm = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
      const ym = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        xm((e.clientX - (r.left + r.width / 2)) * 0.28);
        ym((e.clientY - (r.top + r.height / 2)) * 0.38);
      });
      el.addEventListener('pointerleave', () => { xm(0); ym(0); });
    });
  }

  /* ========================================================================
     INICIALIZAÇÃO (na ordem da página)
     ======================================================================== */
  const refreshAutoplay = videoAutoplay();
  lightbox(refreshAutoplay);
  testimonials();
  faq();
  form();
  navigation();
  scrollUI();

  heroCycle();
  heroTapFocus();
  if (hasGSAP && !reduced) {
    heroScroll();
    manifesto();
    reveals($('.manifesto'));
    reveals($('.services'));
    services();
    marquee();
    reveals($('.work'), work);
    workScroll();
    reveals($('.process'));
    processLine();
    reveals($('.deliver'));
    reveals($('.about'));
    aboutParallax();
    reveals($('.faq'));
    reveals($('.contact'));
    pointerFX();
    ScrollTrigger.sort();
  } else {
    manifesto();
    services();
    processLine();
  }

  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    intro();
    if (hasGSAP) ScrollTrigger.refresh();
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.all([
    Promise.race([fontsReady, wait(1200)]),
    Promise.race([heroReady, wait(3200)]),
  ]).then(start, start);
  window.addEventListener('load', () => { if (hasGSAP) ScrollTrigger.refresh(); });
})();
