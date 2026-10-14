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
     HERO EM WEBGL: o rosto real da Ingrid e o mergulho no olho
     ======================================================================== */
  // Calibração do olho na foto hero-face-2048 (recorte quadrado do IMG_5588).
  // Coordenadas uv de 0 a 1 com y para cima; raios em fração da largura da foto.
  const FACE = {
    src: 'assets/img/hero-face-2048',
    eyeSrc: 'assets/img/hero-eye-2048',
    eye: [0.57705, 0.60582],                         // centro da pupila
    eyeRect: [0.49239, 0.52116, 0.66171, 0.69048],   // área coberta pela textura do olho em alta
    irisR: 0.013426,
    pupilR: 0.004795,
  };

  const eyeState = { zoom: 1, rot: 0, blur: 0, lerp: 0, detail: 0, deep: 0, open: reduced || !hasGSAP ? 1 : 0 };

  const VERT = 'attribute vec2 aPos;void main(){gl_Position=vec4(aPos,0.0,1.0);}';

  const HASH = `
float hash(vec2 p){vec3 p3=fract(vec3(p.xyx)*0.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}`;

  const FACE_FRAG = `precision highp float;
uniform sampler2D uFace;uniform sampler2D uEye;
uniform vec2 uRes;uniform float uZoom;uniform float uRot;uniform float uLerp;
uniform float uS;uniform vec2 uP0;uniform vec2 uE;uniform vec4 uEyeRect;
uniform float uIrisR;uniform float uPupilR;uniform float uDetail;uniform float uDeep;uniform float uFade;uniform float uMaxOct;
const vec3 BG=vec3(0.027,0.043,0.086);
${HASH}
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
  float fib=pfbm(vec2(tw*64.0,u*2.6),64.0,lod);
  float fine=pfbm(vec2(tw*256.0,u*7.0+5.0),256.0,lod-2.0);
  float cu=0.30+0.05*(pnoise(vec2(t*12.0,2.0),12.0)-0.5)+0.025*(pnoise(vec2(t*44.0,5.0),44.0)-0.5);
  vec3 cDark=vec3(0.15,0.08,0.05);
  vec3 cBrown=vec3(0.40,0.22,0.11);
  vec3 cAmber=vec3(0.66,0.40,0.17);
  vec3 cGold=vec3(0.90,0.64,0.32);
  float pz=1.0-smoothstep(cu-0.03,cu+0.03,u);
  vec3 col=mix(mix(cDark,cBrown,fib),mix(cBrown*0.8,cAmber,fib),pz*0.85);
  /* brilho dourado ao redor do colarete e pequenos flocos */
  float glow=exp(-pow((u-cu-0.06)/0.12,2.0));
  col=mix(col,cGold*(0.55+0.6*fib),glow*0.45*smoothstep(0.35,0.8,fib));
  col+=cGold*0.35*pow(fine,5.0)*smoothstep(cu,cu+0.2,u)*inv(0.6,0.85,u);
  /* fibras finas: luz e sombra */
  col*=0.78+0.5*fine;
  /* colarete: a crista em zigue-zague */
  float ridge=exp(-pow((u-cu)/0.022,2.0));
  col=mix(col,cAmber*1.15,ridge*0.55*(0.6+0.4*fib));
  /* criptas de Fuchs com bordas claras */
  float cr=0.65*pnoise(vec2(tw*30.0,u*3.6+4.0),30.0)+0.35*pnoise(vec2(tw*60.0,u*7.0+9.0),60.0);
  float zone=smoothstep(cu+0.01,cu+0.08,u)*inv(0.48,0.72,u);
  col*=1.0-0.48*smoothstep(0.6,0.74,cr)*zone;
  col+=cAmber*0.16*smoothstep(0.52,0.6,cr)*inv(0.6,0.68,cr)*zone;
  /* sulcos de contração */
  float fur=0.0;
  for(int i=0;i<3;i++){float fi=float(i);
    float uc=0.6+0.11*fi+0.03*(pnoise(vec2(t*16.0,fi*5.0+1.0),16.0)-0.5);
    fur+=exp(-pow((u-uc)/0.02,2.0))*smoothstep(0.45,0.72,pnoise(vec2(t*7.0,fi*3.0),7.0));}
  col*=1.0-0.26*clamp(fur,0.0,1.0)*(0.7+0.6*fib);
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

void main(){
  vec2 p=(gl_FragCoord.xy-0.5*uRes)/uRes.y;
  vec2 pE=uP0+(uE-0.5)*uS;
  vec2 T=mix(pE,vec2(0.0),uLerp);
  vec2 d=p-T;
  float c=cos(uRot);float s=sin(uRot);
  d=vec2(c*d.x-s*d.y,s*d.x+c*d.y);
  vec2 uv=uE+d/(uS*uZoom);
  float pxuv=1.0/(uS*uZoom*uRes.y);

  /* foto + o olho em alta resolução */
  vec3 col=texture2D(uFace,uv).rgb;
  vec2 eu=(uv-uEyeRect.xy)/(uEyeRect.zw-uEyeRect.xy);
  vec2 fe=min(eu,1.0-eu);
  float ew=smoothstep(0.0,0.2,min(fe.x,fe.y));
  vec3 ec=texture2D(uEye,clamp(eu,0.0,1.0)).rgb;
  col=mix(col,ec,ew);
  float lum=dot(ec,vec3(0.299,0.587,0.114));
  float lumS=dot(texture2D(uEye,clamp(eu,0.0,1.0),1.5).rgb,vec3(0.299,0.587,0.114));
  float lumH=dot(texture2D(uEye,clamp(eu,0.0,1.0),4.0).rgb,vec3(0.299,0.587,0.114));

  /* dentro do olho: a íris procedural substitui a foto, mantendo o reflexo real */
  vec2 q=(uv-uE)/uIrisR;
  float r=length(q);
  if(uDetail>0.001&&r<1.12){
    float pxq=pxuv/uIrisR;
    float lod=clamp(log2(6.2831853/(pxq*3.0*64.0))+1.0,1.0,uMaxOct);
    vec3 ir=iris(q,r,uPupilR/uIrisR,lod,pxq);
    float lidY=0.6-0.25*q.x*q.x;
    ir*=1.0-0.55*smoothstep(lidY-0.38,lidY,q.y);
    /* reflexo real da janela: contorno macio, leve gradiente e halo de brilho */
    float spec=smoothstep(0.36,0.7,lumS);
    vec3 specC=mix(vec3(0.78,0.8,0.86),vec3(1.0,0.99,0.97),smoothstep(0.55,0.85,lumS));
    ir+=vec3(0.18,0.16,0.15)*smoothstep(0.24,0.5,lumH)*(1.0-spec);
    ir=mix(ir,specC,spec*0.94);
    float mask=inv(0.985,1.03,r)*inv(lidY-0.05,lidY+0.02,q.y)*ew;
    col=mix(col,ir,mask*uDetail);
  }
  float rp=length(uv-uE)/uPupilR;
  col=mix(col,vec3(0.008,0.010,0.018),inv(0.5,1.15,rp)*uDeep);

  /* tratamento de cor e vinheta */
  float l2=dot(col,vec3(0.299,0.587,0.114));
  col=mix(vec3(l2),col,0.92)*vec3(0.96,0.98,1.05);
  float vg=inv(0.22,0.72,length((uv-vec2(0.5,0.55))*vec2(1.15,0.95)));
  col*=mix(0.28,1.0,vg);
  vec2 ed=min(uv,1.0-uv);
  float edge=smoothstep(0.0,0.16,ed.x)*smoothstep(0.0,0.1,ed.y);
  col=mix(BG,col,edge*uFade);
  gl_FragColor=vec4(col,1.0);
}`;

  const POST_FRAG = `precision highp float;
uniform sampler2D uTex;uniform vec2 uRes;uniform vec2 uFocus;uniform float uBlur;uniform float uTime;
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
  vec2 vc=(uv-0.5)*vec2(uRes.x/uRes.y,1.0);
  col*=1.0-0.3*smoothstep(0.45,1.15,length(vc));
  col+=(hash(gl_FragCoord.xy+fract(uTime*7.0)*311.0)-0.5)*0.03;
  gl_FragColor=vec4(col,1.0);
}`;

  const loadImage = (base) => new Promise((resolve, reject) => {
    const attempt = (exts) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = () => (exts.length > 1 ? attempt(exts.slice(1)) : reject(new Error(`Falha ao carregar ${base}`)));
      img.src = `${base}.${exts[0]}`;
    };
    attempt(['webp', 'jpg']);
  });

  class Portrait {
    constructor(canvas) {
      this.canvas = canvas;
      this.ok = false;
      this.texturesReady = false;
      this.running = false;
      this.visible = true;
      this.quality = 1;
      this.slowFrames = 0;
      this.downgrades = 0;
      this.look = { x: 0, y: 0 };
      this.lookTarget = { x: 0, y: 0 };
      this.lastPointer = -1e9;
      this.nextDrift = 0;
      this.velBlur = 0;
      this.velTarget = 0;
      this.last = performance.now();
      this.mobile = mm('(max-width: 767px)') || !finePointer;
      this.images = null;
      this.loop = this.loop.bind(this);
    }

    init() {
      const opts = { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' };
      let gl = null;
      try { gl = this.canvas.getContext('webgl', opts) || this.canvas.getContext('experimental-webgl', opts); } catch (e) { gl = null; }
      if (!gl) return false;
      const hp = gl.getShaderPrecisionFormat && gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
      if (!hp || hp.precision <= 0 || gl.getParameter(gl.MAX_TEXTURE_SIZE) < 2048) return false;
      this.gl = gl;

      this.faceProg = this.program(VERT, FACE_FRAG);
      this.postProg = this.program(VERT, POST_FRAG);
      if (!this.faceProg || !this.postProg) return false;

      this.uFace = this.locations(this.faceProg, ['uFace', 'uEye', 'uRes', 'uZoom', 'uRot', 'uLerp', 'uS', 'uP0', 'uE', 'uEyeRect', 'uIrisR', 'uPupilR', 'uDetail', 'uDeep', 'uFade', 'uMaxOct']);
      this.uPost = this.locations(this.postProg, ['uTex', 'uRes', 'uFocus', 'uBlur', 'uTime']);

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

      this.tex = this.texture(false);
      this.faceTex = this.texture(true);
      this.eyeTex = this.texture(true);
      this.fbo = gl.createFramebuffer();
      this.W = this.H = 0;
      this.ok = this.resize();
      if (this.images) this.upload();
      return this.ok;
    }

    texture(mip) {
      const gl = this.gl;
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([7, 11, 22, 255]));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      if (mip) gl.generateMipmap(gl.TEXTURE_2D);
      return t;
    }

    load() {
      return Promise.all([loadImage(FACE.src), loadImage(FACE.eyeSrc)]).then(([face, eye]) => {
        this.images = { face, eye };
        if (this.ok) this.upload();
      });
    }

    upload() {
      const gl = this.gl;
      const put = (tex, img) => {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.generateMipmap(gl.TEXTURE_2D);
      };
      put(this.faceTex, this.images.face);
      put(this.eyeTex, this.images.eye);
      this.texturesReady = true;
      this.render(performance.now());
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
      const maxPixels = this.mobile ? 1400000 : 2600000;
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

    // Enquadramento da foto: no celular o rosto fica no alto; no desktop, à direita do texto.
    layout() {
      const aspect = this.W / this.H;
      const t = clamp((aspect - 0.8) / 0.6, 0, 1);
      const S = 1.12 - 0.06 * t;
      const px = (aspect / 2 - S * 0.46) * t;
      const py = 0.12 * (1 - t) - 0.02 * t;
      return { aspect, S, px, py };
    }

    updateLook(now, dt) {
      const pointerActive = finePointer && now - this.lastPointer < 2500;
      if (!pointerActive && now > this.nextDrift) {
        this.lookTarget.x = (Math.random() * 2 - 1) * 0.5;
        this.lookTarget.y = (Math.random() * 2 - 1) * 0.4;
        this.nextDrift = now + 2600 + Math.random() * 2600;
      }
      const k = 1 - Math.exp(-dt * (pointerActive ? 4 : 1.2));
      this.look.x += (this.lookTarget.x - this.look.x) * k;
      this.look.y += (this.lookTarget.y - this.look.y) * k;
    }

    render(now) {
      if (!this.ok) return;
      const gl = this.gl;
      if (!this.texturesReady) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.W, this.H);
        gl.clearColor(0.027, 0.043, 0.086, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        return;
      }
      const L = this.layout();
      const t = now / 1000;
      const damp = 1 - clamp((eyeState.zoom - 1) / 1.5, 0, 1);
      // paralaxe sutil com o mouse e "respiração" da câmera antes do mergulho
      const p0x = L.px - this.look.x * 0.016 * damp;
      const p0y = L.py - this.look.y * 0.012 * damp;
      const breathe = reduced ? 0 : Math.sin(t * 0.9) * 0.005 * damp;
      const zoom = eyeState.zoom * (1 + breathe + 0.08 * (1 - eyeState.open));

      gl.bindFramebuffer(gl.FRAMEBUFFER, this.twoPass ? this.fbo : null);
      gl.viewport(0, 0, this.W, this.H);
      gl.useProgram(this.faceProg);
      const u = this.uFace;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.faceTex);
      gl.uniform1i(u.uFace, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.eyeTex);
      gl.uniform1i(u.uEye, 1);
      gl.uniform2f(u.uRes, this.W, this.H);
      gl.uniform1f(u.uZoom, zoom);
      gl.uniform1f(u.uRot, eyeState.rot);
      gl.uniform1f(u.uLerp, eyeState.lerp);
      gl.uniform1f(u.uS, L.S);
      gl.uniform2f(u.uP0, p0x, p0y);
      gl.uniform2f(u.uE, FACE.eye[0], FACE.eye[1]);
      gl.uniform4f(u.uEyeRect, FACE.eyeRect[0], FACE.eyeRect[1], FACE.eyeRect[2], FACE.eyeRect[3]);
      gl.uniform1f(u.uIrisR, FACE.irisR);
      gl.uniform1f(u.uPupilR, FACE.pupilR);
      gl.uniform1f(u.uDetail, eyeState.detail);
      gl.uniform1f(u.uDeep, eyeState.deep);
      gl.uniform1f(u.uFade, eyeState.open);
      gl.uniform1f(u.uMaxOct, this.mobile ? 5.5 : 7.5);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (!this.twoPass) return;
      // ponto focal do mergulho, em coordenadas de textura (para o desfoque radial)
      const pex = p0x + (FACE.eye[0] - 0.5) * L.S;
      const pey = p0y + (FACE.eye[1] - 0.5) * L.S;
      const tx = pex * (1 - eyeState.lerp);
      const ty = pey * (1 - eyeState.lerp);
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
      const moving = this.velBlur * 0.55 * clamp((eyeState.zoom - 1.3) / 2, 0, 1);
      gl.uniform1f(p.uBlur, Math.max(eyeState.blur, moving));
      gl.uniform1f(p.uTime, t);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    loop(now) {
      this.raf = requestAnimationFrame(this.loop);
      const dt = Math.min(0.1, Math.max(0.001, (now - this.last) / 1000));
      this.last = now;
      this.updateLook(now, dt);
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

  const eye = new Portrait($('.hero__canvas'));
  let eyeOK = false;
  try { eyeOK = eye.init(); } catch (e) { eyeOK = false; }
  if (!eyeOK) root.classList.add('no-webgl');

  // fica pronto quando as fotos chegam (ou de imediato, no modo sem WebGL)
  const heroReady = eyeOK
    ? eye.load().catch(() => {
      eye.stop();
      eye.ok = false;
      eyeOK = false;
      root.classList.add('no-webgl');
    })
    : Promise.resolve();

  if (eyeOK) {
    const canvas = eye.canvas;
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      eye.stop();
      eye.ok = false;
      eye.texturesReady = false;
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
  }

  /* ========================================================================
     LOADER + ENTRADA
     ======================================================================== */
  const markLoaded = () => root.classList.add('is-loaded');

  function intro() {
    if (!hasGSAP || reduced) {
      eyeState.open = 1;
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
      .to(eyeState, { open: 1, duration: 1.7, ease: 'expo.out' }, '-=0.35')
      .to('.hero__line > span', { yPercent: 0, duration: 1.15, stagger: 0.09, ease: 'expo.out' }, '<0.1')
      .to(heroBits, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.08 }, '<0.35')
      .to('.nav', { autoAlpha: 1, duration: 0.8, clearProps: 'opacity,visibility' }, '<');
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

    // câmera: rosto inteiro → olhos → íris (devagar) → pupila
    tl.to(zl, { v: Math.log(2.4), duration: 0.2, ease: 'power1.in', onUpdate: applyZoom }, 0.13)
      .to(zl, { v: Math.log(20), duration: 0.29, ease: 'sine.inOut', onUpdate: applyZoom }, 0.33)
      .to(zl, { v: Math.log(70), duration: 0.16, ease: 'none', onUpdate: applyZoom }, 0.62)
      .to(zl, { v: Math.log(320), duration: 0.1, ease: 'power2.in', onUpdate: applyZoom }, 0.78)
      .to(eyeState, { lerp: 0.45, duration: 0.2, ease: 'power1.in' }, 0.13)
      .to(eyeState, { lerp: 1, duration: 0.29, ease: 'sine.inOut' }, 0.33)
      .to(eyeState, { rot: 0.06, duration: 0.55 }, 0.33)
      .to(eyeState, { detail: 1, duration: 0.1, ease: 'sine.inOut' }, 0.52)
      .to(eyeState, { blur: 1, duration: 0.1, ease: 'power2.in' }, 0.78)
      .to(eyeState, { deep: 1, duration: 0.08 }, 0.82);

    // sem WebGL: a mesma ideia com a foto em CSS (escala a partir do olho)
    tl.to('.fb-face', { scale: 2.4, duration: 0.2, ease: 'power1.in' }, 0.13)
      .to('.fb-face', { scale: 20, duration: 0.29, ease: 'sine.inOut' }, 0.33)
      .to('.fb-face', { scale: 90, duration: 0.26, ease: 'power2.in' }, 0.62);
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
    const xTo = gsap.quickTo(cursor, 'x', { duration: 0.35, ease: 'power3.out' });
    const yTo = gsap.quickTo(cursor, 'y', { duration: 0.35, ease: 'power3.out' });
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      xTo(e.clientX);
      yTo(e.clientY);
      cursor.classList.remove('is-hidden');
    }, { passive: true });
    document.addEventListener('pointerover', (e) => {
      const play = e.target.closest('[data-cursor="play"]');
      const link = !play && e.target.closest('a, button, label, input, select, textarea');
      cursor.classList.toggle('is-play', !!play);
      cursor.classList.toggle('is-link', !!link);
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
