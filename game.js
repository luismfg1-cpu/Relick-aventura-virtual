// ==========================================
// MOTOR DEL JUEGO Y LÓGICA - RELICK
// ==========================================

// Función de ayuda para seleccionar elementos del HTML más rápido
const $ = id => document.getElementById(id);

// --- SISTEMA DE AUDIO ---
const AudioSystem = {
    tracks: { combate: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3' },
    currentTrack: null, audio: new Audio(), isMuted: false, hasInteracted: false,
    
    init() { 
        this.audio.loop = true; 
        this.audio.volume = 0.25; 
    },
    
    userInteracted() { 
        if (!this.hasInteracted) { 
            this.hasInteracted = true; 
            if (!this.isMuted && this.currentTrack) { 
                let playPromise = this.audio.play(); 
                if (playPromise !== undefined) playPromise.catch(e => console.log(e)); 
            } 
        } 
    },
    
    play(trackName) { 
        if (this.currentTrack === trackName) return; 
        this.currentTrack = trackName; 
        this.audio.src = this.tracks[trackName]; 
        if (this.hasInteracted && !this.isMuted) { 
            let playPromise = this.audio.play(); 
            if (playPromise !== undefined) { 
                playPromise.catch(e => { 
                    this.isMuted = true; 
                    $('btn-audio').innerText = '🔈'; 
                    $('btn-audio').classList.add('muted'); 
                }); 
            } 
        } 
    },
    
    toggleMute() { 
        this.isMuted = !this.isMuted; 
        this.hasInteracted = true; 
        const btn = $('btn-audio'); 
        if (this.isMuted) { 
            this.audio.pause(); 
            btn.innerText = '🔈'; 
            btn.classList.add('muted'); 
        } else { 
            if (this.currentTrack) this.audio.play().catch(e => console.log(e)); 
            btn.innerText = '🔊'; 
            btn.classList.remove('muted'); 
        } 
    }
}; 

AudioSystem.init();

// --- INICIO AUTOMÁTICO AL CARGAR LA PÁGINA ---
window.addEventListener('DOMContentLoaded', () => { 
    document.body.addEventListener('click', () => AudioSystem.userInteracted(), {once:true}); 
    Game.iniciar('prueba');
});

// --- MOTOR PRINCIPAL DEL JUEGO ---
const Game = {
    modo: null, fases: ['DRAW', 'COMBAT', 'ACTION', 'END'], faseIdx: 0, esPrimerTurnoDelJuego: true, turnoActivo: 'p1', 
    p1: null, p2: null, habPendienteParaDado: null, cartaEspecialPendiente: null, subtituloEspecialPendiente: null, selectingFromMemoria: false, pendingCofreAction: null, isYunoRerollActivo: false,
    sucuboPendiente: null,

    // --- FUNCIÓN DE AYUDA CLAVE PARA EL ARTE DE LAS CARTAS ---
    getCardArtHtml(carta) {
        if (!carta || !carta.img) return { html: carta ? `<span class="text-[8px] font-black absolute inset-0 flex items-center justify-center p-1 text-center leading-tight z-10">${carta.nombre}</span>` : '', css: null };
        if (carta.tipo === 'HABILIDAD') {
            return {
                html: `<div style="position:absolute; width:140%; height:140%; top:50%; left:50%; transform:translate(-50%, -50%) rotate(-90deg); background-image:url('${carta.img}'); background-size:cover; background-position:center; z-index:0;"></div>`,
                css: null
            };
        } else {
            return {
                html: '',
                css: `background-image:url('${carta.img}'); background-size:cover; background-position:center;`
            };
        }
    },

    resetState() {
        const defaultPlayerState = () => ({ lp: 8, pr: 0, mazo: [], mano: [], memoria: [], acciones: 0, habEnseñada: false, ataqueUsado: false, rerollUsado: false, jessicaUsada: false, derrotado: false, canjeUsadoEsteTurno: false, besoSucuboIndestructible: false, canjesBloqueados: false, equiposRelikario: [], campo: { bonus: null, canje1: null, canje2: null, equipo: null, hab0: null, hab300: null, hab500: null, hab1000: null } });
        this.p1 = defaultPlayerState(); this.p2 = defaultPlayerState();
        this.faseIdx = 0; this.esPrimerTurnoDelJuego = true; this.turnoActivo = 'p1';
        this.selectedHandIdx = null; this.selectedFieldSlot = null; this.dadoPendiente = null; this.habPendienteParaDado = null; this.cartaEspecialPendiente = null; this.subtituloEspecialPendiente = null; this.selectingFromMemoria = false; this.pendingCofreAction = null; this.isYunoRerollActivo = false; this.sucuboPendiente = null;
        this.setRivalStatus("");
    },

    iniciar(modoElegido) {
        this.modo = modoElegido || 'prueba'; 
        $('game-root').style.display = 'flex'; 
        AudioSystem.play('combate'); 
        this.resetState();
        
        const rivalNameEl = $('rival-name-label'), rivalIconEl = $('rival-avatar-icon');
        rivalNameEl.innerText = "TEST BOT"; rivalIconEl.innerText = "🧪";
        
        // Mano y mazo de prueba personalizados (incluyendo Código Konami)
        this.p1.mazo = ["ataque", "ataque", "ataque", "jessica", "disquete", "bomba"]; 
        this.p1.mano = [DB["shuffle"], DB["ataque"], DB["codigoKonami"], DB["dadoDoble"], DB["besoSucubo"], DB["tnt"], DB["barreraEnergia"], DB["restosPerenazana"]]; 
        this.p1.pr = 500; 
        
        this.p2.mazo = ["ataque", "ataque", "ataque", "jessica", "disquete", "bomba"]; 
        this.p2.mano = [DB["shuffle"], DB["ataque"], DB["hoja"], DB["senshuni"], DB["tanqueEnergia"], DB["dadoDoble"], DB["restosPerenazana"]]; 
        this.p2.pr = 500;

        [this.p1, this.p2].forEach(p => { this.reponerBonus(p); });
        this.faseIdx = 0; this.updatePhaseUI(); this.render(); this.lanzarDadosIniciales();
    },

    volverAlMenu() {
        $('overlay-endgame').style.display = 'none'; 
        this.iniciar('prueba');
    },

    animarCarta(sourceEl, targetEl, color, texto, callback) {
        if (!sourceEl || !targetEl) { if (callback) callback(); return; }
        const rectOrigen = sourceEl.getBoundingClientRect(), rectDestino = targetEl.getBoundingClientRect();
        const clone = document.createElement('div');
        clone.style.cssText = `position:fixed; left:${rectOrigen.left}px; top:${rectOrigen.top}px; width:${rectOrigen.width}px; height:${rectOrigen.height}px; background-color:${color || '#4a0404'}; border:2px solid white; border-radius:5px; color:black; display:flex; flex-direction:column; align-items:center; justify-content:center; font-size:9px; font-weight:900; text-align:center; text-transform:uppercase; z-index:9999; transition:all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1); box-shadow:0 10px 25px rgba(0,0,0,0.8); padding:4px;`;
        clone.innerHTML = texto; document.body.appendChild(clone); void clone.offsetWidth;
        clone.style.left = rectDestino.left + 'px'; clone.style.top = rectDestino.top + 'px'; clone.style.width = rectDestino.width + 'px'; clone.style.height = rectDestino.height + 'px'; clone.style.opacity = '0.8'; 
        setTimeout(() => { clone.remove(); if (callback) callback(); }, 400); 
    },

    animarCartaEfectoSucubo(fromPlayer, toPlayer, slotId, carta, callback) {
        const targetEl = $(`${toPlayer === 'p1' ? 'p' : 'r'}-slot-${slotId}`);
        if (!targetEl) { callback(); return; }
        const rectDestino = targetEl.getBoundingClientRect();
        
        const clone = document.createElement('div');
        clone.style.cssText = `position:fixed; left:50%; top:50%; transform:translate(-50%, -50%); width:70px; height:95px; background-color:${carta.color}; border:2px solid white; border-radius:5px; color:black; display:flex; flex-direction:column; align-items:center; justify-content:center; font-size:9px; font-weight:900; text-align:center; text-transform:uppercase; z-index:9999; transition:all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1); box-shadow:0 10px 25px rgba(0,0,0,0.8); padding:4px;`;
        if(carta.img) { clone.style.backgroundImage = `url('${carta.img}')`; clone.style.backgroundSize = 'cover'; clone.style.backgroundPosition = 'center'; } else { clone.innerHTML = carta.nombre; }
        document.body.appendChild(clone); void clone.offsetWidth;
        
        clone.style.left = rectDestino.left + 'px'; clone.style.top = rectDestino.top + 'px'; clone.style.width = rectDestino.width + 'px'; clone.style.height = rectDestino.height + 'px'; clone.style.transform = 'none';
        
        setTimeout(() => { clone.remove(); callback(); }, 400); 
    },

    jugarCartaConAnimacion(jugador, idxMano, targetSlotId, accionCallback) {
        const isP1 = jugador === 'p1'; const p = isP1 ? this.p1 : this.p2; const carta = p.mano[idxMano];
        const handContainer = isP1 ? $('player-hand') : $('rival-hand-visual'); const visualIdx = isP1 ? idxMano : 0; 
        let sourceEl = handContainer ? handContainer.children[visualIdx] : null, targetEl = null;
        if (targetSlotId === 'memoria') targetEl = $(isP1 ? 'p-mem-count' : 'r-mem-count').parentElement; else targetEl = $(`${isP1 ? 'p' : 'r'}-slot-${targetSlotId}`);
        if (sourceEl) sourceEl.style.opacity = '0'; 
        this.animarCarta(sourceEl, targetEl, carta.color, isP1 || carta.nombre ? carta.nombre : '', () => { accionCallback(); });
    },

    mostrarPantallaFin(mensaje, esVictoria) {
        let finalMensaje = mensaje;
        finalMensaje += `<br><br><span class="text-blue-400 font-black tracking-widest text-[10px] drop-shadow-md">ENTORNO DE PRUEBAS FINALIZADO</span>`; 
        const titulo = $('endgame-title');
        titulo.innerText = esVictoria ? "¡VICTORIA!" : "¡DERROTA!"; titulo.className = `text-5xl font-black mb-4 ${esVictoria ? 'text-green-500 shadow-green-500' : 'text-red-600 shadow-red-600'} drop-shadow-md uppercase tracking-widest text-center`;
        $('endgame-subtitle').innerHTML = finalMensaje; $('overlay-endgame').style.display = 'flex';
    },

    robar(p) { if (p.mazo.length > 0) p.mano.push(DB[p.mazo.pop()]); },
    reponerBonus(p) { if (!p.campo.bonus && p.mazo.length > 0) p.campo.bonus = DB[p.mazo.pop()]; },

    nextPhase(auto = false) {
        if (this.turnoActivo !== 'p1') return; 
        if (!auto && this.faseIdx === 0) {
            if (this.verificarBesoSucubo('p1', () => { this._procederSiguienteFase(); })) return;
        }
        if (!auto && this.faseIdx === 0) return;
        
        this._procederSiguienteFase();
    },

    _procederSiguienteFase() {
        if (this.faseIdx >= 3) return; 
        this.faseIdx++; this.updatePhaseUI();
        if (this.faseIdx === 3) { 
            const perenazanas = this.p1.equiposRelikario.filter(c => c.id === 'restosPerenazana').length;
            if (perenazanas > 0) {
                this.p1.lp += perenazanas; if (this.p1.lp > 8) this.p1.lp = 8;
                this.notify(`¡Restos de Perenazana! +${perenazanas} HP`);
                this.render();
            }
            setTimeout(() => { this.esPrimerTurnoDelJuego = false; this.turnoActivo = 'p2'; this.ejecutarTurnoRival(); }, 1200); 
        } 
        else if (this.faseIdx < this.fases.length) { this.render(); }
    },

    updatePhaseUI() {
        this.fases.forEach((f, i) => {
            const el = $(`p-${f}`); if (!el) return;
            el.className = `phase-item ${i === this.faseIdx ? 'active' : ''}`;
            if (f === 'ACTION') {
                const rest = this.turnoActivo === 'p1' ? 2 - this.p1.acciones : 2 - this.p2.acciones; const color = rest > 0 ? 'text-blue-400' : 'text-red-500';
                el.innerHTML = `${f}<br><span class="text-[12px] font-black ${color}">${rest} REST</span>`;
            } else { el.innerHTML = f; }
        });

        const statusEl = $('game-status-msg');
        if (statusEl) {
            const isPlayerTurn = this.turnoActivo === 'p1'; const turnText = isPlayerTurn ? 'TU TURNO' : 'TURNO RIVAL'; const restCount = isPlayerTurn ? 2 - this.p1.acciones : 2 - this.p2.acciones;
            const phaseHints = { 'DRAW': 'Robando carta(s)', 'COMBAT': 'Ataca o Enseña Habilidad', 'ACTION': `Tienes ${restCount} acciones`, 'END': 'Finalizando...' }; const currentPhase = this.fases[this.faseIdx];
            statusEl.className = `bg-black px-5 py-2 text-[11px] md:text-sm ${isPlayerTurn ? 'text-blue-400' : 'text-red-500'} uppercase font-black border ${isPlayerTurn ? 'border-blue-500/30' : 'border-red-500/30'} rounded-full flex items-center justify-center gap-1.5 md:gap-2 transition-all duration-300 z-10 max-w-[95%] text-center leading-tight shadow-[0_0_10px_rgba(0,0,0,0.8)]`;
            statusEl.innerHTML = `<span class="w-2 h-2 rounded-full ${isPlayerTurn ? 'bg-blue-500' : 'bg-red-500'} flex-shrink-0 animate-pulse"></span> <span class="flex-shrink-0 tracking-[1px]">${turnText}</span> <span class="text-white mx-1 font-normal opacity-50 flex-shrink-0">•</span> <span class="text-gray-200 text-[9px] md:text-[11px] tracking-wide font-bold normal-case">${phaseHints[currentPhase]}</span>`;
        }
    },

    setRivalStatus(text) { const el = $('r-status'); if (el) el.innerText = text; },

    intentarAfectarCarta(playerObj, slot) {
        let carta = playerObj.campo[slot];
        if (!carta) return false;
        if (carta.id === "besoSucubo" && playerObj.besoSucuboIndestructible) {
            this.notify("¡Súcubo es INDESTRUCTIBLE este turno!");
            return false;
        }
        if (carta.barrera) {
            playerObj.memoria.push(carta.barrera);
            carta.barrera = null;
            this.notify("¡BARRERA DE ENERGÍA INTERCEPTÓ EL EFECTO!");
            this.render();
            return false;
        }
        if (carta.perenazana) {
            playerObj.memoria.push(carta.perenazana);
            carta.perenazana = null;
        }
        return true;
    },

    verificarBesoSucubo(targetPlayer, callback) {
        const p = targetPlayer === 'p1' ? this.p1 : this.p2;
        let slotsConSucubo = [];
        if (p.campo.canje1?.id === "besoSucubo") slotsConSucubo.push('canje1');
        if (p.campo.canje2?.id === "besoSucubo") slotsConSucubo.push('canje2');
        if (p.campo.bonus?.id === "besoSucubo") slotsConSucubo.push('bonus');
        
        if (slotsConSucubo.length > 0) {
            this.ejecutarSecuenciaSucubo(targetPlayer, slotsConSucubo, callback);
            return true;
        }
        return false;
    },

    ejecutarSecuenciaSucubo(targetPlayer, slots, finalCallback) {
        if (slots.length === 0) { finalCallback(); return; }
        const slot = slots.shift();
        
        const p = targetPlayer === 'p1' ? this.p1 : this.p2;
        if (p.campo[slot]?.id !== 'besoSucubo') {
            this.ejecutarSecuenciaSucubo(targetPlayer, slots, finalCallback);
            return;
        }
        
        this.lanzarDadoSucubo(targetPlayer, slot, () => {
            this.ejecutarSecuenciaSucubo(targetPlayer, slots, finalCallback);
        });
    },

    lanzarDadoSucubo(targetPlayer, slot, callback) {
        this.sucuboPendiente = { player: targetPlayer, slot: slot, callback: callback };
        const isP1 = targetPlayer === 'p1';
        const statusMsg = $('game-status-msg'); if(statusMsg) statusMsg.style.opacity = '0';
        const overlay = $('overlay-dice'), arena = $('dice-arena'), res = $('dice-result'), title = $('dice-title');
        
        if(!overlay || !arena || !res || !title) return;
        
        title.innerText = "BESO DE SÚCUBO";
        res.innerHTML = `<span class="text-gray-400 text-sm">${isP1 ? "Lanzas" : "Rival lanza"} dado de Súcubo...</span>`;
        arena.innerHTML = `<div id="dice-cube" class="w-32 h-32 bg-white rounded-3xl flex items-center justify-center text-8xl text-black font-black shadow-[0_0_50px_white]">🎲</div>`;
        overlay.style.display = 'flex';
        
        let i = 0; const cubeEl = $('dice-cube');
        const t = setInterval(() => {
            if(cubeEl) cubeEl.innerText = Math.floor(Math.random()*6)+1;
            if(i++ > 15) { 
                clearInterval(t); let roll = Math.floor(Math.random()*6)+1; if(cubeEl) cubeEl.innerText = roll; 
                this.evaluarSucubo(roll);
            }
        }, 80);
    },

    evaluarSucubo(roll) {
        const res = $('dice-result'); if(!res) return;
        const { player, slot, callback } = this.sucuboPendiente;
        const pActivo = player === 'p1' ? this.p1 : this.p2;
        const isP1 = player === 'p1';
        
        this.checkDestruccionPor1([roll], player);

        let msg = '', colorClass = '', fn = null;
        if (roll <= 2) {
            msg = "-2 VIDAS + BLOQUEO"; colorClass = "text-red-500";
            fn = () => { 
                pActivo.lp -= 2; if (pActivo.lp <= 0) pActivo.lp = 0;
                pActivo.besoSucuboIndestructible = true;
                pActivo.canjesBloqueados = true;
            };
        } else if (roll <= 4) {
            msg = "-1 DAÑO NO LETAL"; colorClass = "text-yellow-400";
            fn = () => { this.aplicarDanoNoLetal(pActivo, 1); };
        } else {
            msg = "SÚCUBO DESTRUIDA"; colorClass = "text-green-400";
            fn = () => {
                const carta = pActivo.campo[slot];
                if(carta.barrera) { pActivo.memoria.push(carta.barrera); carta.barrera = null; }
                if(carta.perenazana) { pActivo.memoria.push(carta.perenazana); carta.perenazana = null; }
                pActivo.memoria.push(carta); pActivo.campo[slot] = null;
                if (slot === 'bonus') this.reponerBonus(pActivo);
                this.checkCanjes(pActivo); 
            };
        }
        
        if (!isP1) {
            res.innerHTML = `<div class="${colorClass} text-2xl font-black mb-2">${msg}</div>`;
            setTimeout(() => {
                if (fn) fn();
                $('overlay-dice').style.display = 'none';
                const statusMsg = $('game-status-msg'); if(statusMsg) statusMsg.style.opacity = '1';
                this.render(); 
                if(pActivo.derrotado || pActivo.lp <= 0) {
                    this.mostrarPantallaFin("¡SÚCUBO MORTAL! RIVAL ELIMINADO", true); return;
                }
                callback();
            }, 2500);
            return;
        }
        
        res.innerHTML = `<div class="${colorClass} text-2xl font-black mb-2">${msg}</div><div class="mt-4 flex justify-center"><button class="bg-blue-600 text-white px-6 py-2 rounded-full font-bold text-xs" onclick="Game.cerrarDadoSucubo()">Aceptar</button></div>`;
        this.sucuboPendiente.fn = fn;
    },
    
    cerrarDadoSucubo() {
        const { player, fn, callback } = this.sucuboPendiente;
        const pActivo = player === 'p1' ? this.p1 : this.p2;
        if (fn) fn();
        
        const statusMsg = $('game-status-msg'); if(statusMsg) statusMsg.style.opacity = '1';
        $('overlay-dice').style.display = 'none';
        this.render();
        
        if(pActivo.lp <= 0 || pActivo.derrotado) {
            this.mostrarPantallaFin("¡BESO MORTAL! HAS SIDO DERROTADO", false);
            return;
        }
        callback();
    },

    ejecutarTurnoRival() {
        this.faseIdx = 0; this.updatePhaseUI(); this.setRivalStatus("Robando...");
        setTimeout(() => {
            if (this.p2.mano.length === 0) { this.robar(this.p2); this.robar(this.p2); this.robar(this.p2); } else { this.robar(this.p2); }
            this.p2.acciones = 0; this.p2.ataqueUsado = false; this.p2.habEnseñada = false; this.p2.rerollUsado = false; this.p2.jessicaUsada = false; this.p2.canjeUsadoEsteTurno = false;
            this.p2.besoSucuboIndestructible = false; this.p2.canjesBloqueados = false;
            this.render(); 
            if (this.verificarBesoSucubo('p2', () => { this.rivalCombat(); })) return;
            setTimeout(() => this.rivalCombat(), 1500);
        }, 1500);
    },

    rivalCombat() { this.faseIdx = 1; this.updatePhaseUI(); this.setRivalStatus("Pensando ataque..."); setTimeout(() => this.ejecutarPasoCombatRival(), 1000); },

    ejecutarPasoCombatRival() {
        if (this.turnoActivo !== 'p2') return;

        if (!this.p2.habEnseñada) {
            const targetSlotInfo = !this.p2.campo.hab0 ? { id: 'hab0', cost: 0 } : (!this.p2.campo.hab300) ? { id: 'hab300', cost: 300 } : (!this.p2.campo.hab500) ? { id: 'hab500', cost: 500 } : (!this.p2.campo.hab1000) ? { id: 'hab1000', cost: 1000 } : null;
            if (targetSlotInfo && this.p2.pr >= targetSlotInfo.cost) {
                const idxHab = this.p2.mano.findIndex(c => c.tipo === "HABILIDAD");
                if (idxHab > -1) {
                    this.jugarCartaConAnimacion('p2', idxHab, targetSlotInfo.id, () => {
                        this.p2.pr -= targetSlotInfo.cost; this.p2.campo[targetSlotInfo.id] = this.p2.mano.splice(idxHab, 1)[0]; this.p2.habEnseñada = true;
                        this.render(); setTimeout(() => this.ejecutarPasoCombatRival(), 800);
                    }); return; 
                }
            }
        }

        if (!this.p2.ataqueUsado) {
            if (this.esPrimerTurnoDelJuego) { this.p2.ataqueUsado = true; } 
            else {
                const habActiva = this.p2.campo.hab1000 || this.p2.campo.hab500 || this.p2.campo.hab300 || this.p2.campo.hab0;
                if (habActiva) {
                    const idxAtq = this.p2.mano.findIndex(c => c.tipo === "ATAQUE");
                    if (idxAtq > -1) {
                        this.jugarCartaConAnimacion('p2', idxAtq, 'memoria', () => {
                            this.p2.memoria.push(this.p2.mano.splice(idxAtq, 1)[0]); this.p2.ataqueUsado = true; this.render();
                            this.setRivalStatus("¡Atacando!"); const diceTitle = $('dice-title'); if (diceTitle) diceTitle.innerText = "ATAQUE DEL RIVAL";
                            this.lanzarDado(habActiva);
                        }); return; 
                    }
                }
                this.p2.ataqueUsado = true;
            }
        }

        if (!this.p2.jessicaUsada) {
            if (this.esPrimerTurnoDelJuego) { this.p2.jessicaUsada = true; } 
            else {
                let jessicaCard = null;
                if (this.p2.campo.bonus?.id === 'jessica') jessicaCard = this.p2.campo.bonus; else if (this.p2.campo.canje1?.id === 'jessica') jessicaCard = this.p2.campo.canje1; else if (this.p2.campo.canje2?.id === 'jessica') jessicaCard = this.p2.campo.canje2;
                if (jessicaCard) { this.p2.jessicaUsada = true; this.setRivalStatus("¡Jessica ataca!"); this.lanzarDadoEspecial(jessicaCard, "Jessica del rival ataca..."); return; }
                this.p2.jessicaUsada = true; 
            }
        }
        this.rivalAction();
    },

    rivalAction() { this.faseIdx = 2; this.updatePhaseUI(); this.setRivalStatus("Planificando..."); setTimeout(() => this.ejecutarPasoActionRival(), 1000); },

    ejecutarPasoActionRival() {
        if (this.turnoActivo !== 'p2') return;

        if (this.p2.acciones < 2 && !this.p2.campo.equipo) {
            const idxEq = this.p2.mano.findIndex(c => c.tipo === "EQUIPO");
            if (idxEq > -1) {
                this.jugarCartaConAnimacion('p2', idxEq, 'equipo', () => {
                    this.p2.campo.equipo = this.p2.mano.splice(idxEq, 1)[0]; this.p2.acciones++; this.updatePhaseUI(); this.render(); setTimeout(() => this.ejecutarPasoActionRival(), 500);
                }); return;
            }
        }

        if (this.p2.acciones < 2) {
            const idxActivar = this.p2.mano.findIndex(c => (c.tipo === "CÓDIGO" && c.id !== "dadoDoble" && c.id !== "codigoKonami") || (c.id === "guang") || (c.id === "c-ro") || (c.id === "besoSucubo"));
            if (idxActivar > -1) {
                const carta = this.p2.mano[idxActivar];
                if (carta.id === "besoSucubo") {
                    this.p2.acciones++; this.p2.mano.splice(idxActivar, 1); this.updatePhaseUI(); this.render(); this.ejecutarEfecto(carta, 'p2'); 
                    return;
                } else {
                    this.jugarCartaConAnimacion('p2', idxActivar, 'memoria', () => {
                        this.p2.acciones++; this.p2.memoria.push(this.p2.mano.splice(idxActivar, 1)[0]); this.updatePhaseUI(); this.render(); this.ejecutarEfecto(carta, 'p2'); 
                    }); return; 
                }
            }
        }

        if (this.p2.acciones < 2 && this.p2.mano.length > 0 && !this.p2.canjeUsadoEsteTurno && !this.p2.canjesBloqueados) {
            let jessicaEnPeligro = (this.p2.campo.bonus?.id === 'jessica' || this.p2.campo.canje1?.id === 'jessica' || this.p2.campo.canje2?.id === 'jessica');
            let targetSlot = !this.p2.campo.canje1 ? 'canje1' : (!this.p2.campo.canje2 ? 'canje2' : null);
            if (targetSlot && !jessicaEnPeligro) {
                let idx = this.p2.mano.findIndex(c => c.tipo === "ATAQUE"); if (idx === -1) idx = 0; 
                this.p2.canjeUsadoEsteTurno = true; 
                this.jugarCartaConAnimacion('p2', idx, targetSlot, () => {
                    this.p2.campo[targetSlot] = this.p2.mano.splice(idx, 1)[0]; this.p2.acciones++; this.checkCanjes(this.p2); this.updatePhaseUI(); this.render(); setTimeout(() => this.ejecutarPasoActionRival(), 500);
                }); return;
            }
        }
        this.setRivalStatus("Terminando..."); setTimeout(() => this.terminarTurnoRival(), 1000);
    },

    terminarTurnoRival() {
        this.faseIdx = 3; this.updatePhaseUI(); this.setRivalStatus("");
        const perenazanas = this.p2.equiposRelikario.filter(c => c.id === 'restosPerenazana').length;
        if (perenazanas > 0) {
            this.p2.lp += perenazanas; if (this.p2.lp > 8) this.p2.lp = 8;
            this.notify(`¡Restos de Perenazana! Rival +${perenazanas} HP`);
            this.render();
        }
        setTimeout(() => {
            this.esPrimerTurnoDelJuego = false; this.turnoActivo = 'p1';
            this.p1.acciones = 0; this.p1.habEnseñada = false; this.p1.ataqueUsado = false; this.p1.rerollUsado = false; this.p1.jessicaUsada = false; this.p1.canjeUsadoEsteTurno = false;
            this.p1.besoSucuboIndestructible = false; this.p1.canjesBloqueados = false;
            if (this.p1.mano.length === 0) { this.robar(this.p1); this.robar(this.p1); this.robar(this.p1); } else { this.robar(this.p1); }
            this.render(); this.faseIdx = 0; this.updatePhaseUI(); 
            setTimeout(() => { 
                 if (this.verificarBesoSucubo('p1', () => { this._procederSiguienteFase(); })) return;
                 this._procederSiguienteFase();
            }, 1500);
        }, 1500);
    },

    clickSlot(slotId) {
        if (this.turnoActivo !== 'p1') return;
        if (this.selectedHandIdx === null) { if (this.p1.campo[slotId]) this.showFieldDetail(slotId); return; }
        const idx = this.selectedHandIdx; const carta = this.p1.mano[idx]; const fase = this.fases[this.faseIdx];
        if (fase === 'DRAW' || fase === 'END') return;
        
        if (slotId.startsWith('hab')) {
            if (carta.tipo !== 'HABILIDAD' || fase !== 'COMBAT' || this.p1.habEnseñada) { this.notify("SOLO 1 HABILIDAD EN COMBAT"); return; }
            let cost = parseInt(slotId.replace('hab', '')) || 0; if (this.p1.pr < cost) { this.notify(`NECESITAS ${cost} PR`); return; }
        }
        if (slotId === 'equipo' && (carta.tipo !== 'EQUIPO' || fase !== 'ACTION' || this.p1.acciones >= 2)) return;
        if (slotId.startsWith('canje') && (fase !== 'ACTION' || this.p1.acciones >= 2)) return;
        if (slotId.startsWith('canje') && this.p1.canjesBloqueados) { this.notify("TUS CANJES ESTÁN BLOQUEADOS ESTE TURNO"); return; }
        if (slotId === 'bonus' || this.p1.campo[slotId]) return;

        if (carta.tipo === "COMBO") { this.notify("CARTA COMBO<br><span class='text-xs'>Se activa automáticamente en su momento.</span>"); return; }

        this.selectedHandIdx = null; 
        this.jugarCartaConAnimacion('p1', idx, slotId, () => {
            if (slotId.startsWith('hab')) { let cost = parseInt(slotId.replace('hab', '')) || 0; this.p1.pr -= cost; this.p1.habEnseñada = true; } 
            else if (slotId === 'equipo' || slotId.startsWith('canje')) { this.p1.acciones++; }
            this.p1.campo[slotId] = carta; this.p1.mano.splice(idx, 1); this.checkCanjes(this.p1); this.updatePhaseUI(); this.render();
        });
    },

    checkCanjes(p) {
        if (p.campo.canje1 !== null && p.campo.canje2 !== null) {
            if(p.campo.canje1.barrera) { p.memoria.push(p.campo.canje1.barrera); p.campo.canje1.barrera = null; }
            if(p.campo.canje1.perenazana) { p.memoria.push(p.campo.canje1.perenazana); p.campo.canje1.perenazana = null; }
            if(p.campo.canje2.barrera) { p.memoria.push(p.campo.canje2.barrera); p.campo.canje2.barrera = null; }
            if(p.campo.canje2.perenazana) { p.memoria.push(p.campo.canje2.perenazana); p.campo.canje2.perenazana = null; }
            
            p.memoria.push(p.campo.canje1, p.campo.canje2); p.campo.canje1 = null; p.campo.canje2 = null;
            
            if (p.campo.bonus !== null) { 
                if(p.campo.bonus.barrera) { p.memoria.push(p.campo.bonus.barrera); p.campo.bonus.barrera = null; }
                if(p.campo.bonus.perenazana) { p.memoria.push(p.campo.bonus.perenazana); p.campo.bonus.perenazana = null; }
                p.mano.push(p.campo.bonus); p.campo.bonus = null; 
                this.reponerBonus(p); 
            }
        }
    },

    showChoiceOptions(titleHTML, options) {
        const overlay = $('overlay-choice'); if(!overlay) return;
        overlay.innerHTML = `<h2 class="text-2xl text-red-500 font-black mb-8 text-center uppercase tracking-widest leading-tight">${titleHTML}</h2>`;
        const container = document.createElement('div'); container.className = 'choice-options-container w-full px-4';
        options.forEach(opt => { 
            if (opt.card) {
                const wrapper = document.createElement('div'); wrapper.className = 'flex items-center bg-[#1a1a1a] border border-gray-600 rounded-lg p-2 gap-3 w-full shadow-[0_5px_15px_rgba(0,0,0,0.8)]';
                const imgDiv = document.createElement('div'); imgDiv.className = 'w-[60px] h-[85px] shrink-0 bg-cover bg-center border border-white/20 cursor-pointer rounded overflow-hidden relative flex justify-center items-center';
                const art = Game.getCardArtHtml(opt.card);
                imgDiv.innerHTML = art.html;
                if(art.css) { imgDiv.style.cssText += art.css; } else { imgDiv.style.backgroundColor = opt.card.color; }
                const eyeHint = document.createElement('div'); eyeHint.className = 'absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity'; eyeHint.innerHTML = '🔍'; imgDiv.appendChild(eyeHint);
                imgDiv.onclick = (e) => { e.stopPropagation(); Game.showCardDetailOnly(opt.card); };
                const infoDiv = document.createElement('div'); infoDiv.className = 'flex-1 flex flex-col justify-center items-start min-w-0'; infoDiv.innerHTML = `<span class="font-black text-white text-[11px] mb-1 truncate w-full">${opt.text ? opt.text.replace('▶ ','').split(':')[0] : opt.card.nombre}</span><span class="text-[9px] font-bold ${opt.card.rareza === 'Común' ? 'text-gray-400' : (opt.card.rareza === 'Rara' ? 'text-blue-400' : 'text-yellow-400')} mb-2 uppercase tracking-widest">${opt.card.rareza || opt.card.tipo}</span>`;
                const btn = document.createElement('button'); btn.className = 'bg-red-600 hover:bg-red-500 text-white font-black py-2 px-4 rounded uppercase text-[10px] w-full shadow-[0_0_10px_rgba(255,0,60,0.3)] transition-all active:scale-95 border border-red-400'; btn.innerText = opt.btnText || 'ELEGIR'; btn.onclick = () => { overlay.style.display = 'none'; opt.action(); this.render(); };
                infoDiv.appendChild(btn); wrapper.appendChild(imgDiv); wrapper.appendChild(infoDiv); container.appendChild(wrapper);
            } else {
                const btn = document.createElement('button'); btn.className = 'bg-[#1a1a1a] border-2 border-red-600 text-white p-4 w-full font-bold rounded-lg shadow-[0_5px_15px_rgba(0,0,0,0.8)] hover:bg-red-900 active:bg-red-800 transition-all uppercase tracking-wider text-xs text-left pl-6 relative overflow-hidden'; btn.innerHTML = opt.text; btn.onclick = () => { overlay.style.display = 'none'; opt.action(); this.render(); }; container.appendChild(btn); 
            }
        });
        overlay.appendChild(container); overlay.style.display = 'flex';
    },

    baseShowDetail(c, actionsHtml, customArtRender = null) {
        $('det-name').innerHTML = c.nombre; $('det-type').innerHTML = c.tipo; $('det-effect').innerHTML = c.efecto;
        const art = $('det-art');
        if (art) {
            art.className = `shrink-0 rounded-xl border-4 border-white mb-6 flex items-center justify-center font-black text-2xl text-black relative overflow-hidden ${c.tipo === 'HABILIDAD' ? 'w-64 h-48 md:w-80 md:h-60' : 'w-48 h-64 md:w-60 md:h-80'}`;
            if (customArtRender) customArtRender(art);
            else { 
                const artData = Game.getCardArtHtml(c);
                art.innerHTML = artData.html || (c.img ? '' : 'ARTE');
                if (artData.css) { art.style.cssText = `${artData.css}; border-color:${c.color}; background-color:transparent;`; }
                else { art.style.cssText = `background-color:${c.color}; border-color:white; background-image:none;`; }
            }
        }
        if($('det-actions')) $('det-actions').innerHTML = actionsHtml;
        $('overlay-detail').style.display = 'flex';
    },

    createActionBtn(text, colorClass, actionType) { return `<button id="action-btn-${actionType}" class="${colorClass} px-4 py-3 rounded-full font-black uppercase tracking-widest text-xs w-full shadow-lg text-white mt-2" onclick="event.stopPropagation(); Game.autoPlay('${actionType}')">${text}</button>`; },

    showCardDetailOnly(c) {
        this.selectedFieldSlot = null; this.selectedHandIdx = null;
        this.baseShowDetail(c, '<span class="text-blue-400 text-[10px] text-center font-bold border border-blue-500/50 bg-blue-900/30 p-3 rounded-lg uppercase tracking-widest w-full shadow-[0_0_10px_rgba(0,210,255,0.2)]">VISTA PREVIA<br><br><span class="text-white text-xs">Cierra esta ventana para volver a tu elección.</span></span>');
    },

    autoPlay(actionType) {
        if (this.turnoActivo !== 'p1') return;

        if (actionType === 'jessica_attack') {
            if (this.esPrimerTurnoDelJuego) { this.notify("EL PRIMER JUGADOR NO PUEDE ATACAR"); return; }
            const cartaEnCampo = this.p1.campo[this.selectedFieldSlot]; this.p1.jessicaUsada = true; this.closeDetail(); this.lanzarDadoEspecial(cartaEnCampo, "Jessica ataca..."); return;
        }

        const idx = this.selectedHandIdx; const carta = this.p1.mano[idx]; if (!carta) return;

        if (actionType === 'ataque') {
            if (this.esPrimerTurnoDelJuego) { this.notify("EL PRIMER JUGADOR NO PUEDE ATACAR"); return; }
            if (this.p1.ataqueUsado) { this.notify("SOLO 1 ATAQUE POR TURNO"); return; }
            const habsDisponibles = []; ['hab0', 'hab300', 'hab500', 'hab1000'].forEach(slot => { if (this.p1.campo[slot]) habsDisponibles.push(this.p1.campo[slot]); });
            if (habsDisponibles.length === 0) { this.notify("ENSEÑA HABILIDAD PRIMERO"); return; }

            if (habsDisponibles.length === 1) {
                this.closeDetail(); this.selectedHandIdx = null;
                this.jugarCartaConAnimacion('p1', idx, 'memoria', () => {
                    this.p1.ataqueUsado = true; this.p1.memoria.push(this.p1.mano.splice(idx, 1)[0]); this.render();
                    const dt = $('dice-title'); if(dt) dt.innerText = "ATAQUE EN CURSO";
                    this.lanzarDado(habsDisponibles[0]);
                });
            } else {
                this.closeDetail(); this.selectedHandIdx = null;
                let options = habsDisponibles.map(h => { return { card: h, btnText: 'ATACAR', action: () => {
                    this.jugarCartaConAnimacion('p1', idx, 'memoria', () => {
                        this.p1.ataqueUsado = true; this.p1.memoria.push(this.p1.mano.splice(idx, 1)[0]); this.render();
                        const dt = $('dice-title'); if(dt) dt.innerText = "ATAQUE EN CURSO";
                        this.lanzarDado(h);
                    });
                }}});
                options.push({ text: "CANCELAR", action: () => { this.render(); } });
                this.showChoiceOptions("ELIGE HABILIDAD", options);
            }
            return;
        }

        if (actionType === 'habilidad') {
            let targetSlot = null; let cost = 0;
            if (!this.p1.campo.hab0) { targetSlot = 'hab0'; cost = 0; } else if (!this.p1.campo.hab300) { targetSlot = 'hab300'; cost = 300; } else if (!this.p1.campo.hab500) { targetSlot = 'hab500'; cost = 500; } else if (!this.p1.campo.hab1000) { targetSlot = 'hab1000'; cost = 1000; }
            if (!targetSlot) { this.notify("ZONA DE HABILIDADES LLENA"); return; }
            if (this.p1.pr < cost) { this.notify(`NECESITAS ${cost} PR`); return; }
            this.closeDetail(); this.selectedHandIdx = null;
            this.jugarCartaConAnimacion('p1', idx, targetSlot, () => {
                this.p1.pr -= cost; this.p1.campo[targetSlot] = carta; this.p1.mano.splice(idx, 1); this.p1.habEnseñada = true; this.updatePhaseUI(); this.render();
            }); return;
        }

        if (actionType === 'equipo') {
            if (this.p1.acciones >= 2) { this.notify("SIN ACCIONES (REST)"); return; }
            this.closeDetail(); this.selectedHandIdx = null;
            this.jugarCartaConAnimacion('p1', idx, 'equipo', () => {
                this.p1.campo.equipo = carta; this.p1.mano.splice(idx, 1); this.p1.acciones++; this.updatePhaseUI(); this.render();
            }); return;
        }

        if (actionType === 'canje') {
            if (this.p1.acciones >= 2) { this.notify("SIN ACCIONES"); return; }
            if (this.p1.canjesBloqueados) { this.notify("TUS CANJES ESTÁN BLOQUEADOS ESTE TURNO"); return; }
            let targetSlot = !this.p1.campo.canje1 ? 'canje1' : (!this.p1.campo.canje2 ? 'canje2' : null);
            if (!targetSlot) { this.notify("ZONAS LLENAS"); return; }
            this.closeDetail(); this.selectedHandIdx = null;
            this.jugarCartaConAnimacion('p1', idx, targetSlot, () => {
                this.p1.campo[targetSlot] = carta; this.p1.mano.splice(idx, 1); this.p1.acciones++; this.checkCanjes(this.p1); this.updatePhaseUI(); this.render();
            }); return;
        }

        if (actionType === 'activar') {
            if (this.p1.acciones >= 2) { this.notify("SIN ACCIONES"); return; }
            this.closeDetail(); this.selectedHandIdx = null;
            
            if (carta.id === "besoSucubo") {
                this.p1.acciones++; this.p1.mano.splice(idx, 1); this.updatePhaseUI(); this.render();
                this.ejecutarEfecto(carta, 'p1');
                return;
            }

            this.jugarCartaConAnimacion('p1', idx, 'memoria', () => {
                this.p1.acciones++; this.p1.memoria.push(carta); this.p1.mano.splice(idx, 1); this.updatePhaseUI(); this.render(); this.ejecutarEfecto(carta, 'p1');
            }); return;
        }
    },

    checkDestruccionPor1(rollsArray, playerStr) {
        if (rollsArray.includes(1)) {
            const p = playerStr === 'p1' ? this.p1 : this.p2;
            const idx = p.equiposRelikario.findIndex(c => c.id === 'restosPerenazana');
            if (idx > -1) {
                p.memoria.push(p.equiposRelikario.splice(idx, 1)[0]);
                setTimeout(() => { this.notify(`¡Sacaste un 1!<br><span class="text-xs">Restos de Perenazana (${playerStr === 'p1' ? 'Tú' : 'Rival'}) se pudrió y fue destruida.</span>`); this.render(); }, 500);
            }
        }
    },

    ejecutarEfecto(carta, targetPlayer = 'p1') {
        const pActivo = targetPlayer === 'p1' ? this.p1 : this.p2; const pRival = targetPlayer === 'p1' ? this.p2 : this.p1;
        
        if (carta.id === "codigoKonami") {
            if (targetPlayer === 'p1') {
                this.p1.lp = 8; this.robar(this.p1); this.robar(this.p1);
                this.notify("↑↑↓↓←→←→BA<br>¡HP al máximo y robas 2 cartas!"); this.render();
            } else {
                this.p2.lp = 8; this.robar(this.p2); this.robar(this.p2);
                this.notify("¡Rival usó Código Konami!"); this.render();
                setTimeout(() => this.ejecutarPasoActionRival(), 1500);
            }
        }
        else if (carta.id === "disquete") {
            if (targetPlayer === 'p1') {
                const opciones = [];
                if (this.p1.memoria.length > 1) opciones.push({ text: "▶ TU MEMORIA", action: () => { this.selectingFromMemoria = true; this.notify("Selecciona de tu memoria..."); this.showMemoria('player'); }});
                if (this.p2.memoria.length > 0) opciones.push({ text: "▶ MEMORIA RIVAL", action: () => { this.selectingFromMemoria = true; this.notify("Selecciona de memoria rival..."); this.showMemoria('rival'); }});
                if (opciones.length > 0) this.showChoiceOptions("CÓDIGO: DISQUETE<br><span class='text-sm text-gray-400 capitalize'>¿De dónde quieres recuperar?</span>", opciones); 
                else this.notify("¡CÓDIGO ACTIVADO!<br><span class='text-sm'>Pero no hay cartas para recuperar.</span>");
            } else {
                let memElegida = null, targetStr = '';
                if (this.p2.memoria.length > 1 && this.p1.memoria.length > 0) { memElegida = Math.random() > 0.5 ? this.p2.memoria : this.p1.memoria; targetStr = memElegida === this.p2.memoria ? 'su propia memoria' : 'tu memoria'; } 
                else if (this.p2.memoria.length > 1) { memElegida = this.p2.memoria; targetStr = 'su propia memoria'; } 
                else if (this.p1.memoria.length > 0) { memElegida = this.p1.memoria; targetStr = 'tu memoria'; }

                if (memElegida) {
                    let maxIdx = memElegida.length - 1; if (memElegida === this.p2.memoria) maxIdx -= 1; 
                    const memIndex = Math.floor(Math.random() * (maxIdx + 1)); const cartaRecuperada = memElegida.splice(memIndex, 1)[0]; this.p2.mano.push(cartaRecuperada);
                    this.notify(`¡RIVAL USA DISQUETE!<br><span class='text-sm'>Roba de ${targetStr}: ${cartaRecuperada.nombre}</span>`); this.render(); setTimeout(() => this.ejecutarPasoActionRival(), 2000);
                } else { this.notify("¡RIVAL USA DISQUETE!<br><span class='text-sm'>Pero no hay cartas previas.</span>"); setTimeout(() => this.ejecutarPasoActionRival(), 1000); }
            }
        }
        else if (carta.id === "bomba") {
            if (targetPlayer === 'p1') {
                this.showChoiceOptions("BOMBA DE TIEMPO", [
                    { text: "▶ EQUIPO", action: () => { 
                        if (this.p2.campo.equipo) { if (this.intentarAfectarCarta(this.p2, 'equipo')) { this.p2.memoria.push(this.p2.campo.equipo); this.p2.campo.equipo = null; this.notify("Equipo destruido."); } } else this.notify("Rival sin equipo."); 
                    }},
                    { text: "▶ MANO AL AZAR", action: () => { if (this.p2.mano.length > 0) { const d = this.p2.mano.splice(Math.floor(Math.random() * this.p2.mano.length), 1)[0]; this.p2.memoria.push(d); this.notify(`Carta destruida.`); } else this.notify("Mano rival vacía."); }},
                    { text: "▶ BONUS/CANJE", action: () => { 
                        if (this.p2.campo.canje2) { if(this.intentarAfectarCarta(this.p2, 'canje2')) { this.p2.memoria.push(this.p2.campo.canje2); this.p2.campo.canje2 = null; this.notify("Canje destruido."); } }
                        else if (this.p2.campo.canje1) { if(this.intentarAfectarCarta(this.p2, 'canje1')) { this.p2.memoria.push(this.p2.campo.canje1); this.p2.campo.canje1 = null; this.notify("Canje destruido."); } }
                        else if (this.p2.campo.bonus) { if(this.intentarAfectarCarta(this.p2, 'bonus')) { this.p2.memoria.push(this.p2.campo.bonus); this.p2.campo.bonus = null; this.reponerBonus(this.p2); this.notify("Bonus destruido."); } }
                        else this.notify("Nada en zonas."); 
                    }}
                ]);
            } else {
                this.notify("¡RIVAL USA BOMBA DE TIEMPO!");
                setTimeout(() => {
                    let destruido = false;
                    if (pRival.campo.equipo) { if (this.intentarAfectarCarta(pRival, 'equipo')) { pRival.memoria.push(pRival.campo.equipo); pRival.campo.equipo = null; this.notify("¡Tu equipo fue destruido!"); } destruido = true; }
                    else if (pRival.campo.canje2) { if (this.intentarAfectarCarta(pRival, 'canje2')) { pRival.memoria.push(pRival.campo.canje2); pRival.campo.canje2 = null; this.notify("¡Tu canje fue destruido!"); } destruido = true; }
                    else if (pRival.campo.canje1) { if (this.intentarAfectarCarta(pRival, 'canje1')) { pRival.memoria.push(pRival.campo.canje1); pRival.campo.canje1 = null; this.notify("¡Tu canje fue destruido!"); } destruido = true; }
                    else if (pRival.campo.bonus) { if (this.intentarAfectarCarta(pRival, 'bonus')) { pRival.memoria.push(pRival.campo.bonus); pRival.campo.bonus = null; this.reponerBonus(pRival); this.notify("¡Tu bonus fue destruido!"); } destruido = true; }
                    else if (pRival.mano.length > 0) { const d = pRival.mano.splice(Math.floor(Math.random() * pRival.mano.length), 1)[0]; pRival.memoria.push(d); this.notify("¡Una carta de tu mano destruida al azar!"); destruido = true; }
                    if (!destruido) this.notify("No había nada que destruir."); this.render(); setTimeout(() => this.ejecutarPasoActionRival(), 2000);
                }, 1500);
            }
        }
        else if (carta.id === "huevoAzul") {
            if (targetPlayer === 'p1') {
                const opciones = [];
                const addOpt = (player, slot, name) => {
                    if (player.campo[slot]) {
                        opciones.push({ text: `▶ DESTRUIR ${name}`, action: () => {
                            if (this.intentarAfectarCarta(player, slot)) { player.memoria.push(player.campo[slot]); player.campo[slot] = null; if (slot === 'bonus') this.reponerBonus(player); }
                            this.resolverHuevoAzulRobo();
                        }});
                    }
                };
                addOpt(this.p2, 'equipo', 'EQUIPO (RIVAL)'); addOpt(this.p2, 'bonus', 'BONUS (RIVAL)'); addOpt(this.p2, 'canje1', 'CANJE 1 (RIVAL)'); addOpt(this.p2, 'canje2', 'CANJE 2 (RIVAL)');
                addOpt(this.p1, 'equipo', 'MI EQUIPO'); addOpt(this.p1, 'bonus', 'MI BONUS'); addOpt(this.p1, 'canje1', 'MI CANJE 1'); addOpt(this.p1, 'canje2', 'MI CANJE 2');
                if (opciones.length > 0) { this.showChoiceOptions("OBJETIVO DE HUEVO AZUL", opciones); } else { this.notify("No hay NO-HABILIDADES en ningún campo."); this.resolverHuevoAzulRobo(); }
            } else {
                this.notify("¡RIVAL USA HUEVO AZUL EXPLOSIVO!");
                setTimeout(() => {
                    let targetsRival = ['equipo', 'bonus', 'canje1', 'canje2'].filter(s => pRival.campo[s]);
                    let targetsPropios = ['equipo', 'bonus', 'canje1', 'canje2'].filter(s => pActivo.campo[s]);
                    if (targetsRival.length > 0) {
                        let target = targetsRival[Math.floor(Math.random() * targetsRival.length)]; 
                        if (this.intentarAfectarCarta(pRival, target)) { pRival.memoria.push(pRival.campo[target]); pRival.campo[target] = null; if(target==='bonus') this.reponerBonus(pRival); this.notify(`¡Tu ${target.replace('canje', 'CANJE ')} fue destruido!`); }
                    } else if (targetsPropios.length > 0) {
                        let target = targetsPropios[Math.floor(Math.random() * targetsPropios.length)]; 
                        if (this.intentarAfectarCarta(pActivo, target)) { pActivo.memoria.push(pActivo.campo[target]); pActivo.campo[target] = null; if(target==='bonus') this.reponerBonus(pActivo); this.notify(`¡Rival destruyó su propio ${target.replace('canje', 'CANJE ')}!`); }
                    } else { this.notify("No había objetivos válidos en ningún campo."); }
                    if (this.p2.pr >= 200) {
                        this.p2.pr -= 200; this.robar(this.p2); setTimeout(() => { this.notify("¡Rival pagó 200 PR y robó 1 carta!"); this.render(); setTimeout(() => this.ejecutarPasoActionRival(), 1500); }, 1500);
                    } else { this.render(); setTimeout(() => this.ejecutarPasoActionRival(), 1500); }
                }, 1500);
            }
        }
        else if (carta.id === "boomerang") {
            if (targetPlayer === 'p1') {
                const opciones = [];
                if (this.p2.campo.equipo) opciones.push({ text: "▶ ROBAR EQUIPO RIVAL", action: () => { this.resolverBoomerang('equipo_rival', carta, 'p1'); }});
                if (this.p1.campo.equipo) opciones.push({ text: "▶ DEVOLVER MI EQUIPO", action: () => { this.resolverBoomerang('equipo_propio', carta, 'p1'); }});
                opciones.push({ text: "▶ 1 DAÑO NO LETAL", action: () => { this.resolverBoomerang('dano', carta, 'p1'); }});
                this.showChoiceOptions("CÓDIGO: BOOMERANG", opciones);
            } else {
                this.notify("¡RIVAL USA BOOMERANG!"); setTimeout(() => { let eleccion = 'dano'; if (this.p1.campo.equipo && Math.random() > 0.4) eleccion = 'equipo_rival'; this.resolverBoomerang(eleccion, carta, 'p2'); }, 1500);
            }
        }
        else if (carta.id === "paqueteProhibido") {
            if (targetPlayer === 'p1') {
                const poolTotal = Object.keys(DB).filter(k => k !== 'yuno' && k !== 'ataque');
                let cartasSobre = []; for(let i=0; i<3; i++) cartasSobre.push(DB[poolTotal[Math.floor(Math.random() * poolTotal.length)]]);
                let seleccionesRestantes = 2;
                const mostrarOpcionesSobre = () => {
                    let opciones = cartasSobre.map((c, index) => {
                        return { card: c, btnText: 'AÑADIR A MANO', action: () => {
                            this.p1.mano.push(c); cartasSobre.splice(index, 1); seleccionesRestantes--;
                            if (seleccionesRestantes > 0) { this.notify(`¡Has añadido ${c.nombre}! Elige 1 más.`); mostrarOpcionesSobre(); } else { this.notify(`¡Cartas añadidas a tu mano!`); this.updatePhaseUI(); this.render(); }
                        }};
                    });
                    this.showChoiceOptions(`PAQUETE PROHIBIDO<br><span class='text-sm text-gray-400 capitalize'>Elige ${seleccionesRestantes} carta(s) del sobre</span>`, opciones);
                };
                mostrarOpcionesSobre();
            } else {
                this.notify("¡RIVAL USA PAQUETE DE CARTAS PROHIBIDO!");
                setTimeout(() => {
                    const poolTotal = Object.keys(DB).filter(k => k !== 'yuno' && k !== 'ataque');
                    this.p2.mano.push(DB[poolTotal[Math.floor(Math.random() * poolTotal.length)]], DB[poolTotal[Math.floor(Math.random() * poolTotal.length)]]);
                    this.notify(`¡El rival añadió 2 cartas de fuera del juego a su mano!`); this.updatePhaseUI(); this.render(); setTimeout(() => this.ejecutarPasoActionRival(), 1500);
                }, 1500);
            }
        }
        else if (carta.id === "cintaMelocoton") { this.iniciarDueloCinta(carta, targetPlayer); }
        else if (carta.id === "senshuni") {
            if (targetPlayer === 'p1') { this.robar(this.p1); this.robar(this.p1); this.notify("¡Senshuni! Has robado 2 cartas."); this.render(); } else {
                this.notify("¡RIVAL USA SENSHUNI!"); setTimeout(() => { this.robar(this.p2); this.robar(this.p2); this.notify("El rival robó 2 cartas."); this.render(); setTimeout(() => this.ejecutarPasoActionRival(), 1500); }, 1500);
            }
        }
        else if (carta.id === "esferaPuntaje") {
            if (targetPlayer === 'p1') { this.p1.pr += 600; this.notify("¡Esfera de Puntaje! Ganas 600 PR."); this.render(); } else {
                this.notify("¡RIVAL USA ESFERA DE PUNTAJE!"); setTimeout(() => { this.p2.pr += 600; this.notify("El rival obtuvo 600 PR."); this.render(); setTimeout(() => this.ejecutarPasoActionRival(), 1500); }, 1500);
            }
        }
        else if (carta.id === "tripleAtaque") {
            const ataquesEnMazo = pActivo.mazo.filter(id => id === 'ataque');
            if (ataquesEnMazo.length >= 3) {
                let quitados = 0;
                for (let i = pActivo.mazo.length - 1; i >= 0; i--) { if (pActivo.mazo[i] === 'ataque' && quitados < 3) { pActivo.mazo.splice(i, 1); pActivo.mano.push(DB['ataque']); quitados++; } }
                this.notify(targetPlayer === 'p1' ? "¡Añadiste 3 Ataques a tu mano!" : "¡Rival añadió 3 Ataques a su mano!");
            } else { this.notify(targetPlayer === 'p1' ? "Efecto fallido: No hay 3 Ataques en el mazo." : "¡Efecto del rival falló!"); }
            this.render(); if (targetPlayer === 'p2') setTimeout(() => this.ejecutarPasoActionRival(), 1500);
        }
        else if (carta.id === "flauta") {
            if (targetPlayer === 'p1') {
                let opciones = [];
                const agregarOpciones = (playerObj, nombreJugador) => {
                    const slots = ['bonus', 'canje1', 'canje2', 'equipo', 'hab0', 'hab300', 'hab500', 'hab1000'];
                    slots.forEach(slot => {
                        if (playerObj.campo[slot]) {
                            opciones.push({ text: `▶ ${nombreJugador.toUpperCase()}: ${playerObj.campo[slot].nombre} <span class="text-gray-500 text-[9px]">(${slot})</span>`, card: playerObj.campo[slot], btnText: 'DEVOLVER AL MAZO', action: () => {
                                if (this.intentarAfectarCarta(playerObj, slot)) {
                                    const cardId = playerObj.campo[slot].id; playerObj.campo[slot] = null; playerObj.mazo.push(cardId); if (slot === 'bonus') this.reponerBonus(playerObj); this.notify(`¡${DB[cardId].nombre} volvió al tope del mazo!`);
                                }
                                this.render();
                            }});
                        }
                    });
                    playerObj.equiposRelikario.forEach((eq, idx) => {
                        opciones.push({ text: `▶ ${nombreJugador.toUpperCase()} (RELIKARIO): ${eq.nombre}`, card: eq, btnText: 'DEVOLVER AL MAZO', action: () => {
                            const cardId = eq.id; playerObj.equiposRelikario.splice(idx, 1); playerObj.mazo.push(cardId); this.notify(`¡${DB[cardId].nombre} volvió al tope del mazo!`); this.render();
                        }});
                    });
                };
                agregarOpciones(this.p2, "Rival"); agregarOpciones(this.p1, "Tú");
                if (opciones.length > 0) this.showChoiceOptions("FLAUTA DE MADERA", opciones); else this.notify("No hay cartas en el campo.");
            } else {
                this.notify("¡RIVAL USA FLAUTA DE MADERA!");
                setTimeout(() => {
                    let targetsPropios = []; const slots = ['bonus', 'canje1', 'canje2', 'equipo', 'hab0', 'hab300', 'hab500', 'hab1000'];
                    slots.forEach(slot => { if (this.p1.campo[slot]) targetsPropios.push({ type: 'campo', slot: slot, card: this.p1.campo[slot] }); });
                    this.p1.equiposRelikario.forEach((eq, idx) => { targetsPropios.push({ type: 'relikario', idx: idx, card: eq }); });
                    if (targetsPropios.length > 0) {
                        let target = targetsPropios[Math.floor(Math.random() * targetsPropios.length)], cardId = target.card.id;
                        if (target.type === 'campo') { 
                            if(this.intentarAfectarCarta(this.p1, target.slot)) { this.p1.campo[target.slot] = null; this.p1.mazo.push(cardId); if(target.slot === 'bonus') this.reponerBonus(this.p1); this.notify(`¡Tu ${target.card.nombre} fue devuelto al tope de tu mazo!`); }
                        } else { this.p1.equiposRelikario.splice(target.idx, 1); this.p1.mazo.push(cardId); this.notify(`¡Tu ${target.card.nombre} fue devuelto al tope de tu mazo!`); }
                    } else { this.notify("No había objetivos en tu campo."); }
                    this.render(); setTimeout(() => this.ejecutarPasoActionRival(), 2000);
                }, 1500);
            }
        }
        else if (carta.id === "tanqueEnergia") {
            if (targetPlayer === 'p1') {
                this.p1.lp += 2; if (this.p1.lp > 8) this.p1.lp = 8;
                let extraMsg = ""; if (this.p1.lp < this.p2.lp) { this.robar(this.p1); extraMsg = " ¡Robas 1 carta!"; }
                this.notify(`¡Tanque de Energía! +2 LP.${extraMsg}`); this.render();
            } else {
                this.notify("¡RIVAL USA TANQUE DE ENERGÍA!"); setTimeout(() => { 
                    this.p2.lp += 2; if (this.p2.lp > 8) this.p2.lp = 8;
                    if (this.p2.lp < this.p1.lp) this.robar(this.p2);
                    this.render(); setTimeout(() => this.ejecutarPasoActionRival(), 1500); 
                }, 1500);
            }
        }
        else if (carta.id === "barreraEnergia") {
            if (targetPlayer === 'p1') {
                let opciones = [];
                const slots = ['bonus', 'canje1', 'canje2', 'equipo', 'hab0', 'hab300', 'hab500', 'hab1000'];
                slots.forEach(slot => {
                    if (this.p1.campo[slot] && !this.p1.campo[slot].barrera) {
                        opciones.push({
                            text: `▶ PROTEGER: ${this.p1.campo[slot].nombre}`,
                            card: this.p1.campo[slot],
                            btnText: 'PROTEGER',
                            action: () => {
                                let memIdx = this.p1.memoria.findIndex(c => c.id === 'barreraEnergia');
                                if (memIdx > -1) { let b = this.p1.memoria.splice(memIdx, 1)[0]; this.p1.campo[slot].barrera = b; }
                                this.notify(`¡Barrera protege a ${this.p1.campo[slot].nombre}!`);
                                this.render();
                            }
                        });
                    }
                });
                if (opciones.length > 0) { this.showChoiceOptions("BARRERA DE ENERGÍA", opciones); } 
                else { this.notify("No tienes cartas en el campo para proteger."); }
            } else {
                this.notify("¡RIVAL USA BARRERA DE ENERGÍA!");
                setTimeout(() => {
                    const slots = ['hab1000', 'hab500', 'hab300', 'hab0', 'equipo', 'canje1', 'canje2', 'bonus'];
                    let targetSlot = null;
                    for (let s of slots) { if (this.p2.campo[s] && !this.p2.campo[s].barrera) { targetSlot = s; break; } }
                    if (targetSlot) {
                        let memIdx = this.p2.memoria.findIndex(c => c.id === 'barreraEnergia');
                        if (memIdx > -1) { let b = this.p2.memoria.splice(memIdx, 1)[0]; this.p2.campo[targetSlot].barrera = b; }
                        this.notify(`¡Rival protegió su ${this.p2.campo[targetSlot].nombre}!`);
                    } else { this.notify("¡Pero no tenía qué proteger!"); }
                    this.render(); setTimeout(() => this.ejecutarPasoActionRival(), 1500);
                }, 1500);
            }
        }
        else if (carta.id === "restosPerenazana") {
            if (targetPlayer === 'p1') {
                let opciones = [];
                opciones.push({
                    text: "▶ EQUIPAR AL RELIKARIO (+1 HP/Turno)",
                    action: () => {
                        let memIdx = this.p1.memoria.findIndex(c => c.id === 'restosPerenazana');
                        if (memIdx > -1) { let p = this.p1.memoria.splice(memIdx, 1)[0]; this.p1.equiposRelikario.push(p); }
                        this.notify("¡Restos de Perenazana equipada al Relikario!");
                        this.render();
                    }
                });
                const slots = ['bonus', 'canje1', 'canje2', 'equipo', 'hab0', 'hab300', 'hab500', 'hab1000'];
                slots.forEach(slot => {
                    if (this.p1.campo[slot] && !this.p1.campo[slot].perenazana) {
                        opciones.push({
                            text: `▶ EQUIPAR A: ${this.p1.campo[slot].nombre}`,
                            card: this.p1.campo[slot],
                            btnText: 'EQUIPAR',
                            action: () => {
                                let memIdx = this.p1.memoria.findIndex(c => c.id === 'restosPerenazana');
                                if (memIdx > -1) { let p = this.p1.memoria.splice(memIdx, 1)[0]; this.p1.campo[slot].perenazana = p; }
                                this.notify(`¡Equipada a ${this.p1.campo[slot].nombre}!`);
                                this.render();
                            }
                        });
                    }
                });
                this.showChoiceOptions("UBICACIÓN DE RESTOS DE PERENAZANA", opciones);
            } else {
                this.notify("¡RIVAL JUEGA RESTOS DE PERENAZANA!");
                setTimeout(() => {
                    let memIdx = this.p2.memoria.findIndex(c => c.id === 'restosPerenazana');
                    if (memIdx > -1) { let p = this.p2.memoria.splice(memIdx, 1)[0]; this.p2.equiposRelikario.push(p); }
                    this.notify("¡El rival equipó Restos de Perenazana a su Relikario!");
                    this.render();
                    setTimeout(() => this.ejecutarPasoActionRival(), 1500);
                }, 1500);
            }
        }
        else if (carta.id === "c-ro") {
            if (targetPlayer === 'p1') {
                if (this.p1.mano.length > 0) {
                    this.p1.mano.forEach(c => this.p1.mazo.push(c.id));
                    this.p1.mano = [];
                }
                for (let i = this.p1.mazo.length - 1; i > 0; i--) { 
                    const j = Math.floor(Math.random() * (i + 1)); 
                    [this.p1.mazo[i], this.p1.mazo[j]] = [this.p1.mazo[j], this.p1.mazo[i]]; 
                }
                for(let i = 0; i < 5; i++) this.robar(this.p1);
                this.notify("¡C-ro recargó tu mano con 5 cartas!");
                this.render();
            } else {
                this.notify("¡RIVAL USA C-RO!");
                setTimeout(() => {
                    if (this.p2.mano.length > 0) {
                        this.p2.mano.forEach(c => this.p2.mazo.push(c.id));
                        this.p2.mano = [];
                    }
                    for (let i = this.p2.mazo.length - 1; i > 0; i--) { 
                        const j = Math.floor(Math.random() * (i + 1)); 
                        [this.p2.mazo[i], this.p2.mazo[j]] = [this.p2.mazo[j], this.p2.mazo[i]]; 
                    }
                    for(let i = 0; i < 5; i++) this.robar(this.p2);
                    this.notify("¡El rival renovó su mano con 5 cartas nuevas!");
                    this.render();
                    setTimeout(() => this.ejecutarPasoActionRival(), 1500);
                }, 1500);
            }
        }
        else if (carta.id === "besoSucubo") {
            const targetCanjeP2 = !this.p2.campo.canje1 ? 'canje1' : (!this.p2.campo.canje2 ? 'canje2' : null);
            const targetCanjeP1 = !this.p1.campo.canje1 ? 'canje1' : (!this.p1.campo.canje2 ? 'canje2' : null);
            
            if (targetPlayer === 'p1') {
                const opciones = [];
                if (targetCanjeP2) opciones.push({ text: "▶ CANJE RIVAL", action: () => {
                    this.animarCartaEfectoSucubo('p1', 'p2', targetCanjeP2, carta, () => {
                        this.p2.campo[targetCanjeP2] = carta; this.notify("¡Beso de Súcubo en canje rival!"); this.checkCanjes(this.p2); this.render();
                    });
                }});
                if (targetCanjeP1) opciones.push({ text: "▶ TU CANJE", action: () => {
                    this.animarCartaEfectoSucubo('p1', 'p1', targetCanjeP1, carta, () => {
                        this.p1.campo[targetCanjeP1] = carta; this.notify("Colocado en tu canje."); this.checkCanjes(this.p1); this.render();
                    });
                }});
                
                if (opciones.length > 0) {
                    this.showChoiceOptions("UBICACIÓN DE BESO DE SÚCUBO", opciones);
                } else { 
                    this.notify("No hay canjes vacíos."); this.p1.mano.push(carta); this.p1.acciones--; this.updatePhaseUI(); this.render(); 
                }
            } else {
                this.notify("¡RIVAL JUEGA BESO DE SÚCUBO!");
                setTimeout(() => {
                    if (targetCanjeP1) {
                        this.animarCartaEfectoSucubo('p2', 'p1', targetCanjeP1, carta, () => {
                            this.p1.campo[targetCanjeP1] = carta; this.notify("¡Súcubo colocada en tu canje!"); this.checkCanjes(this.p1); this.render();
                            setTimeout(() => this.ejecutarPasoActionRival(), 1000);
                        });
                    } else if (targetCanjeP2) {
                        this.animarCartaEfectoSucubo('p2', 'p2', targetCanjeP2, carta, () => {
                            this.p2.campo[targetCanjeP2] = carta; this.notify("Rival la colocó en su propio canje."); this.checkCanjes(this.p2); this.render();
                            setTimeout(() => this.ejecutarPasoActionRival(), 1000);
                        });
                    } else {
                        this.p2.mano.push(carta); this.p2.acciones--; this.updatePhaseUI(); this.render(); setTimeout(() => this.ejecutarPasoActionRival(), 1000);
                    }
                }, 1500);
            }
        }
        else if (carta.id === "tnt") { this.iniciarEfectoTNT(carta, targetPlayer); }
        else if (carta.id === "cofre") this.lanzarDadoEspecial(carta, targetPlayer === 'p1' ? "Abriendo cofre..." : "Rival abre cofre...");
        else if (carta.id === "guang") this.lanzarDadoEspecial(carta, targetPlayer === 'p1' ? "Buscando maestro..." : "Rival busca maestro...");
        else if (carta.id === "capsulaBolsillo") this.lanzarDadoEspecial(carta, targetPlayer === 'p1' ? "Abriendo cápsula..." : "Rival abre cápsula...");
        else if (carta.id === "cartaInvitacion") this.lanzarDadoEspecial(carta, targetPlayer === 'p1' ? "Leyendo invitación..." : "Rival lee invitación...");
    },

    iniciarEfectoTNT(carta, targetPlayer) {
        const isP1 = targetPlayer === 'p1';
        const statusMsg = $('game-status-msg'); if(statusMsg) statusMsg.style.opacity = '0';
        const overlay = $('overlay-dice'), arena = $('dice-arena'), res = $('dice-result'), title = $('dice-title');
        
        if(!overlay || !arena || !res || !title) return;
        
        title.innerText = "¡BOMBA TNT ACTIVADA!";
        res.innerHTML = `<span class="text-gray-400 text-sm">${isP1 ? "Rival lanza" : "Lanzas"} 3 dados de desactivación...</span>`;
        
        arena.innerHTML = `
            <div class="flex gap-4">
                <div id="tnt-cube-1" class="w-20 h-20 bg-white rounded-2xl flex items-center justify-center text-5xl text-black font-black shadow-[0_0_20px_white]">🎲</div>
                <div id="tnt-cube-2" class="w-20 h-20 bg-white rounded-2xl flex items-center justify-center text-5xl text-black font-black shadow-[0_0_20px_white]">🎲</div>
                <div id="tnt-cube-3" class="w-20 h-20 bg-white rounded-2xl flex items-center justify-center text-5xl text-black font-black shadow-[0_0_20px_white]">🎲</div>
            </div>`;
        overlay.style.display = 'flex';
        
        let i = 0; const c1 = $('tnt-cube-1'), c2 = $('tnt-cube-2'), c3 = $('tnt-cube-3');
        const t = setInterval(() => {
            c1.innerText = Math.floor(Math.random()*6)+1;
            c2.innerText = Math.floor(Math.random()*6)+1;
            c3.innerText = Math.floor(Math.random()*6)+1;
            if(i++ > 15) {
                clearInterval(t);
                let r1 = Math.floor(Math.random()*6)+1, r2 = Math.floor(Math.random()*6)+1, r3 = Math.floor(Math.random()*6)+1;
                c1.innerText = r1; c2.innerText = r2; c3.innerText = r3;
                
                const pRolling = targetPlayer === 'p1' ? 'p2' : 'p1';
                this.checkDestruccionPor1([r1, r2, r3], pRolling);

                let anula = (r1 === 1 || r2 === 2 || r3 === 3);
                
                if (anula) {
                    res.innerHTML = `<span class="text-gray-400 text-xl font-black">¡TNT DESACTIVADA!</span><br><span class="text-sm">El efecto se ha anulado.</span>`;
                    setTimeout(() => {
                        if(statusMsg) statusMsg.style.opacity = '1'; overlay.style.display = 'none';
                        this.render();
                        if (!isP1) setTimeout(() => this.ejecutarPasoActionRival(), 1000);
                    }, 2500);
                } else {
                    res.innerHTML = `<span class="text-red-500 text-xl font-black">¡LA TNT EXPLOTARÁ!</span><br><span class="text-sm">La desactivación falló...</span>`;
                    setTimeout(() => {
                        if(statusMsg) statusMsg.style.opacity = '1'; overlay.style.display = 'none';
                        this.resolverOpcionesTNT(targetPlayer);
                    }, 2000);
                }
            }
        }, 80);
    },

    resolverOpcionesTNT(targetPlayer) {
        const isP1 = targetPlayer === 'p1';
        const pRival = isP1 ? this.p2 : this.p1;
        
        if (isP1) {
            this.showChoiceOptions("EFECTO TNT", [
                { text: "▶ 2 DAÑO NO LETAL", action: () => {
                    this.aplicarDanoNoLetal(pRival, 2);
                    this.notify("¡Causaste 2 de Daño No Letal!");
                    this.render();
                }},
                { text: "▶ DESTRUIR 2 CARTAS", action: () => {
                    this.iniciarDestruccionTNT(2, 'p1');
                }}
            ]);
        } else {
            this.notify("¡RIVAL ELIGE EFECTO TNT!");
            setTimeout(() => {
                if (this.p1.lp > 2) {
                    this.aplicarDanoNoLetal(this.p1, 2);
                    this.notify("¡Rival te inflige 2 de Daño No Letal!");
                    this.render();
                    setTimeout(() => this.ejecutarPasoActionRival(), 1500);
                } else {
                    this.iniciarDestruccionTNTBot(2);
                }
            }, 1500);
        }
    },

    aplicarDanoNoLetal(playerObj, amount) {
        let newLp = playerObj.lp - amount;
        if (newLp < 1) newLp = 1;
        if (playerObj.lp > newLp) {
            playerObj.lp = newLp;
        }
    },

    iniciarDestruccionTNT(restantes, targetPlayer) {
        if (restantes === 0) {
            this.notify("¡Efecto completado!");
            this.render();
            return;
        }
        
        const isP1 = targetPlayer === 'p1';
        const pRival = isP1 ? this.p2 : this.p1;
        
        let habs = ['hab0', 'hab300', 'hab500', 'hab1000'].filter(s => pRival.campo[s]);
        let canDestroyHab = habs.length > 1; 
        
        const opciones = [];
        const slots = ['bonus', 'canje1', 'canje2', 'equipo'];
        if (canDestroyHab) slots.push(...['hab0', 'hab300', 'hab500', 'hab1000']);
        
        slots.forEach(slot => {
            if (pRival.campo[slot]) {
                opciones.push({
                    text: `▶ DESTRUIR: ${pRival.campo[slot].nombre}`,
                    card: pRival.campo[slot],
                    btnText: 'DESTRUIR',
                    action: () => {
                        let nombreC = pRival.campo[slot].nombre;
                        if(this.intentarAfectarCarta(pRival, slot)) {
                            pRival.memoria.push(pRival.campo[slot]);
                            pRival.campo[slot] = null;
                            if (slot === 'bonus') this.reponerBonus(pRival);
                            this.notify(`¡${nombreC} destruida!`);
                        }
                        this.render();
                        setTimeout(() => this.iniciarDestruccionTNT(restantes - 1, targetPlayer), 1500);
                    }
                });
            }
        });
        
        if (opciones.length === 0) {
            this.notify("No hay más cartas válidas para destruir.");
            this.render();
            return;
        }
        
        this.showChoiceOptions(`TNT: DESTRUYE CARTA (${restantes} RESTANTES)`, opciones);
    },

    iniciarDestruccionTNTBot(restantes) {
        if (restantes === 0) {
            this.render();
            setTimeout(() => this.ejecutarPasoActionRival(), 1000);
            return;
        }
        
        let habs = ['hab0', 'hab300', 'hab500', 'hab1000'].filter(s => this.p1.campo[s]);
        let canDestroyHab = habs.length > 1;
        
        const slots = ['bonus', 'canje1', 'canje2', 'equipo'];
        if (canDestroyHab) slots.push(...['hab0', 'hab300', 'hab500', 'hab1000']);
        
        let targets = slots.filter(s => this.p1.campo[s]);
        
        if (targets.length === 0) {
            this.notify("No hay más cartas para destruir.");
            this.render();
            setTimeout(() => this.ejecutarPasoActionRival(), 1000);
            return;
        }
        
        let target = targets[Math.floor(Math.random() * targets.length)];
        let carta = this.p1.campo[target];
        if (this.intentarAfectarCarta(this.p1, target)) {
            this.p1.memoria.push(carta);
            this.p1.campo[target] = null;
            if (target === 'bonus') this.reponerBonus(this.p1);
            this.notify(`¡Rival destruyó tu ${carta.nombre}!`);
        }
        this.render();
        
        setTimeout(() => {
            this.iniciarDestruccionTNTBot(restantes - 1);
        }, 1500);
    },

    ejecutarDadoDoble(contexto = 'combat') {
        const pActivo = this.turnoActivo === 'p1' ? this.p1 : this.p2;
        const idx = pActivo.mano.findIndex(c => c.id === 'dadoDoble');
        if (idx > -1) { pActivo.memoria.push(pActivo.mano.splice(idx, 1)[0]); this.render(); }
        
        const res = $('dice-result'), arena = $('dice-arena');
        if (res) res.innerHTML = '<span class="text-gray-400 text-sm font-bold">¡Combo: Dado Doble!<br>Lanzando 2 dados...</span>';
        if (arena) arena.innerHTML = `<div id="combo-cube-1" class="w-24 h-24 bg-white rounded-3xl flex items-center justify-center text-6xl text-black font-black shadow-[0_0_30px_white] mx-2">🎲</div><div id="combo-cube-2" class="w-24 h-24 bg-white rounded-3xl flex items-center justify-center text-6xl text-black font-black shadow-[0_0_30px_white] mx-2">🎲</div>`;
        
        let i = 0; const c1 = $('combo-cube-1'), c2 = $('combo-cube-2');
        const t = setInterval(() => {
            c1.innerText = Math.floor(Math.random()*6)+1; c2.innerText = Math.floor(Math.random()*6)+1;
            if(i++ > 15) {
                clearInterval(t);
                let r1 = Math.floor(Math.random()*6)+1, r2 = Math.floor(Math.random()*6)+1;
                c1.innerText = r1; c2.innerText = r2;
                
                this.checkDestruccionPor1([r1, r2], this.turnoActivo);

                let sum = r1 + r2; let finalSum = sum >= 6 ? 5 : sum;
                
                if (this.turnoActivo === 'p2') {
                    let best = r1; if (r2 > best && r2 <= 5) best = r2;
                    if (finalSum > best) best = finalSum;
                    setTimeout(() => this.resolverDadoDoble(best, contexto), 1500);
                } else {
                    res.innerHTML = `<span class="text-white text-sm mb-2 block">Elige un resultado final:</span><div class="flex gap-2 justify-center flex-wrap"><button class="bg-blue-600 px-4 py-2 rounded font-bold text-xs" onclick="Game.resolverDadoDoble(${r1}, '${contexto}')">Dado 1 (${r1})</button><button class="bg-blue-600 px-4 py-2 rounded font-bold text-xs" onclick="Game.resolverDadoDoble(${r2}, '${contexto}')">Dado 2 (${r2})</button><button class="bg-purple-600 px-4 py-2 rounded font-bold text-xs" onclick="Game.resolverDadoDoble(${finalSum}, '${contexto}')">Sumar (${sum >= 6 ? 'Límite: 5' : sum})</button></div>`;
                }
            }
        }, 80);
    },

    resolverDadoDoble(finalRoll, contexto) {
        const arena = $('dice-arena');
        if (arena) arena.innerHTML = `<div id="dice-cube" class="w-32 h-32 bg-white rounded-3xl flex items-center justify-center text-8xl text-black font-black shadow-[0_0_50px_white]">${finalRoll}</div>`;
        
        if (contexto === 'combat') this.evaluarDado(finalRoll, this.habPendienteParaDado);
        else if (contexto === 'cofre') this.evaluarCofre(finalRoll);
        else if (contexto === 'guang') this.evaluarGuang(finalRoll);
        else if (contexto === 'jessica') this.evaluarJessica(finalRoll);
        else if (contexto === 'boomerang') this.evaluarBoomerang(finalRoll);
        else if (contexto === 'capsulaBolsillo') this.evaluarCapsula(finalRoll);
        else if (contexto === 'cartaInvitacion') this.evaluarInvitacion(finalRoll);
    },

    iniciarDueloCinta(carta, targetPlayer) {
        const isP1 = targetPlayer === 'p1'; const pActivo = isP1 ? this.p1 : this.p2;
        const statusMsg = $('game-status-msg'); if(statusMsg) statusMsg.style.opacity = '0';
        const overlay = $('overlay-dice'), arena = $('dice-arena'), res = $('dice-result'), title = $('dice-title');
        title.innerText = "DUELO: " + carta.nombre; res.innerHTML = '<span class="text-gray-400 text-sm">Lanzando dados...</span>';
        arena.innerHTML = `<div class="flex flex-col items-center"><span class="text-green-400 font-bold mb-2 text-xs">TÚ</span><div id="dice-cube-p1" class="w-20 h-20 bg-white rounded-2xl flex items-center justify-center text-5xl text-black font-black shadow-[0_0_20px_white]">🎲</div></div><span class="text-2xl font-black text-white px-2">VS</span><div class="flex flex-col items-center"><span class="text-red-500 font-bold mb-2 text-xs">RIVAL</span><div id="dice-cube-p2" class="w-20 h-20 bg-white rounded-2xl flex items-center justify-center text-5xl text-black font-black shadow-[0_0_20px_white]">🎲</div></div>`;
        overlay.style.display = 'flex';
        let i = 0; const cube1 = $('dice-cube-p1'), cube2 = $('dice-cube-p2');
        const t = setInterval(() => {
            cube1.innerText = Math.floor(Math.random()*6)+1; cube2.innerText = Math.floor(Math.random()*6)+1;
            if(i++ > 15) {
                clearInterval(t); let rollActivo = Math.floor(Math.random()*6)+1, rollRival = Math.floor(Math.random()*6)+1;
                cube1.innerText = isP1 ? rollActivo : rollRival; cube2.innerText = isP1 ? rollRival : rollActivo;
                
                this.checkDestruccionPor1([rollActivo], targetPlayer);
                this.checkDestruccionPor1([rollRival], targetPlayer === 'p1' ? 'p2' : 'p1');

                const ganaActivo = rollActivo > rollRival, empate = rollActivo === rollRival;
                if (empate) { res.innerHTML = '<span class="text-yellow-400 text-xl font-black">¡EMPATE!</span><br><span class="text-sm">Nadie gana el duelo. La cinta se destruye.</span>'; pActivo.memoria.push(carta); } 
                else if (ganaActivo) { res.innerHTML = '<span class="text-green-400 text-xl font-black">¡ÉXITO!</span><br><span class="text-sm">La cinta se equipa al Relikario.</span>'; pActivo.equiposRelikario.push(carta); } 
                else { res.innerHTML = '<span class="text-red-500 text-xl font-black">¡FALLO!</span><br><span class="text-sm">El rival obtuvo un número mayor. La cinta se destruye.</span>'; pActivo.memoria.push(carta); }
                setTimeout(() => { if(statusMsg) statusMsg.style.opacity = '1'; overlay.style.display = 'none'; arena.innerHTML = `<div id="dice-cube" class="w-32 h-32 bg-white rounded-3xl flex items-center justify-center text-8xl text-black font-black shadow-[0_0_50px_white]">🎲</div>`; this.render(); if (!isP1) { this.ejecutarPasoActionRival(); } }, 3000);
            }
        }, 80);
    },

    resolverBoomerang(accionElegida, carta, userPlayer) {
        const pActivo = userPlayer === 'p1' ? this.p1 : this.p2, pRival = userPlayer === 'p1' ? this.p2 : this.p1;
        if (accionElegida === 'equipo_rival') { if (pRival.campo.equipo) { if(this.intentarAfectarCarta(pRival, 'equipo')) { pActivo.mano.push(pRival.campo.equipo); pRival.campo.equipo = null; this.notify(userPlayer === 'p1' ? "¡Equipo rival robado a tu mano!" : "¡Tu equipo fue robado a su mano!"); } } } 
        else if (accionElegida === 'equipo_propio') { if (pActivo.campo.equipo) { if(this.intentarAfectarCarta(pActivo, 'equipo')) { pActivo.mano.push(pActivo.campo.equipo); pActivo.campo.equipo = null; this.notify(userPlayer === 'p1' ? "Tu equipo regresó a tu mano." : "Rival devolvió su equipo."); } } } 
        else if (accionElegida === 'dano') { if (pRival.lp > 0) { pRival.lp -= 1; if (pRival.lp <= 0) pRival.lp = 0; } this.notify(userPlayer === 'p1' ? "¡1 Daño no letal al rival!" : "¡Recibes 1 Daño no letal!"); }
        this.render(); setTimeout(() => { this.lanzarDadoEspecial(carta, userPlayer === 'p1' ? "Boomerang regresando..." : "Boomerang rival regresando..."); }, 1500);
    },

    resolverHuevoAzulRobo() {
        this.render();
        if (this.p1.pr >= 200) { setTimeout(() => { this.showChoiceOptions("¿PAGAR 200 PR PARA ROBAR 1 CARTA?", [ { text: "▶ SÍ (-200 PR)", action: () => { this.p1.pr -= 200; this.robar(this.p1); this.notify("¡Has robado 1 carta!"); this.render(); } }, { text: "▶ NO", action: () => { this.render(); } } ]); }, 500); } 
        else { this.notify("PR insuficiente para robar."); }
    },

    lanzarDadosIniciales() {
        const statusMsg = $('game-status-msg'); if(statusMsg) statusMsg.style.opacity = '0';
        const overlay = $('overlay-dice'), arena = $('dice-arena'), res = $('dice-result'), title = $('dice-title');
        title.innerText = "INICIATIVA"; res.innerHTML = '<span class="text-gray-400 text-sm">Lanzando dados...</span>';
        arena.innerHTML = `<div class="flex flex-col items-center"><span class="text-green-400 font-bold mb-2 text-xs">TÚ</span><div id="dice-cube-p1" class="w-20 h-20 bg-white rounded-2xl flex items-center justify-center text-5xl text-black font-black shadow-[0_0_20px_white]">🎲</div></div><span class="text-2xl font-black text-white px-2">VS</span><div class="flex flex-col items-center"><span class="text-red-500 font-bold mb-2 text-xs">RIVAL</span><div id="dice-cube-p2" class="w-20 h-20 bg-white rounded-2xl flex items-center justify-center text-5xl text-black font-black shadow-[0_0_20px_white]">🎲</div></div>`;
        overlay.style.display = 'flex';
        let i = 0; const cube1 = $('dice-cube-p1'), cube2 = $('dice-cube-p2');

        const t = setInterval(() => {
            cube1.innerText = Math.floor(Math.random()*6)+1; cube2.innerText = Math.floor(Math.random()*6)+1;
            if(i++ > 20) {
                clearInterval(t); let roll1 = Math.floor(Math.random()*6)+1, roll2 = Math.floor(Math.random()*6)+1; cube1.innerText = roll1; cube2.innerText = roll2;
                if (roll1 === roll2) { res.innerHTML = '<span class="text-yellow-400 text-xl font-black">¡EMPATE!</span><br><span class="text-sm">Relanzando...</span>'; setTimeout(() => this.lanzarDadosIniciales(), 2000); } 
                else {
                    const ganaP1 = roll1 > roll2; res.innerHTML = `<span class="${ganaP1 ? 'text-green-400' : 'text-red-500'} text-xl font-black uppercase tracking-wider">¡${ganaP1 ? 'Empiezas Tú' : 'Empieza el Rival'}!</span><br><span class="text-xs text-gray-300 font-bold mt-2">El primer jugador no puede atacar</span>`;
                    setTimeout(() => {
                        if(statusMsg) statusMsg.style.opacity = '1'; overlay.style.display = 'none'; arena.innerHTML = `<div id="dice-cube" class="w-32 h-32 bg-white rounded-3xl flex items-center justify-center text-8xl text-black font-black shadow-[0_0_50px_white]">🎲</div>`;
                        this.esPrimerTurnoDelJuego = true;
                        if (ganaP1) { 
                            this.turnoActivo = 'p1'; this.faseIdx = 0; this.updatePhaseUI(); this.render(); this.notify("¡DUELO INICIADO!<br><span class='text-sm font-normal'>Robando cartas...</span>"); 
                            setTimeout(() => { 
                                if (this.verificarBesoSucubo('p1', () => { this._procederSiguienteFase(); })) return;
                                this._procederSiguienteFase(); 
                            }, 1500); 
                        } 
                        else { 
                            this.turnoActivo = 'p2'; this.faseIdx = 0; this.updatePhaseUI(); this.render(); this.notify("¡DUELO INICIADO!<br><span class='text-sm font-normal'>El rival comienza...</span>"); 
                            setTimeout(() => { this.ejecutarTurnoRival(); }, 1500); 
                        }
                    }, 3500);
                }
            }
        }, 80);
    },

    lanzarDado(hab, esReroll = false) {
        const pAtacante = this.turnoActivo === 'p1' ? this.p1 : this.p2;
        this.habPendienteParaDado = hab; this.isYunoRerollActivo = esReroll; 
        if (esReroll) pAtacante.rerollUsado = true;
        const dt = $('dice-title'); if(dt && !esReroll) dt.innerText = "ATAQUE EN CURSO"; else if (dt && esReroll) dt.innerText = "RELANZAMIENTO";
        
        const hasDadoDoble = pAtacante.mano.some(c => c.id === 'dadoDoble');
        if (hasDadoDoble) {
            if (this.turnoActivo === 'p2') { this.ejecutarDadoDoble('combat'); } 
            else {
                this.showChoiceOptions("¿LANZAR CON DADO DOBLE?", [
                    { text: "▶ LANZAMIENTO NORMAL", action: () => this._animarLanzamientoNormal('combat') },
                    { card: DB['dadoDoble'], btnText: 'USAR COMBO', action: () => this.ejecutarDadoDoble('combat') }
                ]);
            }
        } else { this._animarLanzamientoNormal('combat'); }
    },

    _animarLanzamientoNormal(contexto, subtitulo = "Calculando...") {
        const statusMsg = $('game-status-msg'); if(statusMsg) statusMsg.style.opacity = '0';
        const overlay = $('overlay-dice'), res = $('dice-result'), arena = $('dice-arena');
        if(!overlay || !res) return;
        overlay.style.display = 'flex'; res.innerHTML = `<span class="text-gray-400 text-sm">${subtitulo}</span>`;
        if(arena) arena.innerHTML = `<div id="dice-cube" class="w-32 h-32 bg-white rounded-3xl flex items-center justify-center text-8xl text-black font-black shadow-[0_0_50px_white]">🎲</div>`;
        
        let i = 0; const cubeEl = $('dice-cube');
        const t = setInterval(() => {
            if(cubeEl) cubeEl.innerText = Math.floor(Math.random()*6)+1;
            if(i++ > 15) { 
                clearInterval(t); let roll = Math.floor(Math.random()*6)+1; if(cubeEl) cubeEl.innerText = roll; 
                
                this.checkDestruccionPor1([roll], this.turnoActivo);

                if (contexto === 'combat') this.evaluarDado(roll, this.habPendienteParaDado);
                else if (contexto === 'cofre') this.evaluarCofre(roll);
                else if (contexto === 'guang') this.evaluarGuang(roll);
                else if (contexto === 'jessica') this.evaluarJessica(roll);
                else if (contexto === 'boomerang') this.evaluarBoomerang(roll);
                else if (contexto === 'capsulaBolsillo') this.evaluarCapsula(roll);
                else if (contexto === 'cartaInvitacion') this.evaluarInvitacion(roll);
            }
        }, 80);
    },

    evaluarDado(roll, hab) {
        const res = $('dice-result'); if(!res) return;
        const pAtacante = this.turnoActivo === 'p1' ? this.p1 : this.p2;
        let yunoNerfAplicado = false; if (this.isYunoRerollActivo && roll === 6) { roll = 5; yunoNerfAplicado = true; }
        let dmg = 0, pr = 0, msg = "", colorClass = "";

        if (roll <= 3) { msg = "FALLIDO"; colorClass = "text-gray-500"; }
        else if (roll === 4) { dmg = Math.ceil(hab.stats.base/2); msg = "REDUCIDO"; pr = hab.stats.pr; colorClass = "text-yellow-400"; }
        else if (roll === 5) { dmg = hab.stats.base; msg = "EXITOSO"; pr = hab.stats.pr; colorClass = "text-green-400"; }
        else if (roll === 6) { dmg = hab.stats.crit; msg = "¡CRÍTICO!"; pr = hab.stats.pr; colorClass = "text-red-500"; }

        if (dmg > 0 && pAtacante.campo.equipo?.id === 'hoja') { dmg += 1; msg += " <br><span class='text-xs text-green-400'>(+1 HOJA)</span>"; }
        this.dadoPendiente = { dmg, pr };

        let puedeRelanzarPasiva = (roll !== 1) && !pAtacante.rerollUsado, puedeRelanzarEquipo = (pAtacante.campo.equipo?.id === "hoja");
        let slotDoubleJump = null; ['hab0', 'hab300', 'hab500', 'hab1000'].forEach(slot => { if (pAtacante.campo[slot]?.id === "doubleJump") slotDoubleJump = slot; });
        let puedeUsarDoubleJump = (slotDoubleJump !== null) && (roll <= 3);

        let extraYunoHtml = yunoNerfAplicado ? `<div class="text-[9px] text-blue-300 font-bold mb-2 uppercase bg-blue-900/40 px-3 py-1 rounded-full border border-blue-500/50 shadow-[0_0_10px_rgba(0,210,255,0.3)] inline-block">Límite Yuno: 6 ➔ 5</div><br>` : '';

        if (this.turnoActivo === 'p2') {
            res.innerHTML = `${extraYunoHtml}<div class="text-xl font-black ${colorClass}">${msg}</div>${dmg > 0 ? `<div class="text-white">Daño: <span class="text-red-500 font-bold">${dmg} LP</span></div>` : ''}`;
            if (puedeUsarDoubleJump && roll >= 2) setTimeout(() => this.ejecutarDoubleJump(slotDoubleJump, roll), 1500); 
            else if (puedeRelanzarPasiva && roll <= 3 && roll !== 1) setTimeout(() => this.ejecutarRelanzamiento(), 1500); 
            else if (puedeRelanzarEquipo && roll <= 3) setTimeout(() => this.ejecutarRelanzamientoEquipo(), 1500); 
            else setTimeout(() => this.aceptarDado(), 2000);
            return;
        }

        let btnsHtml = '';
        if (puedeRelanzarPasiva || puedeRelanzarEquipo || puedeUsarDoubleJump) {
            if (puedeUsarDoubleJump) btnsHtml += `<button class="bg-orange-500 px-3 py-2 rounded-full font-bold text-[10px]" onclick="Game.ejecutarDoubleJump('${slotDoubleJump}', ${roll})">+2 (Jump)</button>`;
            if (puedeRelanzarPasiva) btnsHtml += `<button class="bg-blue-600 px-3 py-2 rounded-full font-bold text-[10px]" onclick="Game.ejecutarRelanzamiento()">Relanzar</button>`;
            if (puedeRelanzarEquipo) btnsHtml += `<button class="bg-purple-600 px-3 py-2 rounded-full font-bold text-[10px]" onclick="Game.ejecutarRelanzamientoEquipo()">R. Hoja</button>`;
            res.innerHTML = `${extraYunoHtml}<div class="${colorClass} mb-2 text-center leading-tight font-black text-2xl">${msg}</div>${dmg > 0 ? `<div class="text-white text-lg">Daño: <span class="text-red-500 font-bold">${dmg}</span> LP</div>` : ''}<div class="mt-4 flex gap-2 justify-center w-full flex-wrap">${btnsHtml}<button class="bg-green-600 px-6 py-2 rounded-full font-bold text-[10px]" onclick="Game.aceptarDado()">Aceptar</button></div>`;
        } else { res.innerHTML = `${extraYunoHtml}<div class="${colorClass} mb-2 text-center leading-tight font-black text-2xl">${msg}</div>${dmg > 0 ? `<div class="text-white text-lg">Daño: <span class="text-red-500 font-bold">${dmg}</span> LP</div>` : ''}`; this.aplicarResultadoDado(dmg, pr); setTimeout(() => this.cerrarDado(), 2500); }
    },

    ejecutarDoubleJump(slot, oldRoll) { const pAtacante = this.turnoActivo === 'p1' ? this.p1 : this.p2; const carta = pAtacante.campo[slot]; if (carta) { if (carta.barrera) { pAtacante.memoria.push(carta.barrera); carta.barrera = null; } if (carta.perenazana) { pAtacante.memoria.push(carta.perenazana); carta.perenazana = null; } pAtacante.memoria.push(carta); pAtacante.campo[slot] = null; this.render(); } const res = $('dice-result'); if(res) res.innerHTML = '<span class="text-orange-400 text-sm font-bold">¡Double Jump!<br>Aumentando +2...</span>'; setTimeout(() => this.evaluarDado(oldRoll + 2, this.habPendienteParaDado), 1000); },
    ejecutarRelanzamiento() { const btn = $('btn-relanzar-dado'); if (btn) btn.style.display = 'none'; const pAtacante = this.turnoActivo === 'p1' ? this.p1 : this.p2; pAtacante.rerollUsado = true; const res = $('dice-result'); if(res) res.innerHTML = '<span class="text-gray-400 text-sm">Relanzando...</span>'; this.lanzarDado(this.habPendienteParaDado, true); },
    ejecutarRelanzamientoEquipo() { const pAtacante = this.turnoActivo === 'p1' ? this.p1 : this.p2; if (pAtacante.campo.equipo && pAtacante.campo.equipo.id === "hoja") { if(pAtacante.campo.equipo.barrera) { pAtacante.memoria.push(pAtacante.campo.equipo.barrera); pAtacante.campo.equipo.barrera = null; } if(pAtacante.campo.equipo.perenazana) { pAtacante.memoria.push(pAtacante.campo.equipo.perenazana); pAtacante.campo.equipo.perenazana = null; } pAtacante.memoria.push(pAtacante.campo.equipo); pAtacante.campo.equipo = null; this.render(); } const res = $('dice-result'); if(res) res.innerHTML = '<span class="text-purple-400 text-sm font-bold">¡Hoja destruida!<br>Relanzando...</span>'; setTimeout(() => this.lanzarDado(this.habPendienteParaDado, false), 800); },
    
    aceptarDado() { this.aplicarResultadoDado(this.dadoPendiente.dmg, this.dadoPendiente.pr); this.cerrarDado(); },
    
    aplicarResultadoDado(dmg, pr) { 
        const pAtacante = this.turnoActivo === 'p1' ? this.p1 : this.p2, pDefensor = this.turnoActivo === 'p1' ? this.p2 : this.p1; 
        if (pr > 0) pAtacante.pr += pr; 
        if (dmg > 0) { 
            if (pDefensor.lp === 0) pDefensor.derrotado = true; else { pDefensor.lp -= dmg; if (pDefensor.lp <= 0) pDefensor.lp = 0; } 
            const cintas = pAtacante.equiposRelikario.filter(c => c.id === 'cintaMelocoton').length;
            if (cintas > 0) { for(let i=0; i<cintas; i++) this.robar(pAtacante); }
        } 
    },
    
    cerrarDado() {
        const statusMsg = $('game-status-msg'); if(statusMsg) statusMsg.style.opacity = '1';
        const overlay = $('overlay-dice'); if(overlay) overlay.style.display = 'none'; 
        this.render();
        
        let dmg = this.dadoPendiente ? this.dadoPendiente.dmg : 0;
        if (dmg > 0) {
            const pAtacante = this.turnoActivo === 'p1' ? this.p1 : this.p2, cintas = pAtacante.equiposRelikario.filter(c => c.id === 'cintaMelocoton').length;
            if (cintas > 0) { setTimeout(() => { this.notify(`¡Cinta Melocotón!<br><span class="text-sm">${this.turnoActivo === 'p1' ? 'Has robado' : 'Rival robó'} ${cintas} carta(s).</span>`); }, 500); }
        }

        if (this.p2.derrotado) { this.mostrarPantallaFin("¡GOLPE FATAL!<br>Has aplastado al rival.", true); return; }
        if (this.p1.derrotado) { this.mostrarPantallaFin("¡GOLPE FATAL RECIBIDO!<br>Tu relikario ha sido destruido.", false); return; }
        if (this.turnoActivo === 'p2') this.ejecutarPasoCombatRival();
    },

    lanzarDadoEspecial(carta, subtitulo = "Calculando...") {
        this.cartaEspecialPendiente = carta;
        this.subtituloEspecialPendiente = subtitulo;
        const pAtacante = this.turnoActivo === 'p1' ? this.p1 : this.p2;
        const hasDadoDoble = pAtacante.mano.some(c => c.id === 'dadoDoble');
        const dt = $('dice-title'); if(dt) dt.innerText = carta.nombre ? `EFECTO: ${carta.nombre.toUpperCase()}` : "LANZANDO DADO";
        
        let contexto = carta.id;
        if (hasDadoDoble) {
            if (this.turnoActivo === 'p2') { this.ejecutarDadoDoble(contexto); }
            else {
                this.showChoiceOptions("¿LANZAR CON DADO DOBLE?", [
                    { text: "▶ LANZAMIENTO NORMAL", action: () => this._animarLanzamientoNormal(contexto, subtitulo) },
                    { card: DB['dadoDoble'], btnText: 'USAR COMBO', action: () => this.ejecutarDadoDoble(contexto) }
                ]);
            }
        } else {
            this._animarLanzamientoNormal(contexto, subtitulo);
        }
    },

    evaluarCofre(roll) {
        const res = $('dice-result'); if(!res) return;
        const pActivo = this.turnoActivo === 'p1' ? this.p1 : this.p2;
        let msg = "", colorClass = "";
        if (roll === 1) { msg = "-1 LP"; colorClass = "text-red-500"; pActivo.lp -= 1; if(pActivo.lp <= 0) pActivo.lp = 0; }
        else if (roll <= 4) { msg = "+2 LP"; colorClass = "text-green-400"; pActivo.lp += 2; if(pActivo.lp > 8) pActivo.lp = 8; }
        else { msg = "ROBAS 2 CARTAS"; colorClass = "text-blue-400"; this.robar(pActivo); this.robar(pActivo); }
        res.innerHTML = `<div class="${colorClass} text-2xl font-black mb-2">${msg}</div>`;
        setTimeout(() => this.cerrarDadoEspecial(), 2000);
    },
    
    evaluarGuang(roll) {
        const res = $('dice-result'); if(!res) return;
        const pActivo = this.turnoActivo === 'p1' ? this.p1 : this.p2;
        if (roll >= 3) {
            res.innerHTML = `<div class="text-green-400 text-2xl font-black mb-2">¡ÉXITO!</div><span class="text-sm">Buscando personaje...</span>`;
            setTimeout(() => {
                let pIdx = pActivo.mazo.findIndex(id => DB[id] && DB[id].tipo === "PERSONAJE");
                if (pIdx > -1) {
                    let pCard = DB[pActivo.mazo.splice(pIdx, 1)[0]];
                    let targetSlot = !pActivo.campo.canje1 ? 'canje1' : (!pActivo.campo.canje2 ? 'canje2' : null);
                    if (targetSlot) { pActivo.campo[targetSlot] = pCard; this.notify(`¡Guang invocó a ${pCard.nombre}!`); }
                    else { pActivo.mano.push(pCard); this.notify(`Canjes llenos. ¡${pCard.nombre} a tu mano!`); }
                } else { this.notify("No quedan Personajes en el mazo."); }
                this.cerrarDadoEspecial();
            }, 2000);
        } else {
            res.innerHTML = `<div class="text-red-500 text-2xl font-black mb-2">FALLÓ</div><span class="text-sm">No encontró a nadie.</span>`;
            setTimeout(() => this.cerrarDadoEspecial(), 2000);
        }
    },
    
    evaluarJessica(roll) {
        const res = $('dice-result'); if(!res) return;
        const pAtacante = this.turnoActivo === 'p1' ? this.p1 : this.p2;
        const pDefensor = this.turnoActivo === 'p1' ? this.p2 : this.p1;
        let dmg = 0, msg = "", colorClass = "";
        if (roll <= 4) { msg = "FALLÓ"; colorClass = "text-gray-500"; }
        else if (roll === 5) { dmg = 2; msg = "ACERTÓ"; colorClass = "text-yellow-400"; }
        else if (roll === 6) { dmg = 3; msg = "¡CRÍTICO!"; colorClass = "text-red-500"; this.robar(pAtacante); msg += " (+1 Carta)"; }
        res.innerHTML = `<div class="${colorClass} text-2xl font-black mb-2">JESSICA ${msg}</div>${dmg > 0 ? `<div class="text-white">Daño: <span class="text-red-500 font-bold">${dmg} LP</span></div>` : ''}`;
        if (dmg > 0) {
            pDefensor.lp -= dmg;
            if (pDefensor.lp <= 0) pDefensor.derrotado = true;
        }
        setTimeout(() => this.cerrarDadoEspecial(true), 2500); 
    },
    
    evaluarBoomerang(roll) {
        const res = $('dice-result'); if(!res) return;
        const pActivo = this.turnoActivo === 'p1' ? this.p1 : this.p2;
        if (roll >= 5) {
            res.innerHTML = `<div class="text-green-400 text-xl font-black mb-2">¡REGRESA A LA MANO!</div>`;
            let memIdx = pActivo.memoria.findIndex(c => c.id === 'boomerang');
            if (memIdx > -1) {
                pActivo.mano.push(pActivo.memoria.splice(memIdx, 1)[0]);
            } else if (this.cartaEspecialPendiente) {
                pActivo.mano.push(this.cartaEspecialPendiente);
            }
        } else {
            res.innerHTML = `<div class="text-red-500 text-xl font-black mb-2">SE PIERDE</div>`;
        }
        setTimeout(() => this.cerrarDadoEspecial(), 2000);
    },

    evaluarCapsula(roll) {
        const res = $('dice-result'); if(!res) return;
        let msg = "", colorClass = "";

        if (roll <= 2) { msg = "ATAQUE (MEMORIA)"; colorClass = "text-gray-400"; }
        else if (roll <= 4) { msg = "HABILIDAD (MAZO)"; colorClass = "text-blue-400"; }
        else { msg = "CARTA (MAZO)"; colorClass = "text-yellow-400"; }

        res.innerHTML = `<div class="${colorClass} text-2xl font-black mb-2">${msg}</div>`;

        setTimeout(() => {
            $('overlay-dice').style.display = 'none';
            this.cartaEspecialPendiente = null;
            this.subtituloEspecialPendiente = null;
            const statusMsg = $('game-status-msg'); if(statusMsg) statusMsg.style.opacity = '1';

            if (this.turnoActivo === 'p1') {
                this.resolverOpcionesCapsulaP1(roll);
            } else {
                this.resolverOpcionesCapsulaP2(roll);
            }
        }, 2000);
    },

    resolverOpcionesCapsulaP1(roll) {
        let pool = [];
        let title = "";
        let accionRecuperar = (c, isMemoria, sourceArray, idx) => {
            sourceArray.splice(idx, 1);
            this.p1.mano.push(c);
            this.notify(`¡${c.nombre} añadida a tu mano!`);
            if (!isMemoria) {
                for (let i = this.p1.mazo.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [this.p1.mazo[i], this.p1.mazo[j]] = [this.p1.mazo[j], this.p1.mazo[i]];
                }
            }
            this.render();
        };

        if (roll <= 2) {
            title = "CÁPSULA: ELIGE ATAQUE DE MEMORIA";
            this.p1.memoria.forEach((c, i) => {
                if (c.tipo === "ATAQUE") pool.push({ card: c, idx: i, isMem: true, source: this.p1.memoria });
            });
        } else if (roll <= 4) {
            title = "CÁPSULA: ELIGE HABILIDAD DE MAZO";
            this.p1.mazo.forEach((id, i) => {
                if (DB[id] && DB[id].tipo === "HABILIDAD") {
                    pool.push({ card: DB[id], idx: i, isMem: false, source: this.p1.mazo });
                }
            });
        } else {
            title = "CÁPSULA: ELIGE CARTA DE MAZO";
            this.p1.mazo.forEach((id, i) => {
                pool.push({ card: DB[id], idx: i, isMem: false, source: this.p1.mazo });
            });
        }

        let uniquePool = [];
        let seen = new Set();
        pool.forEach(item => {
            if (!seen.has(item.card.id)) {
                seen.add(item.card.id);
                uniquePool.push(item);
            }
        });

        if (uniquePool.length === 0) {
            this.notify("No hay cartas válidas para elegir.");
            this.render();
            return;
        }

        const opciones = uniquePool.map(item => {
            return {
                text: `▶ AÑADIR ${item.card.nombre}`,
                card: item.card,
                btnText: 'AÑADIR',
                action: () => {
                    let realIdx = item.isMem ? this.p1.memoria.findIndex(c => c.id === item.card.id) : this.p1.mazo.findIndex(id => id === item.card.id);
                    if (realIdx > -1) {
                        accionRecuperar(item.card, item.isMem, item.source, realIdx);
                    }
                }
            };
        });
        this.showChoiceOptions(title, opciones);
    },

    resolverOpcionesCapsulaP2(roll) {
        let pool = [];
        if (roll <= 2) {
            this.p2.memoria.forEach((c, i) => { if (c.tipo === "ATAQUE") pool.push({ card: c, idx: i, isMem: true, source: this.p2.memoria }); });
        } else if (roll <= 4) {
            this.p2.mazo.forEach((id, i) => { if (DB[id] && DB[id].tipo === "HABILIDAD") pool.push({ card: DB[id], idx: i, isMem: false, source: this.p2.mazo }); });
        } else {
            this.p2.mazo.forEach((id, i) => { pool.push({ card: DB[id], idx: i, isMem: false, source: this.p2.mazo }); });
        }

        if (pool.length > 0) {
            let randomPick = pool[Math.floor(Math.random() * pool.length)];
            let c = randomPick.card;
            randomPick.source.splice(randomPick.idx, 1);
            this.p2.mano.push(c);
            if (!randomPick.isMem) {
                for (let i = this.p2.mazo.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [this.p2.mazo[i], this.p2.mazo[j]] = [this.p2.mazo[j], this.p2.mazo[i]];
                }
            }
            this.notify(`¡Rival añadió ${c.nombre} a su mano!`);
        } else {
            this.notify("Rival no encontró cartas válidas.");
        }
        this.render();
        setTimeout(() => this.ejecutarPasoActionRival(), 1500);
    },

    evaluarInvitacion(roll) {
        const res = $('dice-result'); if(!res) return;
        let msg = "", colorClass = "";

        if (roll <= 3) { msg = "FONDO DE MEMORIA"; colorClass = "text-gray-400"; }
        else { msg = "BUSCAR PERSONAJE"; colorClass = "text-blue-400"; }

        res.innerHTML = `<div class="${colorClass} text-2xl font-black mb-2">${msg}</div>`;

        setTimeout(() => {
            $('overlay-dice').style.display = 'none';
            this.cartaEspecialPendiente = null;
            this.subtituloEspecialPendiente = null;
            const statusMsg = $('game-status-msg'); if(statusMsg) statusMsg.style.opacity = '1';

            if (this.turnoActivo === 'p1') {
                this.resolverInvitacionP1(roll);
            } else {
                this.resolverInvitacionP2(roll);
            }
        }, 2000);
    },

    resolverInvitacionP1(roll) {
        if (roll <= 3) {
            if (this.p1.memoria.length > 0) {
                let card = this.p1.memoria.splice(0, 1)[0];
                this.p1.mano.push(card);
                this.notify(`¡${card.nombre} recuperada del fondo de tu memoria!`);
            } else {
                this.notify("Tu memoria está vacía.");
            }
            this.render();
            return;
        }
        
        let personajesMazo = [];
        this.p1.mazo.forEach((id, i) => {
            if (DB[id] && DB[id].tipo === "PERSONAJE") personajesMazo.push({ card: DB[id], idx: i });
        });
        
        let uniquePool = []; let seen = new Set();
        personajesMazo.forEach(item => { if (!seen.has(item.card.id)) { seen.add(item.card.id); uniquePool.push(item); } });

        if (uniquePool.length === 0) {
            this.notify("No quedan personajes en tu mazo.");
            this.render();
            return;
        }

        const opciones = uniquePool.map(item => {
            return {
                text: `▶ SELECCIONAR ${item.card.nombre}`,
                card: item.card,
                btnText: 'ELEGIR',
                action: () => {
                    let realIdx = this.p1.mazo.findIndex(id => id === item.card.id);
                    if (realIdx > -1) {
                        let chosenCard = DB[this.p1.mazo.splice(realIdx, 1)[0]];
                        for (let i = this.p1.mazo.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [this.p1.mazo[i], this.p1.mazo[j]] = [this.p1.mazo[j], this.p1.mazo[i]]; }
                        
                        let canjesLibres = [];
                        if (!this.p1.campo.canje1) canjesLibres.push('canje1');
                        if (!this.p1.campo.canje2) canjesLibres.push('canje2');
                        
                        if (canjesLibres.length > 0) {
                            this.showChoiceOptions("¿DÓNDE COLOCAR EL PERSONAJE?", [
                                { text: "▶ AÑADIR A LA MANO", action: () => { this.p1.mano.push(chosenCard); this.notify(`¡${chosenCard.nombre} a tu mano!`); this.render(); } },
                                { text: `▶ COLOCAR EN CANJE`, action: () => { this.p1.campo[canjesLibres[0]] = chosenCard; this.notify(`¡${chosenCard.nombre} al canje!`); this.checkCanjes(this.p1); this.render(); } }
                            ]);
                        } else {
                            this.p1.mano.push(chosenCard); this.notify(`¡${chosenCard.nombre} añadida a tu mano! (Canjes llenos)`); this.render();
                        }
                    }
                }
            };
        });
        this.showChoiceOptions("ELIGE PERSONAJE DEL MAZO", opciones);
    },

    resolverInvitacionP2(roll) {
        if (roll <= 3) {
            if (this.p2.memoria.length > 0) {
                let card = this.p2.memoria.splice(0, 1)[0];
                this.p2.mano.push(card);
                this.notify(`¡Rival recuperó ${card.nombre} de su memoria!`);
            } else {
                this.notify("La memoria del rival estaba vacía.");
            }
            this.render();
            setTimeout(() => this.ejecutarPasoActionRival(), 1500);
            return;
        }
        
        let personajesMazo = [];
        this.p2.mazo.forEach((id, i) => {
            if (DB[id] && DB[id].tipo === "PERSONAJE") personajesMazo.push({ id: id, idx: i });
        });

        if (personajesMazo.length > 0) {
            let chosen = personajesMazo[Math.floor(Math.random() * personajesMazo.length)];
            let chosenCard = DB[this.p2.mazo.splice(chosen.idx, 1)[0]];
            for (let i = this.p2.mazo.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [this.p2.mazo[i], this.p2.mazo[j]] = [this.p2.mazo[j], this.p2.mazo[i]]; }
            
            let canjesLibres = [];
            if (!this.p2.campo.canje1) canjesLibres.push('canje1');
            if (!this.p2.campo.canje2) canjesLibres.push('canje2');
            
            if (canjesLibres.length > 0 && Math.random() > 0.3) {
                this.p2.campo[canjesLibres[0]] = chosenCard;
                this.notify(`¡Rival colocó a ${chosenCard.nombre} en su canje!`);
                this.checkCanjes(this.p2);
            } else {
                this.p2.mano.push(chosenCard);
                this.notify(`¡Rival añadió a ${chosenCard.nombre} a su mano!`);
            }
        } else {
            this.notify("El rival no tenía personajes en su mazo.");
        }
        this.render();
        setTimeout(() => this.ejecutarPasoActionRival(), 1500);
    },
    
    cerrarDadoEspecial(isCombat = false) {
        const statusMsg = $('game-status-msg'); if(statusMsg) statusMsg.style.opacity = '1';
        $('overlay-dice').style.display = 'none';
        this.cartaEspecialPendiente = null;
        this.subtituloEspecialPendiente = null;
        this.render();
        if (this.p2.derrotado) { this.mostrarPantallaFin("¡GOLPE FATAL!<br>Has aplastado al rival.", true); return; }
        if (this.p1.derrotado) { this.mostrarPantallaFin("¡GOLPE FATAL RECIBIDO!<br>Tu relikario ha sido destruido.", false); return; }
        if (this.turnoActivo === 'p2') {
            if (isCombat) this.ejecutarPasoCombatRival();
            else this.ejecutarPasoActionRival();
        }
    },

    showDetail(idx) {
        if (this.turnoActivo !== 'p1') return; this.selectedHandIdx = idx; const c = this.p1.mano[idx];
        const fase = this.fases[this.faseIdx]; let actions = '';

        if (c.tipo === "COMBO") {
            actions += '<span class="text-gray-400 text-xs text-center font-bold">CARTA DE COMBO<br>El juego te preguntará si deseas usarla justo ANTES de lanzar un dado.</span>';
        }
        else if (fase === 'COMBAT') { if (c.tipo === "ATAQUE") actions += this.createActionBtn("ATACAR", "bg-red-600", 'ataque'); else if (c.tipo === "HABILIDAD") actions += this.createActionBtn("ENSEÑAR HABILIDAD", "bg-blue-600", 'habilidad'); else actions += '<span class="text-gray-400 text-xs text-center">Carta no utilizable en COMBAT</span>'; } 
        else if (fase === 'ACTION') {
            if (c.tipo === "EQUIPO") actions += this.createActionBtn("EQUIPAR (1 REST)", "bg-green-600", 'equipo'); else if (c.tipo === "CÓDIGO" || c.tipo === "PERSONAJE") { if (c.id !== "jessica") actions += this.createActionBtn("ACTIVAR EFECTO (1 REST)", "bg-purple-600", 'activar'); }
            actions += this.createActionBtn("CANJEAR (1 REST)", "bg-gray-600", 'canje');
        } else { actions += '<span class="text-gray-400 text-xs text-center">Espera a tu fase COMBAT o ACTION</span>';  }
        
        this.baseShowDetail(c, actions);
    },

    showFieldDetail(slotId, isRival = false) {
        if (this.turnoActivo !== 'p1') return; const targetPlayer = isRival ? this.p2 : this.p1; const c = targetPlayer.campo[slotId]; if (!c) return;
        this.selectedFieldSlot = isRival ? null : slotId; this.selectedHandIdx = null;
        let actions = '';
        if (isRival) { actions = '<span class="text-gray-400 text-xs text-center font-bold">CARTA DEL RIVAL<br>No puedes interactuar.</span>'; } 
        else {
            const fase = this.fases[this.faseIdx];
            if (c.id === "jessica" && fase === "COMBAT") { if (!this.p1.jessicaUsada) actions = this.createActionBtn("ATACAR CON JESSICA", "bg-red-600", 'jessica_attack'); else actions = '<span class="text-gray-400 text-xs text-center font-bold">Jessica ya atacó</span>'; } 
            else if (["doubleJump", "shuffle", "hoja", "cintaMelocoton", "esferaPuntaje", "tripleAtaque", "flauta", "barreraEnergia", "besoSucubo", "restosPerenazana"].includes(c.id)) { actions = '<span class="text-gray-400 text-xs text-center">Efecto pasivo o reacción.</span>'; } else { actions = '<span class="text-gray-400 text-xs text-center">Sin acciones manuales aquí.</span>'; }
        }
        this.baseShowDetail(c, actions);
    },

    showRelikarioDetail(targetPlayer) {
        if (this.turnoActivo !== 'p1') return; 
        const c = DB['yuno']; const p = targetPlayer === 'p1' ? this.p1 : this.p2;
        this.selectedFieldSlot = null; this.selectedHandIdx = null;
        let effectText = c.efecto;
        if (p.equiposRelikario.length > 0) {
            effectText += `<br><br><span class="text-pink-400 font-bold uppercase tracking-widest text-[10px]">-- CARTAS EQUIPADAS --</span><br>`;
            p.equiposRelikario.forEach(eq => { effectText += `<span class="text-white text-[10px]"><b class="text-pink-300">${eq.nombre}:</b> ${eq.efecto}</span><br>`; });
        }
        c.efecto = effectText;
        
        const customArt = (artNode) => {
            let htmlContent = ''; if (c.img) htmlContent += `<div style="position:absolute; inset:0; background-image:url('${c.img}'); background-size:cover; background-position:center; border-radius:inherit;"></div>`; 
            if (p.equiposRelikario.length > 0) {
                 htmlContent += `<div class="absolute -bottom-6 flex gap-2 w-full justify-center z-10 flex-wrap px-2">`;
                 p.equiposRelikario.forEach(eq => { htmlContent += `<div class="w-10 h-14 border border-pink-500 rounded bg-cover bg-center shadow-[0_5px_10px_rgba(0,0,0,0.8)]" style="background-image:url('${eq.img || ''}'); background-color:${eq.color}"></div>`; });
                 htmlContent += `</div>`;
            }
            artNode.innerHTML = htmlContent; artNode.style.backgroundColor = 'transparent'; artNode.style.borderColor = c.color; 
        };
        this.baseShowDetail(c, '<span class="text-gray-400 text-xs text-center font-bold">Relikario Principal<br>Contiene pasivas y mejoras.</span>', customArt);
        c.efecto = DB['yuno'].efecto; // reset text
    },

    showMemoriaDetail(carta) {
        this.baseShowDetail(carta, '<span class="text-gray-400 text-xs text-center font-bold">CARTA EN MEMORIA<br>Solo vista previa.</span>');
    },

    closeDetail() { const overlay = $('overlay-detail'); if (overlay) { overlay.style.display = 'none'; } },

    showMemoria(tipo) {
        if (this.turnoActivo !== 'p1') return;
        const p = tipo === 'player' ? this.p1 : this.p2; const grid = $('memoria-grid'); grid.innerHTML = '';
        $('memoria-title').innerText = tipo === 'player' ? "Tu Memoria" : "Memoria Rival";
        if (p.memoria.length === 0) { grid.innerHTML = '<div class="col-span-full text-center text-gray-500 font-bold">Memoria vacía</div>'; } 
        else {
            p.memoria.forEach((c, idx) => {
                const div = document.createElement('div');
                div.className = 'w-full aspect-[2.5/3.5] bg-cover bg-center border border-gray-600 rounded cursor-pointer relative shadow-[0_2px_10px_rgba(0,0,0,0.5)] overflow-hidden';
                const artData = Game.getCardArtHtml(c);
                div.innerHTML = artData.html;
                if(artData.css) { div.style.cssText += artData.css; } else { div.style.backgroundColor = c.color; }
                
                div.onclick = () => {
                    if (this.selectingFromMemoria) {
                        this.selectingFromMemoria = false; $('overlay-memoria').style.display = 'none';
                        const elegida = p.memoria.splice(idx, 1)[0]; this.p1.mano.push(elegida); this.notify(`Recuperaste ${elegida.nombre}`); this.render();
                    } else { this.showMemoriaDetail(c); }
                };
                grid.appendChild(div);
            });
        }
        $('overlay-memoria').style.display = 'flex';
    },

    closeMemoria() { this.selectingFromMemoria = false; $('overlay-memoria').style.display = 'none'; },
    clickMemoria() { if (this.p1.memoria.length > 0) this.showMemoria('player'); },
    notify(msg) { const notif = $('notification'); notif.innerHTML = msg; notif.style.display = 'block'; setTimeout(() => { notif.style.display = 'none'; }, 2500); },

    render() {
        $('p-mem-count').innerText = this.p1.memoria.length; $('r-mem-count').innerText = this.p2.memoria.length;
        $('player-lp-text').innerText = `${this.p1.lp}/8`; $('rival-lp-text').innerText = `${this.p2.lp}/8`;
        $('player-lp-bar').style.width = `${(this.p1.lp/8)*100}%`; $('rival-lp-bar').style.width = `${(this.p2.lp/8)*100}%`;
        $('bottom-pr-count').innerText = this.p1.pr; $('top-pr-count').innerText = this.p2.pr;
        $('p-mazo-visual').innerText = this.p1.mazo.length; $('r-mazo-visual').innerText = this.p2.mazo.length;
        
        const updateSlot = (pObj, prefix) => {
            ['bonus', 'canje1', 'canje2', 'equipo', 'hab0', 'hab300', 'hab500', 'hab1000'].forEach(slot => {
                const el = $(`${prefix}-slot-${slot}`); if(!el) return;
                el.innerHTML = ''; const c = pObj.campo[slot];
                if (c) {
                    const inner = document.createElement('div'); inner.className = 'card-field absolute inset-0.5 shadow-md overflow-hidden';
                    const art = Game.getCardArtHtml(c);
                    inner.innerHTML = art.html;
                    if(art.css) { inner.style.cssText = `${art.css} background-color:${c.color}; border:1px solid ${c.color};`; } 
                    else { inner.style.backgroundColor = c.color; inner.style.border = `1px solid ${c.color}`; }
                    
                    if (c.barrera) { inner.innerHTML += `<div class="absolute inset-0 border-2 border-[#00d2ff] shadow-[0_0_10px_#00d2ff,inset_0_0_10px_#00d2ff] pointer-events-none rounded-[inherit] z-20"></div><div class="absolute -top-2 -right-2 text-sm z-30 filter drop-shadow-[0_0_5px_#00d2ff]">🛡️</div>`; }
                    if (c.perenazana) { inner.innerHTML += `<div class="absolute inset-0 border-2 border-[#ff003c] shadow-[0_0_10px_#ff003c,inset_0_0_10px_#ff003c] pointer-events-none rounded-[inherit] z-20 opacity-50"></div><div class="absolute -bottom-2 -left-2 text-sm z-30 filter drop-shadow-[0_0_5px_#ff003c]">🍎</div>`; }
                    el.appendChild(inner);
                } else {
                    if (slot==='bonus') el.innerHTML = `<span class="slot-title text-yellow-500">BONUS</span>`; else if(slot==='equipo') el.innerHTML = `<span class="slot-title text-green-400">EQ</span>`;
                    else if(slot.startsWith('hab')) { let cost = slot.replace('hab',''); if(cost!=='0') el.innerHTML = `<span class="absolute inset-0 flex items-center justify-center text-[7px] text-red-500 font-bold opacity-30 pointer-events-none text-center">HAB<br>${cost}PR</span>`; }
                }
            });
            const rb = $(`${prefix}-relikario-badges`); if (rb) { rb.innerHTML = ''; pObj.equiposRelikario.forEach(eq => { const b = document.createElement('div'); b.className = 'w-4 h-4 rounded-full border border-white bg-cover bg-center shadow-md'; b.style.backgroundImage = `url('${eq.img}')`; rb.appendChild(b); }); }
        };
        updateSlot(this.p1, 'p'); updateSlot(this.p2, 'r');

        // ¡AQUÍ ESTÁ LA MAGIA PARA YUNO EN EL TABLERO!
        const pYuno = $('p-yuno-char'); if(pYuno) pYuno.style.backgroundImage = `url('${DB['yuno'].img}')`;
        const rYuno = $('r-yuno-char'); if(rYuno) rYuno.style.backgroundImage = `url('${DB['yuno'].img}')`;

        const ph = $('player-hand'); ph.innerHTML = '';
        this.p1.mano.forEach((c, i) => {
            const card = document.createElement('div'); card.className = 'card-hand relative overflow-hidden flex items-center justify-center'; card.style.borderColor = c.color;
            const art = Game.getCardArtHtml(c);
            card.innerHTML = art.html;
            if(art.css) { card.style.cssText += art.css; } else { card.style.backgroundColor = '#111'; }
            card.onclick = () => this.showDetail(i); ph.appendChild(card);
        });
        
        const rh = $('rival-hand-visual'); rh.innerHTML = '';
        this.p2.mano.forEach(() => { const cb = document.createElement('div'); cb.className = 'card-back'; rh.appendChild(cb); });
    }
};