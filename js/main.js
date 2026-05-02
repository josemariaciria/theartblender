(function () {
    'use strict';

    /* ═══════════════════════════════════════
       UTILITIES
       ═══════════════════════════════════════ */
    function rand(a, b) { return a + Math.random() * (b - a); }
    function getAbs(el) { var r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 + window.scrollY }; }
    function easeIO(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2; }
    function qBez(t, a, b, c) { var m = 1-t; return m*m*a + 2*m*t*b + t*t*c; }

    /* ═══════════════════════════════════════
       CANVAS
       ═══════════════════════════════════════ */
    var canvas = document.getElementById('particleCanvas');
    var ctx = canvas.getContext('2d');
    var DPR = Math.min(window.devicePixelRatio || 1, 2);
    function resizeCanvas() {
        canvas.width = window.innerWidth * DPR;
        canvas.height = window.innerHeight * DPR;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    /* ═══════════════════════════════════════
       HERO LETTERS — wrap with stagger values
       ═══════════════════════════════════════ */
    var phraseLeft = document.getElementById('phraseLeft');
    var phraseRight = document.getElementById('phraseRight');

    function wrapLetters(el) {
        var parts = el.innerHTML.split(/<br\s*\/?>/gi);
        el.innerHTML = '';
        parts.forEach(function (part, i) {
            part.split('').forEach(function (ch) {
                var span = document.createElement('span');
                span.className = 'letter';
                span.textContent = ch === ' ' ? '\u00A0' : ch;
                // Each letter gets its own random stagger delay
                span.dataset.stagger = rand(0, 0.18).toFixed(4);
                el.appendChild(span);
            });
            if (i < parts.length - 1) el.appendChild(document.createElement('br'));
        });
    }
    wrapLetters(phraseLeft);
    wrapLetters(phraseRight);

    var allHeroLetters = [].slice.call(phraseLeft.querySelectorAll('.letter'))
        .concat([].slice.call(phraseRight.querySelectorAll('.letter')));

    /* ═══════════════════════════════════════
       SLOGAN LETTERS — wrap
       ═══════════════════════════════════════ */
    var sloganSection = document.getElementById('slogan');
    var sloganEl = document.getElementById('sloganText');
    var sloganSub = document.getElementById('sloganSub');
    var sloganEyebrow = document.getElementById('sloganEyebrow');

    (function () {
        var raw = sloganEl.textContent;
        sloganEl.innerHTML = '';
        raw.split(' ').forEach(function (word, wi) {
            if (wi > 0) sloganEl.appendChild(document.createTextNode(' '));
            var ws = document.createElement('span');
            ws.style.cssText = 'display:inline-block;white-space:nowrap';
            word.split('').forEach(function (ch) {
                var s = document.createElement('span');
                s.className = 's-letter';
                s.textContent = ch;
                ws.appendChild(s);
            });
            sloganEl.appendChild(ws);
        });
    })();

    var sloganLetters = [].slice.call(sloganEl.querySelectorAll('.s-letter'));

    // Random subtitle
    var subs = [
        'We blend art, people and business beyond the imaginable.',
        'When logic isn\'t enough.',
        'Your business school never told you why.'
    ];
    sloganSub.textContent = subs[Math.floor(Math.random() * subs.length)];

    /* ═══════════════════════════════════════
       PARTICLE SYSTEM
       ═══════════════════════════════════════ */
    var particles = [], initialized = false;

   // Letras del hero válidas (sin espacios), índices en el array original
    var validHeroLetters = allHeroLetters.filter(function (l) {
        return l.textContent.trim() && l.textContent !== '\u00A0';
    });

    function initParticles() {
        if (!validHeroLetters.length || !sloganLetters.length) return;
        particles = [];

        sloganLetters.forEach(function (_, i) {
            var heroIdx = i % validHeroLetters.length;
            // Main particle (anclada a una letra de slogan)
            particles.push({
                heroIdx: heroIdx, sloIdx: i,
                oxJ: rand(-3, 3), oyJ: rand(-3, 3),
                txJ: 0, tyJ: 0,
                mxRel: rand(-.35, .35),    // posición horizontal mid (relativa a W)
                myMix: rand(.35, .55),      // mezcla vertical hero↔slogan en mid
                myJ: rand(-.1, .1),         // jitter vertical mid (relativo a H)
                size: rand(2.5, 4.5),
                delay: rand(0, 0.06), speed: rand(.9, 1.05),
                wAmp: rand(5, 20), wFreq: rand(1.5, 3.5), wPh: rand(0, Math.PI*2),
                gold: Math.random() < .2,
                dust: false
            });
            // Fragment particles
            for (var f = 0; f < 8; f++) {
                particles.push({
                    heroIdx: heroIdx, sloIdx: i,
                    oxJ: rand(-8, 8), oyJ: rand(-8, 8),
                    txJ: rand(-15, 15), tyJ: rand(-15, 15),
                    mxRel: rand(-.5, .5),
                    myMix: rand(.2, .7),
                    myJ: rand(-.15, .15),
                    size: rand(1, 2.5),
                    delay: rand(0, .08), speed: rand(.8, 1.1),
                    wAmp: rand(10, 40), wFreq: rand(1, 4), wPh: rand(0, Math.PI*2),
                    gold: Math.random() < .35,
                    dust: true
                });
            }
        });
        // Extra dust (sin letra concreta de destino, vuela hacia los lados)
        for (var i = 0; i < 50; i++) {
            particles.push({
                heroIdx: Math.floor(Math.random() * validHeroLetters.length),
                sloIdx: 0, // referencia para altura aproximada de destino
                oxJ: rand(-12, 12), oyJ: rand(-12, 12),
                txOverride: rand(-1, 1), // si presente, destino = W * (this+1)/2 + offset
                tyJ: rand(-80, 80),
                mxRel: rand(-.5, .5),
                myMix: rand(.3, .7),
                myJ: 0,
                size: rand(.8, 2),
                delay: rand(0, .1), speed: rand(.75, 1.1),
                wAmp: rand(15, 45), wFreq: rand(1, 4), wPh: rand(0, Math.PI*2),
                gold: Math.random() < .5,
                dust: true,
                fly: true // marca: este se va volando lateralmente
            });
        }
        initialized = true;
    }

    var sloganTrack = document.getElementById('sloganTrack');
   // Fracción del track en la que ocurre el viaje. Después, hold del slogan.
    var TRAVEL_FRACTION = 0.45;

    function getProgress() {
        var startScroll = 15;
        var trackTop = sloganTrack.offsetTop;
        var trackH = sloganTrack.offsetHeight;
        // Final del scroll útil: cuando el track libera al usuario
        var endScroll = trackTop + (trackH - window.innerHeight);
        var range = endScroll - startScroll;
        if (range <= 0) return 0;
        // Avance bruto del scroll dentro del track (0→1)
        var raw = Math.max(0, Math.min(1, (window.scrollY - startScroll) / range));
        // Compresión: el viaje completo (0→1) ocurre en TRAVEL_FRACTION del track,
        // y luego se queda en 1 (hold) durante el resto.
        return Math.min(1, raw / TRAVEL_FRACTION);
    }

    /* STAGGERED hero letter opacity — each letter fades at its own time */
    function updateHeroLetters(progress) {
        allHeroLetters.forEach(function (l) {
            var stagger = parseFloat(l.dataset.stagger) || 0;
            var fadeStart = 0.02 + stagger;
            var fadeEnd = fadeStart + 0.12;
            var op;
            if (progress <= fadeStart) op = 1;
            else if (progress >= fadeEnd) op = 0;
            else op = 1 - (progress - fadeStart) / (fadeEnd - fadeStart);
            l.style.transition = 'none';
            l.style.opacity = op;
        });
    }

    // Cache de posiciones en viewport.
    // heroVP se cachea UNA VEZ al inicio (cuando hero está en su posición natural visible).
    // sloVP se recalcula cada frame (el slogan es sticky y siempre está visible).
    var heroVP = [];
    var sloVP = [];

    function updateHeroPositions() {
        heroVP.length = 0;
        for (var i = 0; i < validHeroLetters.length; i++) {
            var r = validHeroLetters[i].getBoundingClientRect();
            heroVP.push({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
        }
    }

    function updateSloganPositions() {
        sloVP.length = 0;
        for (var j = 0; j < sloganLetters.length; j++) {
            var s = sloganLetters[j].getBoundingClientRect();
            sloVP.push({ x: s.left + s.width / 2, y: s.top + s.height / 2 });
        }
    }

    function renderParticles() {
        if (!initialized) { requestAnimationFrame(renderParticles); return; }
        var progress = getProgress();
        var now = performance.now() / 1000;
        var W = window.innerWidth, H = window.innerHeight;
        ctx.clearRect(0, 0, W, H);

        // Hero stagger fade
        updateHeroLetters(progress);

        if (progress <= 0) {
            sloganLetters.forEach(function (s) { s.style.opacity = '0'; });
            sloganSub.classList.remove('visible');
            sloganEyebrow.classList.remove('visible');
            requestAnimationFrame(renderParticles);
            return;
        }
        if (progress >= 1) {
            sloganLetters.forEach(function (s) { s.style.opacity = '1'; });
            sloganSub.classList.add('visible');
            sloganEyebrow.classList.add('visible');
            requestAnimationFrame(renderParticles);
            return;
        }
        if (progress < .92) {
            sloganSub.classList.remove('visible');
            sloganEyebrow.classList.remove('visible');
        } else {
            sloganSub.classList.add('visible');
            sloganEyebrow.classList.add('visible');
        }

       // Hero y slogan: posiciones actuales en viewport, cada frame.
        // El hero se mueve con el scroll, el slogan está sticky pero también se mide.
        updateHeroPositions();
        updateSloganPositions();
        if (!heroVP.length || !sloVP.length) {
            requestAnimationFrame(renderParticles);
            return;
        }

        particles.forEach(function (p) {
            var t = Math.max(0, Math.min(1, (progress - p.delay) * p.speed / (1 - p.delay)));
            var et = easeIO(t);

            // Origen y destino actuales (viewport)
            var hp = heroVP[p.heroIdx] || heroVP[0];
            var sp = sloVP[p.sloIdx] || sloVP[0];

            var ox = hp.x + p.oxJ;
            var oy = hp.y + p.oyJ;
            var tx, ty;
            if (p.fly) {
                // Dust extra: vuela hacia un lado, altura cercana al slogan
                tx = (p.txOverride < 0 ? -50 + (p.txOverride + 1) * 50 : W + 50 - p.txOverride * 50);
                ty = sp.y + p.tyJ;
            } else {
                tx = sp.x + p.txJ;
                ty = sp.y + p.tyJ;
            }

            // Punto medio de la curva Bezier
            var mx = W / 2 + p.mxRel * W;
            var my = oy + (ty - oy) * p.myMix + p.myJ * H;

            var vx = qBez(et, ox, mx, tx);
            var vy = qBez(et, oy, my, ty);

            // Wobble: máximo a mitad de viaje
            var wm = Math.sin(et * Math.PI) * 0.8;
            vx += Math.sin(now * p.wFreq + p.wPh) * p.wAmp * wm;
            vy += Math.cos(now * p.wFreq * .8 + p.wPh + 1) * p.wAmp * .5 * wm;

            // Alpha
            var a;
            if (p.dust) {
                a = t < .02 ? t/.02 : t > .7 ? Math.max(0, (1-t)/.3) : 1;
                a *= .55;
            } else {
                a = t < .02 ? t/.02 : t > .88 ? Math.max(0, (1-t)/.12) : 1;
                a *= .85;
            }

            // Tamaño
            var sz = p.size;
            if (t > .9 && !p.dust) sz *= (1-t) / .1;
            sz *= (.95 + .05 * Math.sin(now * 3 + p.wPh));
            if (sz < .2) sz = 0;

            if (a > .01 && sz > 0) {
                var col = p.gold ? '#FFD400' : '#fff';
                ctx.beginPath(); ctx.arc(vx, vy, sz*3, 0, Math.PI*2);
                ctx.fillStyle = col; ctx.globalAlpha = a * .1; ctx.fill();
                ctx.beginPath(); ctx.arc(vx, vy, sz, 0, Math.PI*2);
                ctx.fillStyle = col; ctx.globalAlpha = a; ctx.fill();
            }

            // Reveal de letras del slogan (solo partículas main, no dust)
            if (!p.dust && p.sloIdx < sloganLetters.length) {
                var lt = t > .78 ? Math.min(1, (t-.78)/.22) : 0;
                var current = parseFloat(sloganLetters[p.sloIdx].style.opacity) || 0;
                if (lt > current) sloganLetters[p.sloIdx].style.opacity = lt;
            }
        });

        // Forzar opacidad final
        if (progress > .88) {
            var fo = Math.min(1, (progress - .88) / .12);
            sloganLetters.forEach(function (s) {
                var c = parseFloat(s.style.opacity) || 0;
                if (fo > c) s.style.opacity = fo;
            });
        }

        ctx.globalAlpha = 1;
        requestAnimationFrame(renderParticles);
    }

    window.addEventListener('load', function () {
        setTimeout(function () { initParticles(); requestAnimationFrame(renderParticles); }, 600);
    });
    var rTimer;
    window.addEventListener('resize', function () {
        clearTimeout(rTimer);
        rTimer = setTimeout(function () { if (initialized) initParticles(); }, 250);
    });

    // Scroll indicator (hero)
    window.addEventListener('scroll', function () {
        document.getElementById('scrollInd').classList.toggle('hide', window.scrollY > 20);
    }, { passive: true });

    // Scroll indicator (slogan): aparece cuando el viaje termina y el slogan se mantiene
    var sloganScrollInd = document.getElementById('sloganScrollInd');
    var lastSloganScroll = window.scrollY;
    function updateSloganScrollInd() {
        var p = getProgress();
        // Aparece tras el viaje (progress=1), desaparece si el usuario empieza a scrollear de nuevo
        var inHold = p >= 0.98;
        var movedRecently = Math.abs(window.scrollY - lastSloganScroll) > 5;
        if (inHold && !movedRecently) {
            sloganScrollInd.classList.add('show');
            sloganScrollInd.classList.remove('hide');
        } else {
            sloganScrollInd.classList.remove('show');
        }
        // Tras 1.5s sin movimiento dentro del hold, lo mostramos
    }
    var sloganIndleTimer;
    window.addEventListener('scroll', function () {
        var now = window.scrollY;
        var moved = Math.abs(now - lastSloganScroll) > 2;
        lastSloganScroll = now;
        sloganScrollInd.classList.remove('show');
        sloganScrollInd.classList.add('hide');
        clearTimeout(sloganIndleTimer);
        sloganIndleTimer = setTimeout(function () {
            if (getProgress() >= 0.98) {
                sloganScrollInd.classList.remove('hide');
                sloganScrollInd.classList.add('show');
            }
        }, 1200);
    }, { passive: true });

    /* ═══════════════════════════════════════
       TEAM — gold line + center mark + pop-in
       ═══════════════════════════════════════ */
    var teamSection = document.getElementById('team');
    var goldLine = document.getElementById('goldLine');
    var centerMark = document.getElementById('centerMark');
    var personImgs = document.querySelectorAll('.person-img');

    function positionGoldLine() {
        if (personImgs.length < 2) return;
        var row = document.getElementById('photosRow');
        var rowRect = row.getBoundingClientRect();
        var r0 = personImgs[0].getBoundingClientRect();
        var r1 = personImgs[1].getBoundingClientRect();

        // Vertical center of the photos (relative to photos-row)
        var photoMidY = r0.top + r0.height / 2 - rowRect.top;

        // Horizontal: extend 12px into each photo so line visually touches circle edge
        var overlap = 12;
        var lineLeft = r0.right - rowRect.left - overlap;
        var lineRight = r1.left - rowRect.left + overlap;
        var lineWidth = lineRight - lineLeft;
        var lineCenterX = lineLeft + lineWidth / 2;

        goldLine.style.top = photoMidY + 'px';
        goldLine.style.left = lineCenterX + 'px';
        goldLine.style.width = lineWidth + 'px';
        goldLine.style.transform = 'translate(-50%, -50%)' + (goldLine.classList.contains('show') ? '' : ' scaleX(0)');

        centerMark.style.top = photoMidY + 'px';
    }

    var teamTrack = document.getElementById('teamTrack');
    var teamPositioned = false;

    function getTeamProgress() {
        if (!teamTrack) return 0;
        var trackTop = teamTrack.offsetTop;
        var trackH = teamTrack.offsetHeight;
        var range = trackH - window.innerHeight;
        if (range <= 0) return 0;
        return Math.max(0, Math.min(1, (window.scrollY - trackTop) / range));
    }

    function updateTeamScene() {
        var p = getTeamProgress();

        // 0–0.25: aparecen las personas (pop-in)
        if (p > 0.02) teamSection.classList.add('active');
        else teamSection.classList.remove('active');

        // 0.25–0.55: aparece la línea dorada
        if (p > 0.25) {
            if (!teamPositioned) { positionGoldLine(); teamPositioned = true; }
            goldLine.classList.add('show');
            goldLine.style.transform = 'translate(-50%, -50%) scaleX(1)';
        } else {
            goldLine.classList.remove('show');
            goldLine.style.transform = 'translate(-50%, -50%) scaleX(0)';
        }

        // 0.55–0.80: aparece el círculo BLEND
        if (p > 0.55) centerMark.classList.add('show');
        else centerMark.classList.remove('show');
    }

    window.addEventListener('scroll', updateTeamScene, { passive: true });
    window.addEventListener('resize', function () {
        teamPositioned = false;
        if (goldLine.classList.contains('show')) {
            positionGoldLine();
            teamPositioned = true;
        }
    });
    // Inicializar
    updateTeamScene();

    /* ═══════════════════════════════════════
       TRIANGLE EXPANSION (team → artista)
       Line attached to circle, descends past names
       Ultra-flat triangle, rapid fill
       ═══════════════════════════════════════ */
    var expansionZone = document.getElementById('expansionZone');
    var goldLayer = document.getElementById('goldLayer');
    var artistContent = document.getElementById('artistContent');
    var artistSection = document.getElementById('artist');
    var artistVisible = false;

    function updateTriangle() {
        var zr = expansionZone.getBoundingClientRect();
        var vh = window.innerHeight;
        var progress = Math.max(0, Math.min(1, (vh - zr.top) / (zr.height + vh * 0.05)));

        if (progress <= 0) {
            goldLayer.style.clipPath = 'polygon(49.97% 50%, 50.03% 50%, 50.03% 50%, 50.03% 50%, 49.97% 50%, 49.97% 50%)';
            goldLayer.style.opacity = '0';
            return;
        }

        // Track center dot — line starts from BOTTOM edge of circle
        var dotRect = centerMark.getBoundingClientRect();
        var dotBottomY = Math.max(-10, (dotRect.bottom) / vh * 100);

        /*
         * 6-POINT POLYGON:
         *
         *   1────2            ← thin line (top, at circle)
         *   │    │
         *   │    │
         *   6    3            ← bottom of line = vertex of triangle
         *    \  /
         *     \/
         *   5────4            ← base of triangle (spreads from vertex)
         *
         * Phase 1 (0→0.45): Line descends. Points 3-6 collapsed at bottom.
         * Phase 2 (0.45→0.65): Triangle opens FROM bottom of line.
         *   Points 1,2 stay thin at top. Points 3,6 stay at vertex.
         *   Points 4,5 spread outward+downward from vertex.
         * Phase 3 (0.65→1.0): Everything expands to fill screen.
         */

        // 6 points: [x,y] each
        var p1x, p1y, p2x, p2y, p3x, p3y, p4x, p4y, p5x, p5y, p6x, p6y;

        if (progress <= 0.38) {
            // Phase 1: thin line descends
            var t1 = progress / 0.38;
            var e1 = t1 < 0.5 ? 2*t1*t1 : 1 - Math.pow(-2*t1+2, 2) / 2;
            var botY = dotBottomY + e1 * 75;

            p1x = 49.97; p1y = dotBottomY;
            p2x = 50.03; p2y = dotBottomY;
            p3x = 50.03; p3y = botY;
            p4x = 50.03; p4y = botY;  // collapsed
            p5x = 49.97; p5y = botY;  // collapsed
            p6x = 49.97; p6y = botY;

        } else if (progress <= 0.58) {
            // Phase 2: triangle opens from bottom vertex
            var t2 = (progress - 0.38) / 0.2;
            var e2 = t2 < 0.5 ? 2*t2*t2 : 1 - Math.pow(-2*t2+2, 2) / 2;
            var lineEnd = dotBottomY + 75;

            // Points 1,2: stay at top (thin line)
            p1x = 49.97; p1y = dotBottomY;
            p2x = 50.03; p2y = dotBottomY;
            // Points 3,6: vertex — stay at bottom of line
            p3x = 50.03; p3y = lineEnd;
            p6x = 49.97; p6y = lineEnd;
            // Points 4,5: spread outward and downward from vertex
            p4x = 50.03 + e2 * 90;
            p4y = lineEnd + e2 * 15;
            p5x = 49.97 - e2 * 90;
            p5y = lineEnd + e2 * 15;

        } else {
            // Phase 3: expand everything to fill screen
            var t3 = (progress - 0.58) / 0.42;
            var e3 = t3 < 0.5 ? 2*t3*t3 : 1 - Math.pow(-2*t3+2, 2) / 2;
            var lineEnd = dotBottomY + 75;

            // Phase 2 end values → full screen
            p1x = 49.97 - e3 * 60;   p1y = dotBottomY - e3 * (dotBottomY + 15);
            p2x = 50.03 + e3 * 60;   p2y = dotBottomY - e3 * (dotBottomY + 15);
            p3x = 50.03 + e3 * 60;   p3y = lineEnd - e3 * (lineEnd + 15);
            p4x = 140.03;            p4y = (lineEnd + 15) + e3 * (115 - lineEnd - 15);
            p5x = -40.03;            p5y = (lineEnd + 15) + e3 * (115 - lineEnd - 15);
            p6x = 49.97 - e3 * 60;   p6y = lineEnd - e3 * (lineEnd + 15);
        }

        goldLayer.style.clipPath = 'polygon(' +
            p1x+'% '+p1y+'%, '+
            p2x+'% '+p2y+'%, '+
            p3x+'% '+p3y+'%, '+
            p4x+'% '+p4y+'%, '+
            p5x+'% '+p5y+'%, '+
            p6x+'% '+p6y+'%)';
        goldLayer.style.opacity = progress > 0.02 ? '1' : String(progress / 0.02);
    }

    /* ═══════════════════════════════════════
       ARTISTA VISIBILITY
       Fixed at viewport center — only opacity changes
       ═══════════════════════════════════════ */
    function updateArtistVisibility() {
        var rect = artistSection.getBoundingClientRect();
        var vh = window.innerHeight;
        var scrollThrough = (vh - rect.top) / rect.height;

        // Visible casi todo el track: aparece pronto, mantiene durante el hold,
        // se va al final antes de soltar a la siguiente sección.
        if (scrollThrough > 0.08 && scrollThrough < 0.92) {
            if (!artistVisible) {
                artistVisible = true;
                artistContent.style.opacity = '';
                artistContent.classList.add('visible');
            }
        } else {
            if (artistVisible) {
                artistVisible = false;
                artistContent.classList.remove('visible');
            }
        }
    }

    window.addEventListener('scroll', function () {
        updateTriangle();
        updateArtistVisibility();
    }, { passive: true });

    /* ═══════════════════════════════════════
       ARTIST SKILLS
       ═══════════════════════════════════════ */
    var skills = [
        'armoniza el caos',
        'pensamiento múltiple y complejo',
        'motivación intrínseca',
        'piensa de manera no-lineal',
        'desarrolla estrategias de riesgo controlado',
        'entiende la crisis como renovación',
        'se nutre de la transdisciplinariedad',
        'da sentido',
        'se siente conectado',
        'alinea',
        'crea communitas',
        'duda',
        'abraza lo irracional',
        'tiene una metodología flexible',
        'necesita trascender',
        'necesita autotransformación',
        'capacidad de búsqueda',
        'salta entre lo concreto y lo abstracto',
        'es un entusiasta',
        'es un aprendiz',
        'tiene pensamiento mágico'
    ];
    var skillText = document.getElementById('skillText');
    var skillIdx = 0, skillsRunning = false;
    var shuffled = [].concat(skills);
    function shuffle(a) { for (var i = a.length-1; i > 0; i--) { var j = Math.floor(Math.random()*(i+1)); var t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
    function showFirstSkill() {
        skillText.textContent = shuffled[skillIdx];
        skillText.classList.add('show');
        skillIdx++;
        if (skillIdx >= shuffled.length) { skillIdx = 0; shuffled = shuffle([].concat(skills)); }
    }
    function nextSkill() {
        skillText.classList.remove('show');
        setTimeout(function () {
            skillText.textContent = shuffled[skillIdx];
            skillText.classList.add('show');
            skillIdx++;
            if (skillIdx >= shuffled.length) { skillIdx = 0; shuffled = shuffle([].concat(skills)); }
        }, 400);
    }

    var artistObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
            if (e.isIntersecting && !skillsRunning) {
                skillsRunning = true;
                shuffled = shuffle([].concat(skills));
                showFirstSkill();
                setInterval(nextSkill, 1600);
            }
        });
    }, { threshold: 0.05 });
    artistObs.observe(document.getElementById('artist'));

    /* ═══════════════════════════════════════
       WORK — CHALLENGE ANIMATIONS
       Initial reveal + periodic single-letter effects
       ═══════════════════════════════════════ */

    var symbols = '※◆▲ψΣ∂∆φ∇ξ□●◊';

    // Helper: get only letter spans (skip spaces & periods)
    function getLetterSpans(el) {
        var text = el.getAttribute('data-text');
        var spans = el.querySelectorAll('span:not(.cursor)');
        var result = [];
        text.split('').forEach(function(l, i) {
            if (l !== ' ' && l !== '.' && spans[i]) result.push(spans[i]);
        });
        return result;
    }

    // Helper: wrap text in spans
    function wrapInSpans(el) {
        var text = el.getAttribute('data-text');
        el.innerHTML = text.split('').map(function(l) {
            return '<span style="display:inline-block">' + (l === ' ' ? '&nbsp;' : l) + '</span>';
        }).join('');
    }

    /* ── INITIAL EFFECTS (run once on reveal) ── */

    function initGlitch(el, cb) {
        var text = el.getAttribute('data-text');
        var letters = text.split('');
        el.innerHTML = letters.map(function(l) {
            return '<span style="display:inline-block">' + (l === ' ' ? '&nbsp;' : symbols[Math.floor(Math.random() * symbols.length)]) + '</span>';
        }).join('');
        el.classList.add('animate');
        var spans = el.querySelectorAll('span');
        var resolved = letters.map(function() { return false; });
        var iterations = 0;
        var interval = setInterval(function() {
            spans.forEach(function(span, i) {
                if (letters[i] === ' ' || letters[i] === '.') { span.textContent = letters[i] === ' ' ? '\u00A0' : '.'; resolved[i] = true; return; }
                if (!resolved[i] && iterations > i * 1.2 + Math.random() * 3) {
                    span.textContent = letters[i]; resolved[i] = true;
                } else if (!resolved[i]) {
                    span.textContent = symbols[Math.floor(Math.random() * symbols.length)];
                }
            });
            iterations++;
            if (resolved.every(function(r) { return r; })) { clearInterval(interval); if (cb) cb(); }
        }, 45);
    }

    function initJitter(el, cb) {
        wrapInSpans(el);
        el.classList.add('animate');
        var spans = el.querySelectorAll('span');
        var frame = 0, total = 28;
        function anim() {
            var d = Math.max(0, 1 - frame / total);
            spans.forEach(function(s) {
                if (s.textContent.trim() === '' || s.textContent === '.') return;
                s.style.transform = 'translate(' + ((Math.random()-.5)*6*d) + 'px,' + ((Math.random()-.5)*4*d) + 'px) rotate(' + ((Math.random()-.5)*8*d) + 'deg)';
            });
            frame++;
            if (frame <= total) requestAnimationFrame(anim);
            else { spans.forEach(function(s) { s.style.transform = ''; }); if (cb) cb(); }
        }
        anim();
    }

    function initTypewriter(el, cb) {
        var text = el.getAttribute('data-text');
        el.textContent = '';
        el.classList.add('animate');
        var cursor = document.createElement('span');
        cursor.className = 'cursor';
        el.appendChild(cursor);
        var i = 0;
        var interval = setInterval(function() {
            if (i < text.length) {
                el.insertBefore(document.createTextNode(text[i]), cursor);
                i++;
            } else {
                clearInterval(interval);
                setTimeout(function() {
                    // Remove cursor and re-wrap in spans for periodic effects
                    if (cursor.parentNode) cursor.parentNode.removeChild(cursor);
                    wrapInSpans(el);
                    if (cb) cb();
                }, 800);
            }
        }, 55);
    }

    function initFadeIn(el, cb) {
        wrapInSpans(el);
        el.classList.add('animate');
        if (cb) setTimeout(cb, 500);
    }

    /* ── PERIODIC EFFECTS (run forever, one letter at a time) ── */

    // COMPLEJIDAD: one letter becomes a random symbol briefly
    function periodicSymbol(el) {
        var spans = getLetterSpans(el);
        if (!spans.length) return;
        var idx = Math.floor(Math.random() * spans.length);
        var span = spans[idx];
        var original = span.textContent;
        span.textContent = symbols[Math.floor(Math.random() * symbols.length)];
        span.classList.add('glow');
        setTimeout(function() {
            span.textContent = original;
            span.classList.remove('glow');
        }, 700);
    }

    // INCERTIDUMBRE: one letter shakes briefly
    function periodicJitter(el) {
        var spans = getLetterSpans(el);
        if (!spans.length) return;
        var idx = Math.floor(Math.random() * spans.length);
        var span = spans[idx];
        span.classList.add('glow');
        var frame = 0;
        function shake() {
            var d = Math.max(0, 1 - frame / 10);
            span.style.transform = 'translate(' + ((Math.random()-.5)*6*d) + 'px,' + ((Math.random()-.5)*4*d) + 'px) rotate(' + ((Math.random()-.5)*8*d) + 'deg)';
            frame++;
            if (frame <= 10) requestAnimationFrame(shake);
            else { span.style.transform = ''; span.classList.remove('glow'); }
        }
        shake();
    }

    // AUTOMATIZACIÓN: one letter blinks out and retypes
    function periodicRetype(el) {
        var spans = getLetterSpans(el);
        if (!spans.length) return;
        var idx = Math.floor(Math.random() * spans.length);
        var span = spans[idx];
        var original = span.textContent;
        span.textContent = '▌';
        span.classList.add('glow');
        setTimeout(function() {
            span.textContent = original;
            setTimeout(function() { span.classList.remove('glow'); }, 400);
        }, 350);
    }

    // FALTA DE SENTIDO: one letter flips horizontally
    function periodicFlip(el) {
        var spans = getLetterSpans(el);
        if (!spans.length) return;
        var idx = Math.floor(Math.random() * spans.length);
        var span = spans[idx];
        span.classList.add('glow');
        span.style.transform = 'scaleX(-1)';
        setTimeout(function() {
            span.style.transform = '';
            span.classList.remove('glow');
        }, 700);
    }

    /* ── ORCHESTRATION ── */

    var challenges = document.querySelectorAll('.challenge');
    var workEyebrow = document.getElementById('workEyebrow');
    var challengeTriggered = false;

    var initEffects = [initGlitch, initJitter, initTypewriter, initFadeIn];
    var periodicEffects = [periodicSymbol, periodicJitter, periodicRetype, periodicFlip];
    // Different intervals so they never sync: 3s, 3.7s, 4.3s, 2.5s
    var periodicIntervals = [3000, 3700, 4300, 2500];
    // Initial delays before periodic starts (staggered)
    var periodicDelays = [600, 1400, 2100, 800];

    function startPeriodicForChallenge(idx) {
        var el = challenges[idx];
        var fn = periodicEffects[idx];
        var interval = periodicIntervals[idx];
        setTimeout(function() {
            fn(el);
            setInterval(function() { fn(el); }, interval);
        }, periodicDelays[idx]);
    }

    var challengeObs = new IntersectionObserver(function(entries) {
        entries.forEach(function(e) {
            if (e.isIntersecting && !challengeTriggered) {
                challengeTriggered = true;
                if (workEyebrow) workEyebrow.classList.add('visible');
                // Sequential initial reveal
                challenges.forEach(function(ch, idx) {
                    setTimeout(function() {
                        initEffects[idx](ch, function() {
                            // After initial effect completes, start periodic
                            startPeriodicForChallenge(idx);
                        });
                    }, idx * 600);
                });
            }
        });
    }, { threshold: 0.2 });
    if (challenges.length) challengeObs.observe(challenges[0]);

    // Work lines: standard fade-in
    var workObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.3 });
    document.querySelectorAll('.work-line').forEach(function (line, i) {
        line.style.transitionDelay = (i * 0.25) + 's';
        workObs.observe(line);
    });

    // Contact button: reveal + toggle form
    var contactBtn = document.getElementById('contactBtn');
    var contactForm = document.getElementById('contactForm');
    if (contactBtn) {
        workObs.observe(contactBtn);
        contactBtn.style.transitionDelay = '1s';
        contactBtn.addEventListener('click', function() {
            contactForm.classList.toggle('open');
        });
    }

    })();
