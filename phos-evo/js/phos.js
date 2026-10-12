/* =====================================================================
   PHOS.EVO — interações
     1. Vídeo de fundo (garante o autoplay e mantém as duas camadas juntas)
     2. Luz que segue o mouse nos botões
     3. Animação de captura de câmera (título + botão da câmera)
   ===================================================================== */

(() => {
    'use strict';

    const $  = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));


    /* ---------------------------------------------------------------
       1. VÍDEO DE FUNDO
       Alguns navegadores bloqueiam o autoplay ou pausam o vídeo ao
       trocar de aba. Aqui forçamos o play e retomamos ao voltar.
       --------------------------------------------------------------- */
    const videos  = $$('.bg-video');
    const mainVid = $('.bg-video--main');
    const ambient = $('.bg-video--ambient');

    const playAll = () => {
        videos.forEach((v) => {
            v.muted = true;                       // autoplay só é permitido sem som
            const p = v.play();
            if (p && typeof p.catch === 'function') p.catch(() => { /* bloqueado: o poster fica visível */ });
        });
    };

    playAll();
    document.addEventListener('visibilitychange', () => { if (!document.hidden) playAll(); });
    // Se o navegador bloquear o autoplay, o primeiro toque/clique na página libera.
    window.addEventListener('pointerdown', playAll, { once: true });

    // Mantém a camada borrada sincronizada com o vídeo principal
    if (mainVid && ambient) {
        mainVid.addEventListener('timeupdate', () => {
            if (Math.abs(mainVid.currentTime - ambient.currentTime) > 0.6) {
                try { ambient.currentTime = mainVid.currentTime; } catch (_) { /* ainda carregando */ }
            }
        });
    }


    /* ---------------------------------------------------------------
       2. LUZ QUE SEGUE O MOUSE
       Grava a posição do cursor em --mx / --my; o CSS desenha o spot.
       Elementos com  data-light  participam. Se dentro dele existir
       um .light-target, é nele que a luz é calculada (ex.: o "Explorar").
       --------------------------------------------------------------- */
    $$('[data-light]').forEach((el) => {
        const target = $('.light-target', el) || el;

        el.addEventListener('pointermove', (e) => {
            const r = target.getBoundingClientRect();
            target.style.setProperty('--mx', `${e.clientX - r.left}px`);
            target.style.setProperty('--my', `${e.clientY - r.top}px`);
        });

        el.addEventListener('pointerleave', () => {
            target.style.setProperty('--mx', '50%');
            target.style.setProperty('--my', '50%');
        });
    });


    /* ---------------------------------------------------------------
       3. CAPTURA DE CÂMERA
       O HTML já nasce com .is-capturing na <section> (a animação toca no carregamento,
       na navbar e no título).
       Para repetir, removemos e recolocamos a classe.
       --------------------------------------------------------------- */
    const hero        = $('.hero-section');   // a classe is-capturing fica na seção inteira
    const titleFrame  = $('.title-frame');
    const flash       = $('.flash-overlay');

    const replayCapture = () => {
        if (!hero) return;
        hero.classList.remove('is-capturing', 'is-replay');
        void hero.offsetWidth;                            // força o navegador a reiniciar a animação
        hero.style.setProperty('--cap-delay', '0s');      // na repetição não há espera
        hero.classList.add('is-capturing', 'is-replay');
    };

    const fireFlash = () => {
        if (!flash) return;
        flash.classList.remove('is-firing');
        void flash.offsetWidth;
        flash.classList.add('is-firing');
    };

    // Botão da câmera = "tirar foto": flash na tela + o visor foca de novo
    const cameraBtn = $('.camera-btn');
    if (cameraBtn) {
        cameraBtn.addEventListener('click', () => {
            fireFlash();
            // refaz a captura do título só se a hero ainda estiver na tela
            if (window.scrollY < window.innerHeight * 0.6) replayCapture();
        });
    }

    // Clicar (ou tocar) no título também repete a captura
    if (titleFrame) titleFrame.addEventListener('click', replayCapture);

    /* ---------------------------------------------------------------
       4. MENU (botão hambúrguer)
       --------------------------------------------------------------- */
    const menuBtn   = $('.menu-btn');
    const menuPanel = $('#menu');

    const setMenu = (open) => {
        if (!menuBtn || !menuPanel) return;
        menuBtn.setAttribute('aria-expanded', String(open));
        if (open) {
            menuPanel.hidden = false;
            requestAnimationFrame(() => menuPanel.classList.add('is-open'));
        } else {
            menuPanel.classList.remove('is-open');
            setTimeout(() => { if (!menuPanel.classList.contains('is-open')) menuPanel.hidden = true; }, 300);
        }
    };

    if (menuBtn && menuPanel) {
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            setMenu(menuBtn.getAttribute('aria-expanded') !== 'true');
        });
        menuPanel.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
        document.addEventListener('click', (e) => { if (!e.target.closest('.menu-panel')) setMenu(false); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
    }


    /* ---------------------------------------------------------------
       5. ENTRADA AO ROLAR
       Elementos com .reveal aparecem (e os colchetes "fecham") quando
       entram na tela. Sem IntersectionObserver, ficam sempre visíveis.
       --------------------------------------------------------------- */
    const reveals = $$('.reveal');
    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
            entries.forEach((en) => {
                if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
            });
        }, { threshold: 0.3 });
        reveals.forEach((el) => io.observe(el));
    } else {
        reveals.forEach((el) => el.classList.add('is-in'));
    }
})();
