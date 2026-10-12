/* =====================================================================
   PHOS.EVO — ferramenta de câmera
     1. Funções da câmera (as 8 "lâminas") e progresso salvo
     2. Toast, modo câmera e dock de funções
     3. Fragmentos do obturador (estrelas coletáveis)
     4. Visor que segue o mouse
     5. Foto interativa: colorir com a câmera
   ===================================================================== */

(() => {
    'use strict';

    const $  = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
    const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;


    /* ---------------------------------------------------------------
       1. FUNÇÕES DA CÂMERA
       São 8, uma por período da história da fotografia (as 8 lâminas
       do diafragma da logo). Para ligar uma função nova numa página:
         • coloque um fragmento:  <button class="fragment" data-fragment="zoom">
         • marque ready:true aqui e trate  state.active.has('zoom')  no código.
       Troque "era" pelo nome real de cada período.
       --------------------------------------------------------------- */
    const FUNCS = [
        { id: 'desfoque',    label: 'Desfoque',    era: 'Período 1', ready: true  },
        { id: 'velocidade',  label: 'Velocidade',  era: 'Período 2', ready: false },
        { id: 'saturacao',   label: 'Saturação',   era: 'Período 3', ready: true  },
        { id: 'colorizacao', label: 'Colorização', era: 'Período 4', ready: false },
        { id: 'zoom',        label: 'Zoom',        era: 'Período 5', ready: false },
        { id: 'iso',         label: 'ISO',         era: 'Período 6', ready: false },
        { id: 'diafragma',   label: 'Diafragma',   era: 'Período 7', ready: false },
        { id: 'exposicao',   label: 'Exposição',   era: 'Período 8', ready: false },
    ];
    const byId = (id) => FUNCS.find((f) => f.id === id);

    const KEY = 'phos.camera.v1';
    const state = { unlocked: new Set(), active: new Set() };

    try {
        const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
        (saved.unlocked || []).forEach((id) => byId(id) && state.unlocked.add(id));
        (saved.active   || []).forEach((id) => byId(id) && state.unlocked.has(id) && state.active.add(id));
    } catch (_) { /* localStorage indisponível: segue sem salvar */ }

    const save = () => {
        try { localStorage.setItem(KEY, JSON.stringify({ unlocked: [...state.unlocked], active: [...state.active] })); }
        catch (_) { /* ignora */ }
    };


    /* ---------------------------------------------------------------
       2. TOAST, MODO CÂMERA E DOCK
       --------------------------------------------------------------- */
    const toastEl = $('#toast');
    let toastTimer;
    const toast = (msg) => {
        if (!toastEl) return;
        toastEl.textContent = msg;
        toastEl.classList.add('is-on');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 3400);
    };
    window.PHOS = Object.assign(window.PHOS || {}, { toast });

    const camBtn  = $('.camera-btn');
    const countEl = $('.cam-count');
    const dock    = $('#cam-dock');
    const vf      = $('#viewfinder');
    const stage   = $('#photo-stage');
    let overStage = false;
    let render = null;

    const setCamera = (on) => {
        document.body.classList.toggle('cam-on', on);
        if (camBtn) camBtn.setAttribute('aria-pressed', String(on));
        if (!on && vf && !overStage) vf.classList.remove('is-visible');
    };

    if (camBtn) {
        camBtn.addEventListener('click', () => {
            const on = !document.body.classList.contains('cam-on');
            setCamera(on);
            toast(on ? 'Modo câmera ligado. Passe o mouse e clique na foto.' : 'Modo câmera desligado.');
        });
    }

    function renderDock() {
        if (dock) {
            dock.innerHTML = FUNCS.map((f) => {
                const unlocked = state.unlocked.has(f.id);
                const on = state.active.has(f.id);
                const cls = 'chip' + (unlocked ? '' : ' is-locked') + (on ? ' is-on' : '');
                const lock = unlocked ? '' : '<svg aria-hidden="true"><use href="#i-lock"/></svg>';
                const tip = unlocked ? f.label : `Bloqueado: encontre o fragmento do ${f.era}`;
                return `<button type="button" class="${cls}" data-fn="${f.id}" aria-pressed="${on}" title="${tip}">${lock}${f.label}</button>`;
            }).join('');
        }
        if (countEl) {
            countEl.textContent = state.unlocked.size;
            countEl.hidden = state.unlocked.size === 0;
        }
        applyFunctions();
    }

    if (dock) {
        dock.addEventListener('click', (e) => {
            const chip = e.target.closest('.chip');
            if (!chip) return;
            const f = byId(chip.dataset.fn);
            if (!state.unlocked.has(f.id)) {
                toast(`Encontre o fragmento do ${f.era} para desbloquear ${f.label}.`);
                return;
            }
            if (!f.ready) {
                toast(`${f.label} já está desbloqueada! Ela será usada nas próximas fases.`);
                return;
            }
            state.active.has(f.id) ? state.active.delete(f.id) : state.active.add(f.id);
            save();
            renderDock();
        });
    }

    // Liga as funções no palco da foto (o CSS lê os data-attributes)
    function applyFunctions() {
        if (stage) {
            stage.dataset.blur = state.active.has('desfoque')  ? 'on' : 'off';
            stage.dataset.sat  = state.active.has('saturacao') ? 'on' : 'off';
        }
        const info = vf && $('.vf-info', vf);
        if (info) info.textContent = `${state.active.has('desfoque') ? 'f/1.4' : 'f/8'} · 1/125 · ISO 100`;
    }


    /* ---------------------------------------------------------------
       3. FRAGMENTOS DO OBTURADOR
       --------------------------------------------------------------- */
    function flyToCamera(el) {
        if (REDUCED || !camBtn || !el.animate) return;
        const a = el.getBoundingClientRect();
        const b = camBtn.getBoundingClientRect();
        const clone = el.cloneNode(true);
        clone.removeAttribute('data-fragment');
        clone.className = 'fragment-fly';
        Object.assign(clone.style, { left: a.left + 'px', top: a.top + 'px', width: a.width + 'px', height: a.height + 'px' });
        document.body.append(clone);
        const dx = (b.left + b.width / 2) - (a.left + a.width / 2);
        const dy = (b.top + b.height / 2) - (a.top + a.height / 2);
        clone.animate(
            [{ transform: 'translate(0,0) scale(1) rotate(0)', opacity: 1 },
             { transform: `translate(${dx}px,${dy}px) scale(.2) rotate(240deg)`, opacity: .25 }],
            { duration: 950, easing: 'cubic-bezier(.5,0,.2,1)' }
        ).onfinish = () => clone.remove();
    }

    $$('[data-fragment]').forEach((el) => {
        const f = byId(el.dataset.fragment);
        if (!f) return;
        if (state.unlocked.has(f.id)) el.classList.add('is-collected');

        el.addEventListener('click', () => {
            if (state.unlocked.has(f.id)) {
                toast(`${f.label} já foi desbloqueada. Ligue no modo câmera.`);
                return;
            }
            flyToCamera(el);
            el.classList.add('is-collected');
            state.unlocked.add(f.id);
            if (f.ready) state.active.add(f.id);
            save();
            renderDock();
            setCamera(true);
            toast(`Fragmento coletado (${state.unlocked.size}/${FUNCS.length})! Função desbloqueada: ${f.label}.`);
        });
    });


    /* ---------------------------------------------------------------
       4. VISOR QUE SEGUE O MOUSE
       Aparece com o modo câmera ligado, ou sempre que o mouse está
       sobre a foto interativa.
       --------------------------------------------------------------- */
    const lensRadius = () => (window.innerWidth < 640 ? 54 : 74);

    window.addEventListener('pointermove', (e) => {
        if (!vf || e.pointerType === 'touch') return;
        vf.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
        overStage = !!(stage && e.target instanceof Element && e.target.closest('#photo-stage'));
        vf.style.setProperty('--lens', (overStage ? lensRadius() * 2 : 110) + 'px');
        vf.classList.toggle('is-visible', document.body.classList.contains('cam-on') || overStage);
    }, { passive: true });

    document.documentElement.addEventListener('pointerleave', () => {
        overStage = false;
        if (vf) vf.classList.remove('is-visible');
    });

    function pulseViewfinder() {
        if (!vf) return;
        vf.classList.add('is-shot');
        setTimeout(() => vf.classList.remove('is-shot'), 160);
    }


    /* ---------------------------------------------------------------
       5. FOTO INTERATIVA: COLORIR COM A CÂMERA
       A foto é P&B. Um canvas com cores (céu, casas, pedra, mata) fica
       por cima com mix-blend-mode:color e só aparece onde a lente passa
       (ao vivo) ou onde você "fotografou" (clique = cor permanente).
       --------------------------------------------------------------- */
    if (stage) {
        const paint = $('.photo-paint', stage);
        const ctx   = paint.getContext('2d');
        const colorLayer = document.createElement('canvas');   // as cores
        const shotsLayer = document.createElement('canvas');   // máscara dos cliques
        const maskLayer  = document.createElement('canvas');   // máscara final = cliques + lente ao vivo
        const cctx = colorLayer.getContext('2d');
        const sctx = shotsLayer.getContext('2d');
        const mctx = maskLayer.getContext('2d');

        let W = 0, H = 0, dpr = 1, live = null, raf = 0;
        const shots = [];   // {x,y,r} normalizados (0..1): sobrevivem ao resize

        const softCircle = (c, x, y, r, a) => {
            const g = c.createRadialGradient(x, y, r * .55, x, y, r);
            g.addColorStop(0, `rgba(0,0,0,${a})`);
            g.addColorStop(1, 'rgba(0,0,0,0)');
            c.fillStyle = g;
            c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
        };

        function drawColors() {
            // Paleta pensada para a foto de demonstração (céu, telhados, pedra, mata).
            // Trocou a foto? Ajuste as cores (posição 0..1, de cima para baixo).
            const g = cctx.createLinearGradient(0, 0, 0, H);
            [[0, '#4f9bff'], [.26, '#a8d6ff'], [.34, '#e2845a'], [.47, '#d9b48a'],
             [.60, '#bfa27a'], [.70, '#86a05a'], [1, '#5b7a46']].forEach(([p, c]) => g.addColorStop(p, c));
            cctx.fillStyle = g;
            cctx.fillRect(0, 0, W, H);
        }

        function redrawShots() {
            sctx.clearRect(0, 0, W, H);
            shots.forEach((s) => softCircle(sctx, s.x * W, s.y * H, s.r * W, 1));
        }

        render = () => {
            if (!W) return;
            mctx.clearRect(0, 0, W, H);
            mctx.drawImage(shotsLayer, 0, 0);
            if (live) softCircle(mctx, live.x * dpr, live.y * dpr, lensRadius() * dpr, .9);
            ctx.globalCompositeOperation = 'source-over';
            ctx.clearRect(0, 0, W, H);
            ctx.drawImage(colorLayer, 0, 0);
            ctx.globalCompositeOperation = 'destination-in';
            ctx.drawImage(maskLayer, 0, 0);
            ctx.globalCompositeOperation = 'source-over';
        };
        const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; render(); }); };

        function size() {
            const r = stage.getBoundingClientRect();
            if (!r.width) return;
            dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
            if (w === W && h === H) return;
            W = w; H = h;
            [paint, colorLayer, shotsLayer, maskLayer].forEach((c) => { c.width = W; c.height = H; });
            drawColors();
            redrawShots();
            render();
        }

        const setLens = (x, y, on) => {
            stage.style.setProperty('--lx', x + 'px');
            stage.style.setProperty('--ly', y + 'px');
            stage.style.setProperty('--lr', on ? lensRadius() + 'px' : '9999px');
        };
        const local = (e) => {
            const r = stage.getBoundingClientRect();
            return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height };
        };

        function shoot(x, y, w, h) {
            const r = lensRadius();
            shots.push({ x: x / w, y: y / h, r: r / w });
            softCircle(sctx, (x / w) * W, (y / h) * H, (r / w) * W, 1);
            stage.classList.add('has-shot');
            const fl = $('.stage-flash', stage);
            if (fl) { fl.classList.remove('is-firing'); void fl.offsetWidth; fl.classList.add('is-firing'); }
            pulseViewfinder();
            schedule();
        }

        stage.addEventListener('pointermove', (e) => {
            if (e.pointerType === 'touch') return;
            const p = local(e);
            live = { x: p.x, y: p.y };
            setLens(p.x, p.y, true);
            schedule();
        });

        stage.addEventListener('pointerleave', () => {
            live = null;
            setLens(0, 0, false);
            schedule();
        });

        stage.addEventListener('pointerdown', (e) => {
            if (e.button > 0) return;
            const p = local(e);
            if (e.pointerType === 'touch') {            // toque: mostra a lente por um instante
                live = { x: p.x, y: p.y };
                setLens(p.x, p.y, true);
                if (vf) {
                    vf.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
                    vf.style.setProperty('--lens', lensRadius() * 2 + 'px');
                    vf.classList.add('is-visible');
                    setTimeout(() => !document.body.classList.contains('cam-on') && vf.classList.remove('is-visible'), 700);
                }
                setTimeout(() => { live = null; setLens(0, 0, false); schedule(); }, 700);
            }
            shoot(p.x, p.y, p.w, p.h);
        });

        // Teclado: Enter/Espaço fotografa uma área aleatória (acessibilidade)
        stage.tabIndex = 0;
        stage.setAttribute('role', 'button');
        stage.setAttribute('aria-label', 'Foto interativa. Pressione Enter para fotografar e colorir uma área.');
        stage.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            e.preventDefault();
            const r = stage.getBoundingClientRect();
            shoot(r.width * (0.2 + Math.random() * 0.6), r.height * (0.2 + Math.random() * 0.6), r.width, r.height);
        });

        const clear = $('#photo-clear');
        if (clear) clear.addEventListener('click', () => {
            shots.length = 0;
            redrawShots();
            stage.classList.remove('has-shot');
            schedule();
            toast('Foto restaurada em preto e branco.');
        });

        new ResizeObserver(size).observe(stage);
        size();
    }


    /* ---------------------------------------------------------------
       Botão "Experimento" (o jogo ainda está em construção)
       --------------------------------------------------------------- */
    const exp = $('[data-soon]');
    if (exp) exp.addEventListener('click', (e) => {
        e.preventDefault();
        toast('O Experimento está em construção. Em breve você poderá jogar!');
    });

    renderDock();
})();
