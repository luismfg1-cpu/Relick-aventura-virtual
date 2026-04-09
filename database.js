// ==========================================
// BASE DE DATOS DE CARTAS - RELICK (VERSIÓN LOCAL)
// ==========================================

const DB = {
    "yuno": { 
        id: "yuno", nombre: "Yuno", tipo: "RELIKARIO", rareza: "Súper Rara", color: "#00d2ff", img: "img/yuno.png", 
        efecto: "Pasiva: 1 vez por turno al atacar (salvo un 1) puedes relanzar. Si ese relanzamiento es 6, se vuelve 5." 
    },
    "shuffle": { 
        id: "shuffle", nombre: "Relick Destiny Shuffle", tipo: "HABILIDAD", rareza: "Común", color: "#3b82f6", img: "img/shuffle.png", stats: { base: 3, crit: 5, pr: 600 }, 
        efecto: "0 PR. Daño: 3 / Crítico: 5. Premio: 600 PR." 
    },
    "doubleJump": { 
        id: "doubleJump", nombre: "Relick Double Jump", tipo: "HABILIDAD", rareza: "Común", color: "#3b82f6", img: "img/doubleJump.png", stats: { base: 2, crit: 3, pr: 300 }, 
        efecto: "Daño: 2 / Crítico: 3. Premio: 300 PR. Puedes destruir esta carta para dar +2 a un dado (no puede quedar en 6)." 
    },
    "ataque": { 
        id: "ataque", nombre: "Ataque", tipo: "ATAQUE", rareza: "Común", color: "#ef4444", img: "img/ataque.png", 
        efecto: "Lanza 1 dado. 1-3: Falla. 4: Mitad. 5: Normal. 6: Crítico." 
    },
    "hoja": { 
        id: "hoja", nombre: "Hoja del Caos LVO", tipo: "EQUIPO", rareza: "Común", color: "#22c55e", img: "img/hoja.png", 
        efecto: "Pasiva: +1 a tus daños. Activa: Sacrifícala para relanzar cualquier dado." 
    },
    "disquete": { 
        id: "disquete", nombre: "Disquete", tipo: "CÓDIGO", rareza: "Común", color: "#9ca3af", img: "img/disquete.png", 
        efecto: "Activar (Memoria): Recupera 1 carta de CUALQUIER memoria a tu mano." 
    },
    "bomba": { 
        id: "bomba", nombre: "Bomba de Tiempo", tipo: "CÓDIGO", rareza: "Común", color: "#9ca3af", img: "img/bomba.png", 
        efecto: "Activar (Memoria): Destruye 1 Equipo, Mano o Bonus del Rival." 
    },
    "jessica": { 
        id: "jessica", nombre: "Jessica Lee", tipo: "PERSONAJE", rareza: "Común", color: "#9ca3af", img: "img/jessica.png", 
        efecto: "COMBAT (en campo): Lanza dado. 5: 2 daño. 6: 3 daño + roba 1." 
    },
    "cofre": { 
        id: "cofre", nombre: "Cofre 8Bits Lvl 0", tipo: "CÓDIGO", rareza: "Común", color: "#9ca3af", img: "img/cofre.png", 
        efecto: "Activar: 1: -1 LP. 2-4: +2 LP. 5-6: Roba 2 cartas." 
    },
    "guang": { 
        id: "guang", nombre: "Maestro Guang Lvl 0", tipo: "PERSONAJE", rareza: "Común", color: "#9ca3af", img: "img/guang.png", 
        efecto: "Activar: 3-6: Busca un Personaje en tu mazo y ponlo en un canje." 
    },
    "huevoAzul": { 
        id: "huevoAzul", nombre: "Huevo Azul Explosivo", tipo: "CÓDIGO", rareza: "Rara", color: "#9ca3af", img: "img/huevoAzul.png", 
        efecto: "Activar: Selecciona y destruye una NO-HABILIDAD en cualquier campo. Luego, puedes pagar 200 PR para robar 1 carta." 
    },
    "boomerang": { 
        id: "boomerang", nombre: "Boomerang", tipo: "CÓDIGO", rareza: "Súper Rara", color: "#9ca3af", img: "img/boomerang.png", 
        efecto: "Activar: Devuelve 1 Equipo a TU mano, o inflige 1 daño NO LETAL. Luego, lanza 1d6. En 5 o 6, regresa a tu mano." 
    },
    "paqueteProhibido": { 
        id: "paqueteProhibido", nombre: "Paquete de Cartas Prohibido", tipo: "CÓDIGO", rareza: "Súper Rara", color: "#9ca3af", img: "img/paqueteProhibido.png", 
        efecto: "Activar: Abre 1 sobre de cartas de Relick. Elige 2 cartas aleatorias de ese sobre y añádelas a tu mano." 
    },
    "cintaMelocoton": { 
        id: "cintaMelocoton", nombre: "Cinta Melocotón 8Bits", tipo: "CÓDIGO", rareza: "Común", color: "#9ca3af", img: "img/cintaMelocoton.png", 
        efecto: "Tú y el rival lanzan 1d6. Si obtienes el resultado mayor, equipa esta carta a tu Relikario. Mientras esté equipada: cada vez que aciertes un ataque, roba 1 carta." 
    },
    "senshuni": { 
        id: "senshuni", nombre: "Senshuni", tipo: "CÓDIGO", rareza: "Común", color: "#9ca3af", img: "img/senshuni.png", 
        efecto: "Activar: Roba 2 cartas." 
    },
    "esferaPuntaje": { 
        id: "esferaPuntaje", nombre: "Esfera de Puntaje", tipo: "CÓDIGO", rareza: "Común", color: "#9ca3af", img: "img/esferaPuntaje.png", 
        efecto: "Activar: Obtienes 600 PR al instante." 
    },
    "tripleAtaque": { 
        id: "tripleAtaque", nombre: "Triple Ataque Cruzado", tipo: "CÓDIGO", rareza: "Rara", color: "#9ca3af", img: "img/tripleAtaque.png", 
        efecto: "Activar: Busca 3 cartas de Ataque en tu mazo y añádelas a tu mano. Si tienes menos de 3 Ataques en el mazo, el efecto falla." 
    },
    "flauta": { 
        id: "flauta", nombre: "Flauta de Madera", tipo: "CÓDIGO", rareza: "Común", color: "#9ca3af", img: "img/flauta.png", 
        efecto: "Activar: Envía 1 carta de cualquier campo (Habilidad, Equipo, Bonus, Canjes o Relikario) al tope del mazo de su dueño." 
    },
    "tanqueEnergia": { 
        id: "tanqueEnergia", nombre: "Tanque de Energía", tipo: "CÓDIGO", rareza: "Común", color: "#9ca3af", img: "img/tanqueEnergia.png", 
        efecto: "Activar: Gana 2 LP. Luego, si tienes menos vida que tu adversario, roba 1 carta." 
    },
    "tnt": { 
        id: "tnt", nombre: "TNT", tipo: "CÓDIGO", rareza: "Común", color: "#9ca3af", img: "img/tnt.png", 
        efecto: "Activar: Tu adversario lanza 3 dados. Si el 1º es 1, el 2º es 2 o el 3º es 3, se anula. Si no, elige: Destruye 2 cartas del rival (sin vaciar su Zona de Hab.) o inflígele 2 de daño no letal." 
    },
    "barreraEnergia": { 
        id: "barreraEnergia", nombre: "Barrera de Energía", tipo: "CÓDIGO", rareza: "Común", color: "#9ca3af", img: "img/barreraEnergia.png", 
        efecto: "Coloca esta carta encima de cualquier carta del campo excepto la carta de relikario. Si esa carta es seleccionada por cualquier efecto de carta: Destruye esta carta en su lugar." 
    },
    "c-ro": { 
        id: "c-ro", nombre: "C-ro", tipo: "PERSONAJE", rareza: "Rara", color: "#9ca3af", img: "img/c-ro.png", 
        efecto: "Activar: Envía todas las cartas de tu mano al mazo (si no tienes cartas en tu mano no envías nada), revuelve y luego roba 5 cartas." 
    },
    "besoSucubo": { 
        id: "besoSucubo", nombre: "Beso de Súcubo", tipo: "PERSONAJE", rareza: "Súper Rara", color: "#9ca3af", img: "img/besoSucubo.png", 
        efecto: "Puedes colocarla en el canje rival. El jugador con esta carta en canje lanza 1D6 tras robar: 1-2: Pierde 2 vidas, Súcubo indestructible este turno y bloquea canjes. 3-4: Recibe 1 daño no letal. 5-6: Súcubo se destruye." 
    },
    "dadoDoble": { 
        id: "dadoDoble", nombre: "Dado Doble", tipo: "COMBO", rareza: "Común", color: "#9ca3af", img: "img/dadoDoble.png", 
        efecto: "Activar ANTES de lanzar un dado: Lanza 2 dados. Elige uno o súmalos. Si la suma elegida es 6 o superior, el resultado final será 5." 
    },
    "capsulaBolsillo": { 
        id: "capsulaBolsillo", nombre: "Cápsula de Bolsillo Común", tipo: "CÓDIGO", rareza: "Común", color: "#9ca3af", img: "img/capsulaBolsillo.png", 
        efecto: "Activar: Lanza 1D6 y añade a tu mano: 1-2: Un ataque de tu memoria. 3-4: Una habilidad de tu mazo. 5-6: Cualquier carta de tu mazo." 
    },
    "cartaInvitacion": { 
        id: "cartaInvitacion", nombre: "Carta de Invitación", tipo: "CÓDIGO", rareza: "Común", color: "#9ca3af", img: "img/cartaInvitacion.png", 
        efecto: "Activar: Lanza 1D6: 1-3: Añade a tu mano la carta del fondo de tu memoria. 4-6: Busca un personaje de tu mazo y añádelo a tu mano o colócalo en una zona de canje vacía." 
    },
    "restosPerenazana": { 
        id: "restosPerenazana", nombre: "Restos de Perenazana", tipo: "CÓDIGO", rareza: "Rara", color: "#9ca3af", img: "img/restosPerenazana.png", 
        efecto: "Coloca esta carta encima de una carta en el campo. Si esta carta está encima de un relikario: Este gana +1 vida al final de su turno. Si sacas 1 en uno de tus dados mientras esta carta está encima de un relikario: Destruye esta carta." 
    },
    "codigoKonami": { 
        id: "codigoKonami", nombre: "Código Konami", tipo: "CÓDIGO", rareza: "Súper Rara", color: "#facc15", img: "", 
        efecto: "↑↑↓↓←→←→BA<br>Activar (1 REST): Hackeas el juego. Restauras toda tu HP al máximo y robas 2 cartas." 
    }
};