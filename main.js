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
     HERO EM WEBGL: olho semi-realista com delineado Cleópatra, desenhado por código
     ======================================================================== */
  // Estilo do olho (cores em RGB, de 0 a 1). O painel "✦" do hero troca a íris, a sombra e a maquiagem.
  const EYE_STYLE = {
    kit: true, // false esconde o painel "✦ Brinque com o olhar"
    makeup: 1, // 0 = sem maquiagem, 1 = maquiagem completa
    iris: 'castanho', // cor inicial da íris (uma das chaves de `irises`)
    shadow: 'bronze', // cor inicial da sombra (uma das chaves de `shadows`)
    irises: {
      castanho: { name: 'Castanho', dark: [0.15, 0.07, 0.035], mid: [0.42, 0.21, 0.08], light: [0.9, 0.6, 0.27] },
      mel: { name: 'Mel', dark: [0.28, 0.14, 0.04], mid: [0.64, 0.38, 0.11], light: [0.98, 0.79, 0.38] },
      verde: { name: 'Verde', dark: [0.07, 0.15, 0.08], mid: [0.24, 0.43, 0.2], light: [0.72, 0.82, 0.4] },
      azul: { name: 'Azul', dark: [0.05, 0.1, 0.24], mid: [0.17, 0.36, 0.64], light: [0.56, 0.82, 0.96] },
    },
    shadows: {
      bronze: { name: 'Bronze', color: [0.72, 0.44, 0.28] },
      dourado: { name: 'Dourado', color: [0.9, 0.66, 0.32] },
      rose: { name: 'Rosé', color: [0.85, 0.5, 0.52] },
    },
  };

  const eyeState = { zoom: 1, rot: 0, blur: 0, lerp: 0, dilate: 0, deep: 0, open: reduced || !hasGSAP ? 1 : 0, defocus: reduced || !hasGSAP ? 0 : 1 };
  const IRIS_R = 0.47; // raio da íris em unidades do olho (o olho vai de -1 a 1 na horizontal)
  const LOOK = { x: 0.2, y: 0.08 }; // quanto a íris anda para os lados e para cima/baixo
  const WING = { x: 1.48, y: 0.31 }; // ponta do gatinho do delineado

  const VERT = 'attribute vec2 aPos;void main(){gl_Position=vec4(aPos,0.0,1.0);}';

  const HASH = `
float hash(vec2 p){vec3 p3=fract(vec3(p.xyx)*0.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}`;

  const EYE_FRAG = `precision highp float;
uniform vec2 uRes;uniform float uTime;uniform float uZoom;uniform float uOpen;uniform float uRot;
uniform float uScale;uniform float uLerp;uniform float uDilate;uniform float uDeep;uniform float uMaxOct;
uniform vec2 uLook;uniform vec2 uCenter;
uniform float uSquint;uniform float uBrow;uniform float uSquash;uniform float uMakeup;
uniform vec3 uIrisDark;uniform vec3 uIrisMid;uniform vec3 uIrisLight;uniform vec3 uShadow;
const vec3 BG=vec3(0.027,0.043,0.086);
const float R=${IRIS_R.toFixed(3)};
const vec2 LOOK=vec2(${LOOK.x.toFixed(3)},${LOOK.y.toFixed(3)});
const vec2 WING=vec2(${WING.x.toFixed(3)},${WING.y.toFixed(3)});
/* paleta fixa: pele (no tom da Ingrid), linha dos cílios, delineado, cílios, sobrancelha e esclera */
const vec3 SKIN=vec3(0.8,0.56,0.45);
const vec3 SKIN_DEEP=vec3(0.56,0.33,0.27);
const vec3 LASHLINE=vec3(0.13,0.075,0.06);
const vec3 LINER=vec3(0.028,0.02,0.024);
const vec3 LASH=vec3(0.022,0.016,0.015);
const vec3 BROW=vec3(0.15,0.095,0.068);
const vec3 SCLERA=vec3(0.95,0.92,0.88);
const vec3 GOLD=vec3(1.0,0.84,0.54);
/* luz principal no alto à esquerda (uma janela grande) e um rebatedor frio embaixo à direita */
const vec3 LK=vec3(-0.45,0.6,0.66);
const vec3 LF=vec3(0.6,-0.3,0.74);
const vec3 HV=vec3(-0.25,0.33,0.91);
${HASH}
float inv(float a,float b,float x){return 1.0-smoothstep(a,b,x);}
/* 1 dentro da faixa [a,b], com borda suave de largura aa */
float band(float x,float a,float b,float aa){return smoothstep(a-aa,a+aa,x)*inv(b-aa,b+aa,x);}
/* traço: 1 onde a distância d é menor que a meia-largura w (borda de um pixel) */
float ink(float d,float w,float aa){return inv(w-aa,w+aa,d);}
float dot2(vec2 v){return dot(v,v);}
vec2 rot(vec2 v,float a){float c=cos(a);float s=sin(a);return vec2(c*v.x-s*v.y,s*v.x+c*v.y);}
float smax(float a,float b,float k){float h=max(k-abs(a-b),0.0)/k;return max(a,b)+h*h*k*0.25;}
float sdSeg(vec2 p,vec2 a,vec2 b,out float h){vec2 pa=p-a;vec2 ba=b-a;h=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0);return length(pa-ba*h);}
float noise(vec2 x){vec2 i=floor(x);vec2 f=fract(x);vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),u.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),u.x),u.y);}
float fbm3(vec2 x){float v=0.0;float a=0.5;for(int i=0;i<3;i++){v+=a*noise(x);x=x*2.03+vec2(1.7,9.2);a*=0.5;}return v/0.875;}
/* ruído que se repete em x a cada 'per' células (dá a volta na íris sem emenda) */
float pnoise(vec2 x,float per){vec2 i=floor(x);vec2 f=fract(x);vec2 u=f*f*(3.0-2.0*f);
  float i0=mod(i.x,per);float i1=mod(i.x+1.0,per);
  return mix(mix(hash(vec2(i0,i.y)),hash(vec2(i1,i.y)),u.x),mix(hash(vec2(i0,i.y+1.0)),hash(vec2(i1,i.y+1.0)),u.x),u.y);}
/* fbm periódico com nível de detalhe contínuo: novas oitavas surgem suavemente com o zoom */
float pfbm(vec2 x,float per,float oct){float v=0.0;float a=0.5;float n=0.0;
  for(int k=0;k<8;k++){float w=clamp(oct-float(k),0.0,1.0);if(w<=0.0)break;
    v+=a*w*pnoise(x,per);n+=a*w;x*=2.0;x.y+=17.31;per*=2.0;a*=0.5;}
  return n>0.0?v/n:0.5;}
/* distância até uma curva de Bézier quadrática (x) e a posição na curva, de 0 a 1 (y) */
vec2 sdBez(vec2 pos,vec2 A,vec2 B,vec2 C){
  vec2 a=B-A;vec2 b=A-2.0*B+C;vec2 c=a*2.0;vec2 d=A-pos;
  float kk=1.0/dot(b,b);
  float kx=kk*dot(a,b);
  float ky=kk*(2.0*dot(a,a)+dot(d,b))/3.0;
  float kz=kk*dot(d,a);
  float p=ky-kx*kx;
  float q=kx*(2.0*kx*kx-3.0*ky)+kz;
  float h=q*q+4.0*p*p*p;
  float res;float t;
  if(h>=0.0){
    h=sqrt(h);
    vec2 x=(vec2(h,-h)-q)/2.0;
    vec2 uv=sign(x)*pow(abs(x),vec2(1.0/3.0));
    t=clamp(uv.x+uv.y-kx,0.0,1.0);
    res=dot2(d+(c+b*t)*t);
  }else{
    float z=sqrt(-p);
    float v=acos(clamp(q/(p*z*2.0),-1.0,1.0))/3.0;
    float m=cos(v);float n=sin(v)*1.732050808;
    vec3 tt=clamp(vec3(m+m,-n-m,n-m)*z-kx,0.0,1.0);
    float d1=dot2(d+(c+b*tt.x)*tt.x);
    float d2=dot2(d+(c+b*tt.y)*tt.y);
    if(d1<d2){res=d1;t=tt.x;}else{res=d2;t=tt.y;}
  }
  return vec2(sqrt(res),t);
}

/* pálpebras abertas: amêndoa com o canto externo erguido (x = -1 canto interno, 1 canto externo) */
void lidsOpen(float x,out float top,out float bot){
  float ax=clamp(1.0-x*x,0.0,1.0);
  top=0.47*pow(ax,0.9)*(1.0-0.16*x)+0.07*x+uLook.y*0.05*ax;
  bot=-0.33*pow(ax,1.2)*(1.0+0.12*x)+0.05*x+uLook.y*0.015*ax;
}
/* pálpebras de agora: piscar (uOpen; acima de 1 = arregalado) e semicerrar (uSquint) */
void lids(float x,out float top,out float bot){
  float ax=clamp(1.0-x*x,0.0,1.0);
  float tO;float bO;lidsOpen(x,tO,bO);
  bO+=uSquint*0.12*pow(ax,1.4)*(1.0+0.35*x);
  tO-=uSquint*0.06*ax;
  bot=mix(bO*0.8+0.012*ax,bO,clamp(uOpen,0.0,1.0))-max(uOpen-1.0,0.0)*0.1*ax;
  top=mix(bot+0.004,tO,uOpen);
}
/* espessura do delineado: em cima (fino no canto interno, grosso no externo) e embaixo */
float thUp(float x){
  float nat=0.009*(0.55+0.45*clamp(1.0-x*x,0.0,1.0));
  return mix(nat,mix(0.007,0.034,smoothstep(-0.9,0.8,x)),uMakeup);
}
float thLow(float x){return 0.003+0.01*smoothstep(0.0,0.85,x)*uMakeup;}
/* vinco da pálpebra: fica parado quando o olho fecha (a pálpebra estica e leva a sombra junto) */
float creaseY(float x){
  float k=1.0-x*x/1.49;
  float axc=0.5*(k+sqrt(k*k+0.004)); // sem quina onde o vinco termina (a luz não quebra ali)
  return 0.06+0.06*x+0.53*pow(axc,0.85)*(1.0-0.12*x)+uLook.y*0.04*axc;
}

/* íris realista (q em unidades do raio da íris): estroma em feixes e fibras com relevo, colarete em
   zigue-zague, criptas, sulcos de contração, sardinhas de pigmento e anel limbal. As cores vêm do
   painel ✦ e os detalhes finos surgem conforme a câmera se aproxima (lod). */
vec3 iris(vec2 q,float r,float pr,float lod,float aa){
  float u=clamp((r-pr)/(1.0-pr),0.0,1.0);
  float t=atan(q.y,q.x+0.000001)/6.2831853+0.5;
  vec2 td=vec2(-q.y,q.x)/max(r,0.0001);
  vec3 cD=uIrisDark;vec3 cM=uIrisMid;vec3 cL=uIrisLight;
  /* as fibras saem da pupila ondulando um pouco, como fios de seda */
  float tw=t+0.007*(pnoise(vec2(t*20.0,u*4.0),20.0)-0.5)+0.003*(pnoise(vec2(t*80.0,u*12.0+2.0),80.0)-0.5);
  /* feixes largos, fibras claras (trabéculas) e fios bem finos */
  float f0=pfbm(vec2(tw*40.0,u*1.7),40.0,lod);
  float ff=pfbm(vec2(tw*150.0,u*2.6+5.0),150.0,lod-1.0);
  float fil=pow(1.0-abs(2.0*ff-1.0),3.0);
  float fine=pfbm(vec2(tw*224.0,u*8.0+5.0),224.0,lod-2.0);
  /* relevo: compara as fibras com a vizinha de lado (um pixel) e ilumina pela luz do alto à esquerda */
  float dt=1.3*aa/(6.2831853*max(r,0.25));
  float ff1=pfbm(vec2((tw+dt)*150.0,u*2.6+5.0),150.0,lod-1.0);
  float fil1=pow(1.0-abs(2.0*ff1-1.0),3.0);
  float relief=clamp(-(fil1-fil)/max(dt*150.0,0.0001)*0.05*dot(td,vec2(-0.65,0.76)),-1.0,1.0);
  /* colarete: a fronteira irregular entre a zona da pupila e o resto da íris */
  float cu=0.33+0.07*(pnoise(vec2(t*8.0,2.0),8.0)-0.5)+0.045*(pnoise(vec2(t*29.0,5.0),29.0)-0.5)+0.015*(pnoise(vec2(t*110.0,8.0),110.0)-0.5);
  float pz=inv(cu-0.03,cu+0.02,u);
  /* zona ciliar: feixes escuros e médios, fibras claras por cima, escurecendo para a borda */
  vec3 col=mix(mix(cD,cM,0.3),cM,smoothstep(0.25,0.8,f0));
  col=mix(col,mix(cM,cL,0.62),fil*(0.5+0.25*f0));
  col*=0.8+0.25*smoothstep(0.3,0.7,ff);
  col=mix(col,cD,smoothstep(0.55,0.97,u)*0.45*(1.0-0.6*fil));
  /* zona da pupila mais clara e quente (o anel dourado em volta da pupila), em raios finos */
  vec3 inner=mix(cM,cL,0.42+0.3*fil)*(0.78+0.4*fine);
  col=mix(col,inner,pz*0.88);
  col=mix(col,mix(cM,cL,0.75),exp(-pow((u-cu-0.07)/0.1,2.0))*0.25*fil);
  col*=0.88+0.2*fine;
  /* fios claros e nítidos de perto */
  if(lod>4.6){
    float st=smoothstep(0.66,0.92,pnoise(vec2(tw*560.0,u*5.0+1.0),560.0))*clamp(lod-4.6,0.0,1.0);
    col=mix(col,cL*1.05,st*0.3*inv(0.1,0.85,u));
  }
  /* criptas de Fuchs: lacunas em forma de lente, compridas no sentido dos raios, de borda clara,
     com fibras passando por cima. Cada célula olha as vizinhas, então nenhuma cripta sai cortada. */
  float zone=smoothstep(cu+0.005,cu+0.06,u)*inv(0.5,0.74,u)+0.6*smoothstep(0.78,0.84,u)*inv(0.89,0.95,u);
  float hole=0.0;float rim=0.0;
  if(zone>0.0){
    vec2 cc=vec2(tw*24.0,u*4.0);vec2 ci=floor(cc);
    for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){
      vec2 g=ci+vec2(float(i),float(j));
      vec2 gk=vec2(mod(g.x,24.0),g.y);
      if(hash(gk+31.0)>0.6)continue;
      vec2 dv=cc-g-vec2(hash(gk+7.0),hash(gk+13.0));
      vec2 dm=vec2(dv.x*6.2831853*r/24.0,dv.y*(1.0-pr)/4.0)/(vec2(0.034,0.085)*(0.6+0.6*hash(gk+3.0)));
      float d=length(vec2(dm.x*(1.0+0.45*dm.y),dm.y));
      hole=max(hole,inv(0.55,1.0,d));
      rim=max(rim,exp(-pow((d-1.08)/0.16,2.0)));
    }
  }
  col=mix(col,col*0.4+cD*0.08,hole*zone*(1.0-0.5*fil));
  col+=cL*0.12*rim*(1.0-hole)*zone;
  /* crista do colarete, clara, com a sombra caindo para fora */
  float ridge=exp(-pow((u-cu)/0.02,2.0));
  col=mix(col,mix(cM,cL,0.8),ridge*0.4*(0.5+0.5*pnoise(vec2(t*34.0,6.0),34.0)));
  col*=1.0-0.14*exp(-pow((u-cu-0.035)/0.022,2.0));
  /* sulcos de contração: arcos curtos e macios na periferia */
  float fur=0.0;
  for(int i=0;i<3;i++){float fi=float(i);
    float uc=0.64+0.1*fi+0.04*(pnoise(vec2(t*12.0,fi*5.0+1.0),12.0)-0.5);
    fur+=exp(-pow((u-uc)/0.03,2.0))*smoothstep(0.45,0.75,pnoise(vec2(t*7.0,fi*3.0),7.0));}
  col*=1.0-0.12*clamp(fur,0.0,1.0);
  /* sardinhas de pigmento, raras e de borda macia */
  float frk=smoothstep(0.86,0.94,pnoise(vec2(t*22.0,u*7.0+13.0),22.0))*band(u,0.32,0.84,0.06);
  col=mix(col,cD*0.55,frk*0.6);
  col*=1.0+0.45*relief;
  /* anel limbal escuro e esfumado, franja escura e enrugada em volta da pupila */
  col=mix(col,cD*0.32,smoothstep(0.76,0.98,u+0.04*(fine-0.5))*0.88);
  float ruff=0.03+0.022*pnoise(vec2(t*90.0,1.0),90.0);
  col=mix(col,cD*0.3,inv(0.0,ruff,u)*0.9);
  /* a íris é côncava: afunda perto da pupila e da borda */
  col*=0.84+0.16*smoothstep(0.0,0.3,u)*inv(0.72,1.0,u);
  /* pupila funda, com borda nítida em qualquer zoom */
  float pe=pr*(1.0+0.014*(pnoise(vec2(t*36.0,3.0),36.0)-0.5));
  vec3 pc=vec3(0.006,0.005,0.008)+vec3(0.03,0.016,0.018)*smoothstep(0.25,1.0,r/pe)*smoothstep(-0.2,1.0,-q.y/pe);
  return mix(col,pc,inv(pe-aa*1.2,pe+aa*1.2,r));
}

/* relevo da pele em volta do olho (altura), usado para iluminar em 3D */
float skinH(vec2 e,float top,float bot,float aa){
  float x=e.x;float ax=clamp(1.0-x*x,0.0,1.0);
  float du=e.y-top;float dl=bot-e.y;
  float cr=creaseY(x);
  float h=0.0;
  /* osso da sobrancelha, maçã do rosto e a órbita mais funda */
  h+=0.2*exp(-pow((e.y-1.02)/0.3,2.0))*inv(0.9,1.8,abs(x+0.05));
  h+=0.12*exp(-pow((e.y+1.0)/0.35,2.0))*smoothstep(-0.9,0.5,x);
  h-=0.13*exp(-dot(e*vec2(0.8,1.35),e*vec2(0.8,1.35)));
  /* pálpebra de cima: abaulada sobre o globo, entrando na dobra do vinco */
  float lidS=du/max(cr-top,0.03);
  float lidX=smoothstep(-1.1,-0.7,x)*inv(1.0,1.3,x);
  h+=0.032*smoothstep(0.0,0.3,lidS)*inv(0.55,1.0,lidS)*step(0.0,du)*lidX;
  h-=0.024*exp(-pow((e.y-cr)/0.03,2.0))*lidX;
  h+=0.026*exp(-pow((e.y-cr-0.08)/0.06,2.0))*lidX;
  /* pálpebra de baixo: um rolinho logo abaixo dos cílios e a olheira mais funda */
  h+=0.018*exp(-pow((dl-0.05)/0.035,2.0))*ax*step(0.0,dl);
  h-=0.03*exp(-pow((dl-0.22)/0.08,2.0))*inv(-0.2,1.0,x)*step(0.0,dl);
  /* textura: poros e linhas finas, só quando a resolução comporta */
  float near=inv(0.0016,0.0045,aa);
  h+=(0.0002+0.0003*exp(-dot(e,e)*1.5))*fbm3(e*90.0);
  h+=0.0002*noise(e*420.0)*near;
  h+=0.00025*(noise(vec2(x*9.0,du*160.0))-0.5)*smoothstep(0.02,0.06,du)*inv(cr-top-0.02,cr-top,du)*ax*near;
  vec2 cf=e-vec2(1.05,0.0);
  h+=0.0004*sin(atan(cf.y,cf.x)*26.0+noise(e*20.0)*3.0)*smoothstep(0.08,0.25,length(cf))*inv(0.3,0.55,length(cf))*step(0.0,cf.x+0.15)*near;
  return h;
}

/* sobrancelha: cheia e arqueada, desenhada fio a fio na direção natural dos pelos */
float browY(float x){
  return 0.86+0.2*exp(-pow((x-0.42)/0.52,2.0))-0.17*smoothstep(0.65,1.4,x)+0.03*smoothstep(-1.2,-0.7,x)
    +uBrow*0.075*(0.5+0.5*smoothstep(-1.0,0.6,x))+uLook.y*0.02;
}
float brow(vec2 e,float aa){
  float x=e.x;
  float th=0.068*pow(inv(-1.05,1.42,x),0.55)+0.01;
  float dy=e.y-browY(x)+0.012*inv(-1.15,-0.75,x);
  float m=inv(th*0.45,th*0.45+0.04,abs(dy))*smoothstep(-1.26,-1.02,x)*inv(1.26,1.42,x);
  if(m<=0.0)return 0.0;
  /* os pelos sobem no começo, deitam no meio e descem na ponta */
  float ang=mix(1.25,0.3,smoothstep(-1.05,-0.5,x))-0.5*smoothstep(0.5,1.2,x);
  vec2 hp=rot(e,-ang);
  float cw=0.0052;float cl=0.09;
  float cov=0.0;
  for(int k=-1;k<=1;k++){
    float j=floor(hp.y/cw)+float(k);
    float sh=hash(vec2(j,3.0));
    float row=floor(hp.x/cl+sh);
    float h1=hash(vec2(j,row));float h2=hash(vec2(j,row+7.0));float h3=hash(vec2(j,row+13.0));
    float t=(hp.x/cl+sh-row-0.5*(0.45-0.4*h1))/(0.55+0.4*h1);
    if(t<0.0||t>1.0)continue;
    float off=(j+0.5+(h2-0.5)*0.8)*cw+(h3-0.5)*0.014*t*t;
    float w=0.003*(1.0-0.7*t)+aa*0.5;
    cov=max(cov,inv(w*0.5,w*0.5+aa,abs(hp.y-off))*(0.55+0.45*h1)*step(0.2,h3+0.4*m));
  }
  /* fios por cima de uma base macia, como sobrancelha penteada e preenchida de leve */
  return clamp(cov*m*0.85+m*0.42,0.0,1.0);
}

/* pele com relevo e luz (difusa macia, um toque de subsurface e brilho úmido), maquiagem leve e sobrancelha.
   Devolve também a normal e a luz local, para o delineado brilhar no mesmo lugar. */
vec3 skin(vec2 e,float top,float bot,float aa,out vec3 n,out float key){
  float x=e.x;
  float ax=clamp(1.0-x*x,0.0,1.0);
  float du=e.y-top;
  float dl=bot-e.y;
  float cr=creaseY(x);
  float s=du/max(cr-top,0.03);
  float side=smoothstep(-0.98,-0.62,x);
  /* acima da linha dos cílios; depois do canto externo a borda fica macia (não há pálpebra ali) */
  float soft=mix(aa,0.05,smoothstep(0.85,1.1,x));
  float above=smoothstep(-soft,soft,du);
  /* normal pelo relevo (diferenças finitas) */
  float eps=max(aa*1.6,0.0016);
  float h0=skinH(e,top,bot,aa);
  float tx;float bx;lids(x+eps,tx,bx);
  float hx=skinH(e+vec2(eps,0.0),tx,bx,aa);
  float hy=skinH(e+vec2(0.0,eps),top,bot,aa);
  n=normalize(vec3(-(hx-h0)/eps,-(hy-h0)/eps,1.0));
  key=exp(-length((e-vec2(-0.1,0.3))*vec2(0.5,0.8))*1.1);
  /* cor da pele: variação suave de tom, região dos olhos um pouco mais funda, poros de perto */
  vec3 alb=SKIN*(0.93+0.1*fbm3(e*4.0));
  alb*=vec3(1.0,0.97+0.05*fbm3(e*9.0+4.0),0.96+0.06*fbm3(e*7.0+1.0));
  float peri=exp(-dot(e*vec2(0.75,1.5),e*vec2(0.75,1.5))*1.4);
  alb=mix(alb,SKIN_DEEP,peri*0.28);
  alb=mix(alb,alb*vec3(1.05,0.9,0.88),smoothstep(0.45,0.85,fbm3(e*5.0+2.0))*0.4);
  alb*=1.0-0.025*smoothstep(0.66,0.94,noise(e*170.0))*inv(0.0018,0.004,aa);
  /* olheira levemente arroxeada e pálpebra um pouco mais rosada */
  alb=mix(alb,alb*vec3(0.86,0.8,0.86),exp(-pow((dl-0.14)/0.08,2.0))*step(0.0,dl)*smoothstep(-0.9,0.1,x)*inv(0.6,1.1,x)*0.5);
  alb=mix(alb,alb*vec3(1.04,0.9,0.88),above*inv(0.0,1.0,s)*side*0.35);
  /* maquiagem leve: sombra esfumada (clara na pálpebra, mais funda no vinco e no canto externo) */
  float sh=above*inv(0.1,1.3,s)*side*inv(1.1,1.5,x);
  float outer=smoothstep(0.2,0.95,x)*inv(0.3,1.4,s)*above;
  vec3 shc=mix(uShadow*1.1,uShadow*0.92,smoothstep(0.1,0.9,s));
  shc=mix(shc,uShadow*vec3(0.62,0.5,0.48),outer*0.75);
  alb=mix(alb,shc,clamp(sh*0.5+outer*0.22,0.0,1.0)*uMakeup);
  /* luz: difusa enrolada (pele translúcida), rebatedor frio, oclusão nas dobras */
  float dk=clamp((dot(n,LK)+0.3)/1.3,0.0,1.0);
  float df=clamp(dot(n,LF),0.0,1.0);
  float ao=clamp(0.84+h0*1.8,0.5,1.05);
  vec3 c=alb*(dk*vec3(1.0,0.93,0.86)*(0.42+0.88*key)+df*vec3(0.13,0.15,0.21)+0.08);
  c+=alb*vec3(0.32,0.07,0.04)*dk*(1.0-dk)*1.5*key;
  c*=ao;
  /* sombra suave que a pálpebra e os cílios projetam logo acima/abaixo do olho */
  c*=1.0-0.18*exp(-pow((dl-0.012)/0.03,2.0))*step(0.0,dl)*ax;
  /* brilho úmido (pálpebra e osso da sobrancelha) e cintilância fina da sombra */
  float sp=pow(max(dot(n,HV),0.0),26.0);
  c+=vec3(1.0,0.92,0.84)*sp*(0.07+0.28*sh*uMakeup)*(0.6+0.6*noise(e*40.0))*key;
  vec2 gc=floor(e/max(aa*1.5,0.0016));
  float glint=smoothstep(0.982,1.0,hash(gc))*(0.55+0.45*sin(uTime*2.2+hash(gc+4.0)*40.0));
  c+=vec3(1.0,0.93,0.82)*glint*sh*inv(0.05,0.9,s)*(0.25+sp*2.0)*0.8*key*uMakeup;
  /* iluminador: canto interno e logo abaixo da sobrancelha */
  vec2 ic=(e-vec2(-0.92,0.03))*vec2(1.0,1.4);
  c+=GOLD*0.1*exp(-dot(ic,ic)*420.0)*uMakeup;
  c+=vec3(0.95,0.85,0.72)*0.06*exp(-pow((e.y-browY(x)+0.16)/0.07,2.0))*inv(0.0,1.2,abs(x-0.25))*key*uMakeup;
  /* sobrancelha, levemente iluminada pela mesma luz */
  return mix(c,BROW*(0.65+0.55*key*dk),brow(e,aa)*0.9);
}

/* globo ocular: esclera com volume, vasinhos, carúncula úmida, íris atrás da córnea e reflexos */
vec3 ball(vec2 e,float top,float bot,float dTop,float dBot,float aa,float lod){
  float x=e.x;
  float ax=clamp(1.0-x*x,0.0,1.0);
  vec2 ic=uLook*LOOK;
  vec2 q=(e-ic)/R;
  float r=length(q);
  float aaR=aa/R;
  /* esfera iluminada pela luz principal: o branco do olho nunca é branco chapado */
  vec2 nb=(e-ic*0.6)/1.3;
  vec3 nrm=vec3(nb,sqrt(max(0.0,1.0-dot(nb,nb))));
  float dif=clamp(dot(nrm,LK)*0.55+0.45,0.0,1.0);
  vec3 b=SCLERA*(0.5+0.56*dif);
  b*=vec3(1.0,0.985+0.03*fbm3(e*6.0),0.965+0.05*fbm3(e*5.0+7.0));
  b=mix(b,b*vec3(1.0,0.84,0.82),smoothstep(0.5,0.98,abs(x))*0.45);
  /* vasinhos bem discretos perto dos cantos */
  float v1=abs(noise(e*vec2(7.0,11.0)+3.0)-0.5);
  float v2=abs(noise(e*vec2(19.0,27.0)+11.0)-0.5);
  float vein=(inv(0.0,0.009+aa*3.0,v1)+0.5*inv(0.0,0.006+aa*3.0,v2))*smoothstep(0.62,0.95,abs(x))*smoothstep(1.35,1.75,r);
  b=mix(b,vec3(0.8,0.36,0.36)*(0.5+0.5*dif),clamp(vein,0.0,1.0)*0.16);
  /* carúncula: o cantinho rosado e úmido de dentro, com a dobrinha ao lado */
  float mid=0.5*(top+bot);
  float cb=x+0.845-2.6*(e.y-mid)*(e.y-mid);
  b=mix(b,b*vec3(1.0,0.86,0.86),band(cb,0.0,0.06,0.025)*0.7);
  b=mix(b,vec3(0.84,0.48,0.47)*(0.85+0.15*noise(e*40.0))*(0.6+0.5*dif),inv(-aa*1.5,aa*1.5,cb));
  b+=vec3(0.4)*inv(0.0,0.01+aa,length(e-vec2(-0.912,mid+0.012)));
  b+=vec3(0.15)*smoothstep(0.75,0.95,noise(e*90.0+3.0))*inv(0.0,0.02,cb+0.06)*smoothstep(-0.12,-0.04,cb+0.06);
  /* íris atrás da córnea */
  float pr=max(0.34+0.008*sin(uTime*1.3)+0.005*sin(uTime*2.7+1.0)+0.22*uDilate,0.16);
  if(r<1.12){
    vec3 ir=iris(q,r,pr,lod,aaR);
    /* a córnea concentra luz no lado da íris oposto à fonte (cáustica) */
    float caus=smoothstep(0.0,0.9,dot(q,vec2(0.62,-0.62)))*smoothstep(0.3,0.95,r)*inv(0.9,1.0,r);
    ir*=(0.8+0.3*dif)*(1.0+vec3(0.5,0.36,0.2)*caus);
    /* borda da íris macia, como na vida real, com uma névoa cinza logo fora */
    b=mix(b,ir,inv(0.955,1.015+aaR*1.5,r));
    b*=1.0-0.12*exp(-pow((r-1.04)/0.05,2.0));
  }
  /* pálpebra de cima: sombra larga e macia, quente nas bordas; sombra dos cílios em fios */
  b*=mix(vec3(0.34,0.24,0.23),vec3(1.0),smoothstep(0.0,0.2,dTop));
  b*=0.55+0.45*smoothstep(0.0,0.022,dTop);
  b*=1.0-0.22*exp(-pow((dTop-0.05)/0.03,2.0))*(0.55+0.45*noise(vec2(x*45.0,1.0)));
  /* cantos e pálpebra de baixo mais escuros */
  b*=mix(0.7,1.0,smoothstep(0.0,0.045,dBot));
  b*=mix(0.66,1.0,inv(0.78,1.0,abs(x)));
  /* linha d'água rosada e o menisco de lágrima brilhando sobre ela */
  float wl=band(dBot,-0.01,0.014,aa);
  b=mix(b,vec3(0.82,0.55,0.52)*(0.5+0.5*dif),wl*smoothstep(0.0,0.12,ax)*0.85);
  /* canto externo: a dobra rosada e funda onde as pálpebras se encontram */
  b=mix(b,mix(vec3(0.4,0.22,0.21),vec3(0.2,0.1,0.1),smoothstep(0.9,1.0,x))*(0.6+0.4*dif),smoothstep(0.8,0.97,x)*0.9);
  /* kohl na linha d'água, como no delineado egípcio: contorna o olho por dentro, mais forte no canto externo */
  b=mix(b,vec3(0.05,0.038,0.042),max(wl,smoothstep(0.9,0.97,x))*smoothstep(0.15,0.85,x)*uMakeup*0.9);
  b+=vec3(0.3)*exp(-pow((dBot-0.017)/(0.0025+aa),2.0))*smoothstep(0.1,0.5,ax)*inv(0.6,0.85,x)*smoothstep(0.35,0.75,noise(vec2(x*28.0,3.0)));
  /* reflexos na córnea molhada: o ring light de quem grava, a janela do ambiente e um pontinho
     de rebote. Ficam do lado da luz, não giram com o olho. */
  float wet=smoothstep(0.0,0.035,dTop)*(1.0-0.45*smoothstep(1.8,4.0,uZoom));
  /* com a câmera focada na íris, a córnea (mais à frente) sai de foco e o reflexo fica macio */
  float macro=smoothstep(1.4,3.6,uZoom);
  vec2 hp=(e-(ic*0.85+R*vec2(-0.36,0.38)))/R;
  hp=rot(hp,0.2)*vec2(1.0,1.12);
  float rr=length(hp);
  float ring=band(rr,0.108,0.14,aaR*2.0+0.008+0.03*macro)*(0.62+0.22*smoothstep(-0.15,0.15,hp.y))*(1.0-0.35*macro);
  float spec=ring+exp(-pow((rr-0.124)/0.05,2.0))*0.16;
  /* janela: um retângulo suave e curvado pela córnea */
  vec2 wp=(e-(ic*0.85+R*vec2(0.34,0.42)))/R;
  wp=rot(wp,-0.3);wp*=1.0+1.4*dot(wp,wp);
  vec2 wq=abs(wp)-vec2(0.12,0.07);
  float win=inv(-0.012-aaR-0.03*macro,0.012+aaR+0.03*macro,length(max(wq,0.0))+min(max(wq.x,wq.y),0.0));
  spec=max(spec,win*0.17*(0.6+0.4*smoothstep(-0.07,0.07,wp.y)));
  spec=max(spec,inv(0.0,0.045+aaR,length(e-(ic*0.85+R*vec2(0.36,-0.34)))/R)*0.65);
  /* brilho úmido largo sobre a esclera e um fio de luz na borda da córnea */
  vec2 sw=(e-ic*0.4-vec2(-0.62,0.16))*vec2(1.0,2.2);
  b+=vec3(0.13,0.135,0.15)*inv(0.0,0.16,length(sw))*wet;
  b+=vec3(0.1)*exp(-pow((r-1.0)/0.025,2.0))*smoothstep(-0.2,0.6,dot(q/max(r,0.0001),vec2(-0.6,0.6)))*wet;
  return mix(b,vec3(1.0,0.995,0.985),clamp(spec,0.0,1.0)*wet*0.95);
}

/* delineado Cleópatra: traço grosso em cima com gatinho longo, linha de baixo de lápis kohl que se
   estende paralela ao gatinho sem fechar com ele, e uma ponta no canto interno. Tudo preso às pálpebras. */
vec3 liner(vec3 col,vec2 e,float top,float bot,float aa,vec3 n,float key){
  float x=e.x;
  float th=thUp(x);
  float la=aa*1.25;
  float up=band(e.y-top,-0.006,th,la)*smoothstep(-0.99,-0.92,x)*step(x,1.0);
  /* gatinho: a borda de baixo continua o canto do olho; a de cima sai da pálpebra até a ponta,
     que fica parada enquanto a pálpebra se mexe */
  float cT;float cB;lids(1.0,cT,cB);
  vec2 C=vec2(1.0,cT);
  float bT;float bB;lids(0.86,bT,bB);
  vec2 B=vec2(0.86,bT+thUp(0.86));
  vec2 T=mix(vec2(1.08,0.1),WING,uMakeup);
  if(x>0.6&&x<T.x+la){
    float f=clamp((x-B.x)/(T.x-B.x),0.0,1.0);
    float yU=smax(top+th,mix(B.y,T.y,(x-B.x)/(T.x-B.x))-0.12*uMakeup*f*(1.0-f),0.04);
    float yL=x<C.x?top-0.006:mix(C.y-0.006,T.y,(x-C.x)/(T.x-C.x));
    float sl=1.0+abs(T.y-C.y)/(T.x-C.x);
    up=max(up,band(e.y,yL,yU,la*sl)*inv(T.x-la,T.x+la,x));
  }
  /* linha de baixo: fina no meio, mais marcada no canto externo, com a borda de lápis */
  float low=band(bot-e.y,-0.004,thLow(x),la*1.4)*smoothstep(-0.97,-0.86,x)*step(x,0.995);
  /* rabinho de baixo: sai do canto externo paralelo ao gatinho, sem encostar nele */
  float sT;float sB;lids(0.9,sT,sB);
  vec2 S=vec2(0.9,sB-thLow(0.9)*0.5);
  float hh;
  float ds=sdSeg(e,S,S+normalize(WING-vec2(1.0,0.07))*(0.4*uMakeup+0.001),hh);
  float tail=ink(ds,thLow(0.9)*0.55*(1.0-hh*0.9),la)*uMakeup;
  /* ponta no canto interno, apontando para o nariz */
  float iT;float iB;lids(-0.86,iT,iB);
  float hi;
  float di=sdSeg(e,vec2(-0.86,iT+0.002),vec2(-1.04,-0.11),hi);
  float inner=ink(di,0.0075*(1.0-hi*0.85),la)*uMakeup;
  /* esfumado: um halo marrom bem leve em volta do kohl de baixo e acima do gatinho */
  float dl=bot-e.y;
  float halo=exp(-pow((dl-0.008)/0.024,2.0))*smoothstep(-0.3,0.5,x)*inv(0.88,1.04,x)*smoothstep(-0.02,0.0,dl);
  halo+=exp(-pow(ds/0.02,2.0))*0.35+exp(-pow((e.y-top-th-0.006)/0.022,2.0))*smoothstep(0.3,0.95,x)*inv(1.0,1.15,x)*0.45*step(-0.01,e.y-top);
  col=mix(col,col*vec3(0.55,0.43,0.4),clamp(halo,0.0,1.0)*0.28*uMakeup);
  /* textura de pigmento: o preto varia um pouquinho, como tinta sobre a pele */
  vec3 lc=LINER*(0.85+0.3*noise(e*260.0));
  col=mix(col,mix(LASHLINE,lc*1.4,uMakeup*smoothstep(-0.4,0.4,x)),low*0.9);
  float cov=max(max(up,tail),inner);
  col=mix(col,lc,cov);
  /* acabamento acetinado: a mesma luz da pele brilha no traço */
  float sp=pow(max(dot(n,HV),0.0),22.0);
  col+=vec3(0.44,0.42,0.46)*sp*cov*key*0.25*uMakeup;
  col+=vec3(0.09,0.085,0.1)*exp(-pow((e.y-top-th*0.62)/(th*0.22+aa),2.0))*smoothstep(-0.3,0.1,x)*inv(0.5,0.85,x)*up*key*uMakeup;
  return col;
}

/* um cílio de verdade é um tufo: dois ou três fios que nascem juntos e se abrem até as pontas,
   cada um com o seu comprimento. Fios mais finos que um pixel ficam transparentes em vez de serrilhar. */
float lash(vec2 p,vec2 root,vec2 dir,vec2 side,float len,float curl,float w,float spread,float seed,float aa){
  if(dot2(p-root)>len*len*1.4+0.0004)return 0.0;
  vec2 B=root+dir*len*0.5+side*len*curl*0.02;
  vec2 C=root+dir*len*0.85+side*len*curl*0.38;
  vec2 dt=sdBez(p,root,B,C);
  float t=dt.y;
  vec2 P=mix(mix(root,B,t),mix(B,C,t),t);
  vec2 T=mix(B-root,C-B,t);
  vec2 v=p-P;
  if(dt.x>spread*len*1.4*t*t+w+aa)return 0.0;
  float sd=dt.x*(T.x*v.y-T.y*v.x<0.0?-1.0:1.0);
  float m=aa*0.45;
  float cov=0.0;
  for(int i=0;i<3;i++){
    float fi=float(i)-1.0;
    float hl=hash(vec2(seed,fi+5.0));
    float tm=0.72+0.28*hl;
    float o=fi*spread*len*t*t*(0.6+0.8*hl);
    float ww=w*(1.0-0.9*pow(clamp(t/tm,0.0,1.0),1.2))*(1.0-0.3*abs(fi));
    cov=max(cov,ink(abs(sd-o),max(ww,m),aa)*min(1.0,ww/m)*inv(tm*0.86,tm,t));
  }
  return cov;
}
/* cílio de cima, nascendo no delineado. Aberto: sobe e abre para os lados (mais no canto externo);
   fechado: aponta para baixo, espelhado. lk/wk = escala de comprimento/espessura, da = mais em pé */
float upLash(vec2 e,float x0,float h,float fo,float lk,float wk,float da,float aa){
  float t0;float b0;lids(x0,t0,b0);
  float k=smoothstep(-0.72,0.9,x0);
  float len=mix(0.075,0.2,k*k)*(0.75+0.5*h)*lk;
  vec2 root=vec2(x0,t0+thUp(x0)*0.7);
  if(dot2(e-root)>len*len*1.4+0.0004)return 0.0;
  float sg=x0>-0.25?1.0:-1.0;
  float aOpen=mix(1.95,0.82,k)+(h-0.5)*0.3+da*sg;
  float a=mix(sg>0.0?-aOpen:6.2831853-aOpen,aOpen,fo);
  vec2 dir=vec2(cos(a),sin(a));
  vec2 side=vec2(dir.y,-dir.x)*sg*mix(-1.0,1.0,fo);
  return lash(e,root,dir,side,len,0.8+0.4*h,mix(0.0045,0.0072,k)*wk,0.06+0.07*h,x0*91.7+lk,aa);
}
/* cílios: 24 tufos compridos em cima, 23 menores entre eles e 14 curtinhos embaixo.
   Ao piscar, os de cima giram junto com a pálpebra. */
float lashes(vec2 e,float aa){
  float m=0.0;
  float fo=smoothstep(0.1,0.75,uOpen);
  for(int i=0;i<24;i++){
    float fi=float(i);
    float x0=mix(-0.74,0.92,fi/23.0);
    float kx=smoothstep(-0.72,0.9,x0);
    if(abs(e.x-x0)>mix(0.075,0.2,kx*kx)*1.25+0.04)continue;
    float h=hash(vec2(fi,7.0));
    m=max(m,upLash(e,x0+(h-0.5)*0.035,h,fo,1.0,1.0,0.0,aa));
  }
  for(int i=0;i<23;i++){
    float fi=float(i);
    float x0=mix(-0.74,0.92,(fi+0.5)/23.0);
    float kx=smoothstep(-0.72,0.9,x0);
    if(abs(e.x-x0)>mix(0.075,0.2,kx*kx)*0.83+0.04)continue;
    float h=hash(vec2(fi,23.0));
    m=max(m,upLash(e,x0+(h-0.5)*0.035,h,fo,0.66,0.8,0.12,aa)*0.92);
  }
  for(int i=0;i<14;i++){
    float fi=float(i);
    float x0=mix(-0.3,0.93,fi/13.0);
    if(abs(e.x-x0)>0.12)continue;
    float h=hash(vec2(fi,13.0));
    x0+=(h-0.5)*0.04;
    float t0;float b0;lids(x0,t0,b0);
    float t1;float b1;lids(x0+0.01,t1,b1);
    float k=smoothstep(-0.3,0.93,x0);
    vec2 dir=rot(-normalize(vec2(-(b1-b0),0.01)),0.3+0.55*k+(h-0.5)*0.3);
    float len=mix(0.028,0.072,k)*(0.7+0.6*h);
    m=max(m,lash(e,vec2(x0,b0-thLow(x0)*0.5),dir,vec2(-dir.y,dir.x),len,0.4,0.0034,0.05,fi+40.0,aa)*0.9);
  }
  return m;
}

vec3 shade(vec2 e,float px,float lod){
  /* longe do olho tudo já virou fundo (no celular, boa parte da tela): nem calcula */
  float fade=inv(0.9,2.3,length(e*vec2(0.6,1.0)));
  if(fade<=0.0)return BG;
  float x=e.x;
  float ax=clamp(1.0-x*x,0.0,1.0);
  float aa=px*0.9;
  float top;float bot;lids(x,top,bot);
  float dTop=top-e.y;
  float dBot=e.y-bot;
  float inside=smoothstep(-aa,aa,min(dTop,dBot))*smoothstep(0.0,0.02,ax);
  vec3 col=BG;
  vec3 n=vec3(0.0,0.0,1.0);
  float key=1.0;
  if(inside<1.0)col=skin(e,top,bot,aa,n,key);
  if(inside>0.0)col=mix(col,ball(e,top,bot,dTop,dBot,aa,lod),inside);
  if(abs(x-0.25)<1.4&&e.y<0.8&&e.y>-0.55){
    col=liner(col,e,top,bot,aa,n,key);
    /* só calcula os cílios onde eles alcançam: perto das pálpebras e, com o olho aberto,
       fora do meio do globo (os de cima sobem, os de baixo descem) */
    float lo=uOpen<0.97?min(bot-0.12,top-0.3):bot-0.12;
    if(e.y<top+0.33&&e.y>lo&&(uOpen<0.97||dTop<0.04||dBot<0.03))
      col=mix(col,LASH*(0.8+0.4*key),lashes(e,aa));
  }
  return mix(BG,col,fade);
}

void main(){
  vec2 p=(gl_FragCoord.xy-0.5*uRes)/uRes.y;
  vec2 ic=uLook*LOOK;
  vec2 fp=uCenter+ic*uScale;
  vec2 target=mix(fp,vec2(0.0),uLerp);
  vec2 d=p-target;
  float c=cos(uRot);float s=sin(uRot);
  d=vec2(c*d.x-s*d.y,s*d.x+c*d.y);
  vec2 e=(fp+d/uZoom-uCenter)/uScale;
  /* squash do piscar: o olho achata e alarga um pouquinho */
  e*=vec2(1.0-uSquash*0.4,1.0+uSquash);
  float px=1.0/(uRes.y*uScale*uZoom);
  float lod=clamp(log2(6.2831853*R/(px*3.0*64.0))+1.0,1.0,uMaxOct);
  vec3 col=shade(e,px,lod);
  float rpd=length(e-ic)/(R*(0.34+0.22*uDilate));
  col=mix(col,vec3(0.008,0.010,0.018),inv(0.5,1.15,rpd)*uDeep);
  /* gradação cinematográfica: sombras levemente frias, realces quentes */
  float l=dot(col,vec3(0.299,0.587,0.114));
  col=max(mix(vec3(l),col,1.08),0.0);
  col=mix(col,col*vec3(0.91,0.97,1.08),inv(0.05,0.35,l)*0.55);
  col=mix(col,col*vec3(1.04,1.0,0.96),smoothstep(0.5,0.9,l)*0.45);
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
  /* bloom: só os brilhos do olho 'vazam' levemente, como numa lente real */
  vec3 bl=vec3(0.0);
  for(int i=0;i<8;i++){float a=float(i)*0.785398;vec2 o=vec2(cos(a),sin(a))*vec2(uRes.y/uRes.x,1.0);
    bl+=max(texture2D(uTex,uv+o*0.006).rgb-0.9,0.0)+max(texture2D(uTex,uv+o*0.014).rgb-0.9,0.0)*0.6;}
  col+=bl*0.12;
  vec2 vc=(uv-0.5)*vec2(uRes.x/uRes.y,1.0);
  col*=1.0-0.3*smoothstep(0.45,1.15,length(vc));
  /* granulado bem fino: evita faixas nos degradês sem sujar o traço */
  col+=(hash(gl_FragCoord.xy+fract(uTime*7.0)*311.0)-0.5)*0.012;
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
      this.pointer = null; // último mouse/dedo, em px do canvas
      this.lastPointer = -1e9;
      this.lastActive = performance.now();
      this.nextSaccade = 0;
      this.nextBlink = performance.now() + 2500;
      this.blinkStart = -1;
      this.blinkLen = 300;
      this.squash = 0;
      this.velBlur = 0;
      this.velTarget = 0;
      this.micro = { x: 0, y: 0 };
      this.nextMicro = 0;
      this.interest = 0;
      this.interestTarget = 0;
      this.flash = 0;
      this.rush = 0; // semicerra quando o mouse passa correndo
      this.sleepy = 0; // pálpebras pesadas depois de muito tempo sem ninguém mexer
      this.expr = { open: 1, squint: 0, brow: 0, squash: 0 }; // reações: susto e piscadinha
      this.reacting = false;
      this.reactions = 0;
      const ir = EYE_STYLE.irises[EYE_STYLE.iris];
      const sh = EYE_STYLE.shadows[EYE_STYLE.shadow];
      this.colors = { dark: ir.dark.slice(), mid: ir.mid.slice(), light: ir.light.slice(), shadow: sh.color.slice() };
      this.makeup = EYE_STYLE.makeup;
      this.styleTarget = { dark: ir.dark, mid: ir.mid, light: ir.light, shadow: sh.color, makeup: EYE_STYLE.makeup };
      this.last = performance.now();
      this.mobile = mm('(max-width: 767px)') || !finePointer;
      this.loop = this.loop.bind(this);
    }

    // centro do olho na tela, em pixels relativos ao palco do hero
    eyeScreen() {
      const L = this.layout();
      const w = this.canvas.clientWidth;
      const h = this.canvas.clientHeight;
      return { x: w / 2 + L.cx * h, y: h / 2 - L.cy * h };
    }

    // posição da pupila na tela, em pixels relativos ao palco do hero
    pupilScreen() {
      const L = this.layout();
      const w = this.canvas.clientWidth;
      const h = this.canvas.clientHeight;
      const fx = L.cx + this.look.x * LOOK.x * L.scale;
      const fy = L.cy + this.look.y * LOOK.y * L.scale;
      return { x: w / 2 + fx * h, y: h / 2 - fy * h };
    }

    // olhada rápida em uma direção (ex.: para o texto que acabou de mudar)
    glance(x, y, ms) {
      if (performance.now() - this.lastPointer < 2500 || this.sleepy > 0.3) return;
      this.lookTarget.x = x;
      this.lookTarget.y = y;
      this.nextSaccade = performance.now() + ms;
    }

    // o olhar segue o mouse ou o dedo, medido a partir de onde o olho está na tela
    aim(clientX, clientY, mouse) {
      const now = performance.now();
      const r = this.canvas.getBoundingClientRect();
      const x = clientX - r.left;
      const y = clientY - r.top;
      if (mouse && this.pointer) {
        // velocidade em alturas de tela por segundo: mouse muito rápido faz o olho semicerrar
        const dt = Math.max(8, now - this.pointer.t) / 1000;
        const speed = Math.hypot(x - this.pointer.x, y - this.pointer.y) / Math.max(1, r.height) / dt;
        this.rush = Math.max(this.rush, clamp((speed - 2.5) / 4, 0, 1));
      }
      this.pointer = { x, y, t: now };
      const c = this.eyeScreen();
      this.lookTarget.x = clamp((x - c.x) / (r.width * 0.42), -1, 1);
      this.lookTarget.y = clamp(-(y - c.y) / (r.height * 0.45), -1, 1);
      this.lastPointer = now;
      this.wake();
    }

    // qualquer sinal de vida (mouse, toque, rolagem, teclado) acorda o olho, com um susto
    wake() {
      this.lastActive = performance.now();
      if (this.sleepy > 0.5) this.react('surprise');
    }

    // reação ao clique: alterna entre susto (arregala) e piscadinha, com antecipação e overshoot
    react(kind) {
      if (!hasGSAP || reduced || eyeState.zoom > 1.05) return;
      const x = this.expr;
      const type = kind || (this.reactions++ % 2 ? 'wink' : 'surprise');
      if (this.reactTl) this.reactTl.kill();
      this.reacting = true;
      const tl = gsap.timeline({ onComplete: () => { this.reacting = false; } });
      this.reactTl = tl;
      if (type === 'wink') {
        tl.to(x, { open: 0, squint: 0.55, brow: -0.45, squash: 0.05, duration: 0.13, ease: 'power3.in' })
          .to(x, { open: 1, squint: 0, brow: 0.25, squash: 0, duration: 0.55, ease: 'back.out(2.6)' }, '+=0.16')
          .to(x, { brow: 0, duration: 0.5, ease: 'power2.out' });
      } else {
        tl.to(x, { open: 0.78, squint: 0.35, brow: -0.3, squash: 0, duration: 0.11, ease: 'power2.out' })
          .to(x, { open: 1.24, squint: 0, brow: 1, duration: 0.3, ease: 'back.out(3)' })
          .to(x, { open: 1, brow: 0, duration: 1.1, ease: 'elastic.out(1, 0.45)' }, '+=0.45');
        this.flash = 1; // a pupila contrai no susto
      }
    }

    // troca cores e maquiagem com transição suave (painel ✦); trocas seguidas se acumulam no alvo
    setStyle(next) {
      const to = this.styleTarget;
      if (next.iris) { to.dark = next.iris.dark; to.mid = next.iris.mid; to.light = next.iris.light; }
      if (next.shadow) to.shadow = next.shadow.color;
      if (next.makeup !== undefined) to.makeup = next.makeup;
      const keys = ['dark', 'mid', 'light', 'shadow'];
      const from = {};
      keys.forEach((k) => { from[k] = this.colors[k].slice(); });
      const m0 = this.makeup;
      const apply = (k) => {
        keys.forEach((key) => { this.colors[key] = from[key].map((v, i) => v + (to[key][i] - v) * k); });
        this.makeup = m0 + (to.makeup - m0) * k;
        if (!this.running) this.render(performance.now());
      };
      if (this.styleTween) this.styleTween.kill();
      if (!hasGSAP || reduced) { apply(1); return; }
      const p = { k: 0 };
      this.styleTween = gsap.to(p, { k: 1, duration: next.makeup !== undefined ? 0.9 : 0.5, ease: 'power2.inOut', onUpdate: () => apply(p.k) });
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

      this.uEye = this.locations(this.eyeProg, ['uRes', 'uTime', 'uZoom', 'uOpen', 'uRot', 'uScale', 'uLerp', 'uDilate', 'uDeep', 'uMaxOct', 'uLook', 'uCenter',
        'uSquint', 'uBrow', 'uSquash', 'uMakeup', 'uIrisDark', 'uIrisMid', 'uIrisLight', 'uShadow']);
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
        if (gl.getShaderParameter(sh, gl.COMPILE_STATUS)) return sh;
        if (!gl.isContextLost()) console.warn('[olho] shader não compilou:', gl.getShaderInfoLog(sh));
        return null;
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
      // o olho semi-realista (íris em fibras, pele com relevo) pede um teto de pixels mais baixo;
      // a qualidade adaptativa do loop ainda reduz mais se o aparelho não acompanhar
      const maxPixels = this.mobile ? 1000000 : 2300000;
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
      // o olho inteiro (com o gatinho longo do delineado) cabe na tela; no celular ele fica no alto
      const wide = clamp((aspect - 0.9) / 0.5, 0, 1);
      const scale = clamp(aspect * 0.42, 0.3, 0.56);
      const cx = wide * clamp(aspect / 2 - (WING.x + 0.04) * scale - 0.02, -0.15, 0.25) - (1 - wide) * 0.03;
      const cy = 0.17 - 0.12 * clamp((aspect - 1) / 0.5, 0, 1);
      return { aspect, scale, cx, cy };
    }

    // zoom necessário para a íris ter raio k (em relação à menor dimensão da tela)
    zoomFor(k) {
      const L = this.layout();
      return Math.max(1, (k * Math.min(L.aspect, 1)) / (IRIS_R * L.scale));
    }

    updateGaze(now, dt) {
      const pointerActive = now - this.lastPointer < 4000;
      // muito tempo sem ninguém mexer: o olho fica com sono e o olhar vai caindo
      const sleepTarget = now - this.lastActive > 16000 && eyeState.zoom < 1.05 ? 1 : 0;
      this.sleepy += (sleepTarget - this.sleepy) * (1 - Math.exp(-dt * (sleepTarget ? 0.5 : 5)));
      if (this.sleepy > 0.3) {
        this.lookTarget.x *= 1 - Math.min(1, dt);
        this.lookTarget.y += (-0.45 - this.lookTarget.y) * Math.min(1, dt);
        this.nextSaccade = now + 600;
      } else if (!pointerActive && now > this.nextSaccade) {
        // sem mouse por uns segundos: olha em volta com saltos rápidos e pausas
        const home = Math.random() < 0.3;
        this.lookTarget.x = home ? 0 : (Math.random() * 2 - 1) * 0.75;
        this.lookTarget.y = home ? 0 : (Math.random() * 2 - 1) * 0.5;
        this.nextSaccade = now + 700 + Math.random() * 1900;
      }
      const k = 1 - Math.exp(-dt * (pointerActive ? 7 : 13));
      this.look.x += (this.lookTarget.x - this.look.x) * k;
      this.look.y += (this.lookTarget.y - this.look.y) * k;
      // microssacadas: pequenos saltos involuntários, como num olho de verdade
      if (now > this.nextMicro) {
        this.micro.x = (Math.random() * 2 - 1) * 0.022;
        this.micro.y = (Math.random() * 2 - 1) * 0.018;
        this.nextMicro = now + 350 + Math.random() * 750;
      }
      // a pupila dilata quando o ponteiro chega perto dela ou passa nos botões
      let near = 0;
      if (pointerActive && this.pointer) {
        const p = this.pupilScreen();
        const d = Math.hypot(this.pointer.x - p.x, this.pointer.y - p.y) / Math.max(1, this.canvas.clientHeight);
        near = Math.pow(clamp(1 - d / 0.6, 0, 1), 1.5);
      }
      const want = Math.max(this.interestTarget, near * 0.85);
      this.interest += (want - this.interest) * (1 - Math.exp(-dt * 3));
      this.flash *= Math.exp(-dt * 2.2);
      this.rush *= Math.exp(-dt * 3);
    }

    blinkFactor(now) {
      this.squash = 0;
      if (reduced) return 1;
      if (this.blinkStart < 0 && now > this.nextBlink && !this.reacting && eyeState.zoom < 1.05 && eyeState.open > 0.98) {
        this.blinkStart = now;
        this.blinkLen = 300 + 420 * this.sleepy; // com sono, pisca devagar
      }
      if (this.blinkStart >= 0) {
        const t = (now - this.blinkStart) / this.blinkLen;
        if (t >= 1) {
          this.blinkStart = -1;
          // intervalos aleatórios de 2 a 6 s; às vezes pisca duas vezes seguidas
          this.nextBlink = now + (Math.random() < 0.2 ? 130 : (2000 + Math.random() * 4000) * (1 + this.sleepy));
          return 1;
        }
        // fecha rápido e abre um pouco mais devagar; no meio do caminho o olho achata (squash)
        const f = t < 0.3 ? t / 0.3 : 1 - (t - 0.3) / 0.7;
        this.squash = 0.035 * Math.sin(Math.PI * Math.min(1, t / 0.6));
        return 1 - f * f * (3 - 2 * f);
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
      const blink = this.blinkFactor(now);
      const x = this.expr;
      // reações e sono somem durante o mergulho, para a câmera entrar com o olho aberto
      const open = eyeState.open * blink * (1 + (x.open * (1 - 0.42 * this.sleepy) - 1) * damp);
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
      gl.uniform1f(u.uDilate, eyeState.dilate + (this.interest * 0.2 - this.flash * 0.14) * damp);
      gl.uniform1f(u.uDeep, eyeState.deep);
      gl.uniform1f(u.uMaxOct, this.mobile ? 5.5 : 7.5);
      gl.uniform2f(u.uLook, lx, ly);
      gl.uniform2f(u.uCenter, L.cx, L.cy);
      gl.uniform1f(u.uSquint, clamp(x.squint + this.rush * 0.45, 0, 1) * damp);
      gl.uniform1f(u.uBrow, (x.brow - 0.3 * this.sleepy - this.squash * 4) * damp);
      gl.uniform1f(u.uSquash, (x.squash + this.squash) * damp);
      gl.uniform1f(u.uMakeup, this.makeup);
      gl.uniform3fv(u.uIrisDark, this.colors.dark);
      gl.uniform3fv(u.uIrisMid, this.colors.mid);
      gl.uniform3fv(u.uIrisLight, this.colors.light);
      gl.uniform3fv(u.uShadow, this.colors.shadow);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (!this.twoPass) return;
      // ponto focal do mergulho, em coordenadas de textura (para o desfoque radial)
      const fpx = L.cx + lx * LOOK.x * L.scale;
      const fpy = L.cy + ly * LOOK.y * L.scale;
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
      const dofR0 = Math.max(IRIS_R * 1.15, WING.x - 0.1) * L.scale * eyeState.zoom;
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

    // o olhar segue o mouse e, no celular, o dedo; rolar ou teclar também acorda o olho
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse' || e.pointerType === 'pen') eye.aim(e.clientX, e.clientY, true);
    }, { passive: true });
    const onTouch = (e) => {
      const tch = e.touches && e.touches[0];
      if (tch) eye.aim(tch.clientX, tch.clientY, false);
    };
    window.addEventListener('touchstart', onTouch, { passive: true });
    window.addEventListener('touchmove', onTouch, { passive: true });
    window.addEventListener('scroll', () => eye.wake(), { passive: true });
    window.addEventListener('keydown', () => eye.wake());

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
    const heroBits = ['.hero__eyebrow', '.hero__sub', '.hero__ctas', '.eye-kit'];
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
      if (e.target.closest('a, button, input, select, textarea, label, .eye-kit')) return;
      if (eyeState.zoom > 1.05) return;
      const r = stage.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      eye.aim(e.clientX, e.clientY, false);
      focusPulse(x, y, true);
      eye.react(); // susto ou piscadinha, alternando
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
      .fromTo('.eye-kit', { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.06, immediateRender: false }, 0.08)
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
     HERO: painel "✦ Brinque com o olhar" (cor da íris, cor da sombra e maquiagem)
     ======================================================================== */
  function eyeKit() {
    const kit = $('[data-eye-kit]');
    if (!kit || !eyeOK || !EYE_STYLE.kit) return;
    const toggle = $('.eye-kit__toggle', kit);
    const panel = $('.eye-kit__panel', kit);
    const sw = $('[data-kit="makeup"]', kit);
    const rgb = (c, k = 1) => `rgb(${c.map((v) => Math.round(clamp(v * k, 0, 1) * 255)).join(',')})`;
    let makeupOn = EYE_STYLE.makeup > 0.5;

    const setMakeup = (on) => {
      makeupOn = on;
      sw.setAttribute('aria-checked', String(on));
      eye.setStyle({ makeup: on ? 1 : 0 });
    };

    // as amostras saem do EYE_STYLE: mudar as cores lá muda o painel também
    const swatches = (row, items, current, label, paint, pick) => {
      Object.keys(items).forEach((key) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'eye-kit__sw';
        b.title = items[key].name;
        b.setAttribute('aria-label', `${label}: ${items[key].name}`);
        b.setAttribute('aria-pressed', String(key === current));
        b.style.setProperty('--sw', paint(items[key]));
        b.addEventListener('click', () => {
          $$('.eye-kit__sw', row).forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
          pick(items[key]);
        });
        row.appendChild(b);
      });
    };
    swatches($('[data-kit="iris"]', kit), EYE_STYLE.irises, EYE_STYLE.iris, 'Íris',
      (c) => `radial-gradient(circle at 50% 62%, ${rgb(c.light)} 0 22%, ${rgb(c.mid)} 52%, ${rgb(c.dark)} 100%)`,
      (c) => {
        eye.setStyle({ iris: c });
        eye.nextBlink = performance.now(); // pisca para "trocar de lente"
      });
    swatches($('[data-kit="shadow"]', kit), EYE_STYLE.shadows, EYE_STYLE.shadow, 'Sombra',
      (c) => `linear-gradient(135deg, ${rgb(c.color, 1.12)}, ${rgb(c.color, 0.78)})`,
      (c) => {
        eye.setStyle({ shadow: c });
        if (!makeupOn) setMakeup(true);
      });

    sw.setAttribute('aria-checked', String(makeupOn));
    sw.addEventListener('click', () => setMakeup(!makeupOn));

    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      panel.hidden = !open;
    };
    toggle.addEventListener('click', () => setOpen(panel.hidden));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !panel.hidden) {
        setOpen(false);
        toggle.focus();
      }
    });
    document.addEventListener('pointerdown', (e) => {
      if (!panel.hidden && !kit.contains(e.target)) setOpen(false);
    });
    kit.hidden = false;
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
  eyeKit();
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
