import { characters, expressions, type CharacterId, type Expression, type Animation } from './model';

let serial = 0;
const ink = '#583746';
const rainbow = ['#f789b6', '#ffc167', '#ffe381', '#80d6b0', '#83cbea', '#b39beb'];

/** All paint and motion live inside the stage, including when embedded in a group. */
export function characterSvg(id: CharacterId, expression: Expression = 'joie', animation: Animation = 'repos', motion: 'full' | 'reduce' = 'full'): string {
    const e = expression === 'celebration' ? 'joie' : expressions.includes(expression) ? expression : 'joie';
    const prefix = `guide${++serial}-`;
    const c = characters[id];
    const panda = id === 'panda';
    const red = id === 'pandaroux';
    const dragon = id === 'dragon';
    const monkey = id === 'singe';
    const unicorn = id === 'licorne';
    const url = (name: string): string => `url(#${prefix}${name})`;
    const path = (d: string, fill: string, width = 4, stroke = ink): string => `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
    const ellipse = (x: number, y: number, rx: number, ry: number, fill: string, width = 4, stroke = ink): string => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"/>`;
    const gradient = (name: string, light: string, mid: string, shade: string): string => `<radialGradient id="${prefix}${name}" cx="30%" cy="22%" r="80%"><stop offset="0" stop-color="${light}"/><stop offset="0.55" stop-color="${mid}"/><stop offset="1" stop-color="${shade}"/></radialGradient>`;
    const shades = panda || unicorn ? ['#ffffff', c.coat, '#c7b8cc'] : red ? ['#ffd095', c.coat, '#9d3c25'] : dragon ? ['#ffb082', c.coat, '#ad2637'] : ['#e7b887', c.coat, '#72452f'];
    const coat = url('coat');
    const dark = url('dark');
    const cream = url('cream');
    const pink = url('pink');
    const gold = url('gold');
    const star = (x: number, y: number, size: number): string => path(`M${x} ${y-size} l${size*.3} ${size*.65} ${size*.7} ${size*.1} -${size*.5} ${size*.5} ${size*.13} ${size*.75} -${size*.63} -${size*.35} -${size*.63} ${size*.35} ${size*.13} -${size*.75} -${size*.5} -${size*.5} ${size*.7} -${size*.1}Z`, gold, 2);
    const tailShape = 'M151 185 C221 221 238 149 209 122 L205 116 202 122 Q178 112 181 138 L177 145 185 145 C203 169 175 168 151 185Z';
    const bodyShape = 'M82 145 Q78 135 91 135 L88 128 98 133 Q120 124 143 134 L152 129 150 138 Q166 150 163 180 L168 184 160 187 Q158 209 139 209 L133 214 127 210 Q96 216 81 197 L76 193 80 188 Q73 168 82 145Z';
    let rear = '';
    if (red) {
        rear += path(tailShape, url('tailCoat'));
        rear += `<g clip-path="${url('tail')}">`;
        for (let i = 0; i < 5; i++) rear += path(`M${173+i*7} ${193-i*16} q27 9 47 -13`, cream, 8, '#ffe6be');
        rear += '</g>' + path(tailShape, 'none');
    }
    if (monkey) rear += path('M158 182 C227 213 232 144 208 142 C187 141 190 164 205 160', 'none', 10, '#885334');
    if (dragon) {
        rear += path('M151 183 Q212 207 217 160 Q203 174 179 155Z', coat);
        for (const flip of [false, true]) rear += `<g${flip ? ' transform="translate(240 0) scale(-1 1)"' : ''}>${path('M78 159 Q39 160 15 110 L34 116 28 85 Q64 94 78 128 L92 156Z', url('wing'))}${path('M30 104 L62 130 L44 139 M62 130 L76 154', 'none', 2.3)}</g>`;
    }
    if (unicorn) for (let i = 5; i >= 0; i--) rear += path(`M166 ${157+i*3} C225 137 191 203 216 ${201+i*2} Q189 221 182 184`, url(`mane${i}`), 2);
    let body = panda
        ? path(bodyShape, dark, 4.5) + path('M80 151 Q120 135 160 151 Q180 187 155 205 L147 208 140 204 133 210 Q94 216 81 197 Q72 177 80 151Z', coat, 2)
        : monkey
            ? path('M101 133 Q120 126 139 135 L148 177 Q120 191 94 175Z', coat, 3.8) + path('M105 139 L136 139 140 174 Q120 182 101 172Z', pink, 1.5)
            : unicorn
                ? path('M104 131 Q132 127 153 149 Q184 143 186 170 L177 194 172 215 155 215 153 184 119 185 108 211 90 211 98 178 Q83 153 104 131Z', coat, 4)
                : (red ? path(bodyShape, coat) : ellipse(120, 168, 45, 44, coat, 4)) + ellipse(116, 168, 28, 33, cream, 0);
    if (red) body += path('M84 137 L90 132 88 145 Q92 163 80 177 Q65 173 63 151 L66 143 65 135 73 140Z', dark, 2) + path('M151 135 Q166 132 176 144 L179 140 178 152 Q186 174 164 180 L155 163Z', dark, 2);
    if (dragon) for (const y of [150, 162, 174, 186]) body += path(`M94 ${y} Q119 ${y+10} 143 ${y}`, 'none', 1.8, '#c59760');
    for (const x of unicorn ? [98, 165] : monkey ? [107, 139] : [87, 151]) {
        body += ellipse(x, monkey ? 215 : 205, monkey ? 13 : unicorn ? 12 : 23, monkey ? 9 : 14, panda || red ? dark : monkey ? pink : unicorn ? url('pearl') : coat);
        body += ellipse(x-5, 201, 9, 4, '#ffffff', 0).replace('fill="#ffffff"', 'fill="#ffffff" opacity="0.35"');
        if (monkey) body += path(`M${x-10} 201 l19 6 m-17 -1 17 -7`, 'none', 1.6, '#fff0df');
    }
    if (monkey) {
        body += path('M106 184 L108 211 M138 184 L139 211', 'none', 11, '#a36a49');
        body += path('M78 166 Q120 183 163 166 L177 180 Q163 192 150 183 Q136 197 121 187 Q105 197 92 187 Q75 192 65 180Z', pink, 2);
        body += path('M78 170 Q120 186 163 170 L185 190 Q169 201 155 194 Q141 207 126 198 Q110 208 96 198 Q78 203 57 191Z', pink);
        for (const x of [82, 100, 120, 140, 158]) body += path(`M${x} 179 Q${x} 188 ${x + (x < 120 ? -6 : 6)} 195`, 'none', 3, '#bd5c89');
        body += path('M83 173 Q120 185 157 173', 'none', 2.5, '#ffe8f1');
        body += path('M82 171 Q120 183 160 171', 'none', 4, '#a74275');
    }
    if (monkey) body += path('M102 156 Q74 163 55 150 M139 156 Q167 159 184 149', 'none', 12, '#a36a49') + ellipse(53, 149, 10, 8, cream, 2) + ellipse(186, 149, 10, 8, cream, 2);
    else if (!unicorn) for (const x of [75, 167]) body += ellipse(x, 155, 16, 27, panda || red ? dark : coat);
    let head = '';
    if (panda || monkey) for (const x of monkey ? [57, 183] : [70, 170]) head += ellipse(x, 59, monkey ? 26 : 18, monkey ? 29 : 19, monkey ? coat : dark) + ellipse(x-1, 59, 12, 14, monkey ? cream : '#9c7370', 0);
    else if (!dragon) for (const x of unicorn ? [83, 150] : [72, 169]) head += path(`M${x-18} 70 Q${x-25} 40 ${x-12} 28 Q${x+8} 34 ${x+18} 63Z`, red ? cream : coat) + path(`M${x-11} 59 L${x-11} 40 ${x+9} 60Z`, pink, 0);
    if (dragon) for (const x of [77, 163]) {
        head += path(`M${x-9} 53 Q${x-28} 30 ${x-12} 12 Q${x-12} 31 ${x+12} 44Z`, gold);
        head += path(`M${x-14} 32 l12 -3 m-9 12 13 -4`, 'none', 1.8, '#b87938');
    }
    const headShape = panda
        ? 'M57 91 Q54 67 78 53 L75 48 85 50 Q99 43 112 44 L119 39 123 44 Q162 43 181 73 L187 72 184 82 Q187 94 184 111 L190 115 183 117 187 124 179 124 Q161 155 126 154 L120 159 114 154 Q77 155 60 131 L53 131 57 123 51 120 56 114 Q53 102 57 91Z'
        : red
            ? 'M61 74 Q72 46 109 45 L110 39 116 43 120 36 126 44 133 40 135 45 Q163 42 179 74 L185 105 199 114 184 119 194 128 177 130 181 137 Q150 156 120 153 Q84 157 60 137 L64 131 46 128 56 119 41 113 57 104Z'
            : dragon
                ? 'M64 76 Q69 47 103 47 L113 38 122 46 Q159 43 174 68 Q190 83 179 104 Q200 116 185 137 Q169 158 126 153 Q78 155 62 131 Q50 116 64 76Z'
                : monkey
                    ? 'M62 84 Q61 51 99 47 L110 40 120 46 Q163 40 177 72 Q190 102 174 127 Q159 149 121 150 Q79 152 64 129 L58 131 60 124 54 120 59 116 Q52 109 62 84Z'
                    : 'M73 79 Q71 53 98 48 Q130 40 150 62 Q165 80 158 104 L172 126 Q178 151 153 161 Q126 169 108 151 L82 126 Q63 107 73 79Z';
    head += path(headShape, coat, 4.2);
    head += `<g clip-path="${url('head')}">${path('M171 58 Q198 129 131 151 Q96 161 64 134 L56 163 204 170 205 52Z', url('shade'), 0)}${path('M59 103 Q52 56 108 48', 'none', 3, '#fff4dc')}</g>`;
    if (!dragon && !unicorn) {
        head += path('M93 56 l10 -3 -5 7 12 -5 -4 9 12 -8', 'none', 1.8, '#fff0d4');

    }
    body += path('M143 184 Q153 177 154 165 Q167 200 138 207 L129 210Z', url('shade'), 0);
    body += path('M89 145 Q82 162 86 177', 'none', 2.5, '#fff1d9');
    head += path(panda ? 'M67 78 Q78 53 105 53' : 'M72 70 Q86 51 104 54', 'none', 2.2, '#fff4d9');
    if (red) {
        head += path('M59 94 Q74 89 91 111 L112 132 Q83 149 64 126 L53 124 L62 115 L54 110Z', cream, 0);
        head += path('M180 91 Q158 94 148 111 L127 133 Q160 149 178 125 L187 122 L179 113 L185 106Z', cream, 0);
        head += path('M83 76 Q94 64 106 75 M141 74 Q154 62 165 73', 'none', 6, '#fff0da');
    }
    if (monkey) head += path('M67 98 C60 64 100 62 120 85 C139 60 178 66 174 101 Q181 139 123 146 Q70 147 67 98Z', cream, 2);
    if (panda) for (const x of [88, 151]) head += `<g transform="rotate(${x < 120 ? 24 : -24} ${x} 98)">${path(`M${x} 67 C${x+29} 70 ${x+31} 119 ${x+8} 130 C${x-16} 139 ${x-29} 109 ${x-22} 88 Q${x-15} 69 ${x} 67Z`, dark, 0)}</g>`;
    if (red) for (const x of [88, 150]) head += path(`M${x-8} 110 Q${x} 116 ${x+9} 110 L${x+6} 128 Q${x-2} 136 ${x-7} 124Z`, '#793f30', 0);
    if (unicorn) {
        for (let i = 5; i >= 0; i--) head += path(`M${78+i*4} 57 C${37+i*4} 74 ${72+i*4} 105 ${50+i*4} 123 C${25+i*4} 149 ${76+i*4} 177 ${82+i*4} 142 Q${59+i*4} 157 ${76+i*4} 124 C${96+i*4} 99 ${59+i*4} 88 ${91+i*4} 62`, url(`mane${i}`), 1.2);
        for (let i = 5; i >= 0; i--) head += path(`M${77+i*13} 69 C${52+i*13} 43 ${86+i*12} 29 ${102+i*10} 48 Q${112+i*10} 71 ${95+i*12} 77`, url(`mane${i}`), 2);
        head += path('M63 75 Q51 86 64 99 M56 132 Q45 149 62 153 M89 46 Q77 45 77 55 M117 47 q10 -1 12 13', 'none', 2.5, '#fff6ed');
        head += path('M114 55 L129 8 Q137 29 137 56Z', gold) + path('M124 27 l10 4 m-14 7 15 5', 'none', 2, '#b87938');
    }
    if (monkey || dragon) head += path('M101 48 Q91 29 108 33 L114 42 Q111 18 125 29 L131 43 Q143 30 146 43 L144 53', coat, 3);
    let face = '';
    for (const x of [88, 150]) {
        if (e === 'dodo') {
            face += path(`M${x-14} 98 Q${x} 112 ${x+14} 98`, 'none', 4.5);
            face += path(`M${x-11} 104 l-4 3`, 'none', 2.5);
        } else {
            face += ellipse(x, 100, 21, e === 'surprise' ? 30 : 26, '#fffdf4', 2);
            face += path(`M${x-19} 91 Q${x} 62 ${x+19} 91 Q${x} 77 ${x-19} 91Z`, '#c4b3c3', 0);
            const look = e === 'concentre' ? 5 : 0;
            face += ellipse(x+look, 103, e === 'surprise' ? 10 : 13, e === 'surprise' ? 15 : 18, url('iris'), 1.2) + ellipse(x+look+1, 105, 8, 13, '#392e35', 0);
            face += path(`M${x+look-8} 115 Q${x+look} 124 ${x+look+8} 115 Q${x+look} 119 ${x+look-8} 115Z`, unicorn ? '#a7f3f3' : '#ffd080', 0);
            if (e === 'concentre') face += path(panda || red ? `M${x-19} 88 Q${x} 85 ${x+18} 90 Q${x} 70 ${x-19} 88Z` : `M${x-19} ${x<120?86:93} L${x+18} ${x<120?97:84} Q${x} 70 ${x-19} ${x<120?86:93}Z`, coat, 1.5);
            if (monkey || unicorn) face += path(`M${x-18} 84 l-7 -7 m9 4 -4 -8 m35 11 6 -7`, 'none', 2.5);
            face += ellipse(x+look-4, 97, 4, 5, '#ffffff', 0) + ellipse(x+look+4, 109, 2, 2.5, '#ffffff', 0);
            face += path(`M${x-20} 87 Q${x} 66 ${x+20} 87 M${x-18} 82 l-5 -5 M${x+17} 81 l4 -5`, 'none', 4);
        }
        const left = x < 120;
        face += path(e === 'triste' ? `M${x-13} ${left?77:70} Q${x} 68 ${x+13} ${left?70:77}` : e === 'concentre' ? (panda || red ? `M${x-13} ${left?74:77} Q${x} 73 ${x+12} ${left?77:74}` : `M${x-13} ${left?73:81} L${x+12} ${left?82:73}`) : `M${x-12} 69 Q${x} ${e==='surprise'?57:62} ${x+12} 69`, 'none', 3);
        face += ellipse(x-5, 124, 19, 11, url('blush'), 0);
    }
    if (e === 'triste') face += path('M166 117 C162 126 157 132 163 136 C176 142 178 130 166 117Z', '#88d9ed', 1.2, '#4a9cbb') + ellipse(164, 129, 2, 3, '#ffffff', 0);
    face += dragon
        ? path('M99 117 Q110 105 134 111 Q148 111 160 120 C187 117 191 145 166 151 Q140 159 116 145 Q98 139 99 117Z', coat, 2.5) + path('M148 145 Q167 151 179 138', 'none', 1.5)
        : unicorn
            ? path('M111 121 Q123 114 145 119 Q168 121 169 143 Q169 159 147 160 Q121 163 109 146 Q103 133 111 121Z', '#ffe5db', 2)
            : ellipse(120, 123, panda ? 28 : 18, panda ? 17 : 11, panda ? coat : cream, 0);
    if (dragon) {
        head += path('M78 65 q4 -6 8 0 m5 -7 q4 -6 8 0 m40 2 q4 -6 8 0 M65 151 q5 -5 9 0 m87 2 q5 -5 9 0', 'none', 1.5, '#aa3740');
        face += path('M148 145 l3 5 4 -4 m14 -2 4 3 2 -6', '#fff7de', 1);
    }
    if (dragon || unicorn) face += ellipse(dragon ? 153 : 128, dragon ? 126 : 136, 3, 4, ink, 0) + ellipse(dragon ? 172 : 151, dragon ? 129 : 136, 3, 4, ink, 0);
    face += '<g' + (unicorn ? ' transform="translate(16 13) scale(1 .94)"' : dragon ? ' transform="translate(13 6)"' : '') + '>';
    face += dragon || unicorn ? '' : path('M113 116 Q120 111 127 116 Q125 125 120 124 Q115 123 113 116Z', dark, 1.5);
    if (e === 'joie') face += path('M103 131 Q120 140 137 129 Q133 151 120 150 Q108 148 103 131Z', '#733d45', 2) + path('M111 144 Q120 135 130 143 Q123 153 111 144Z', pink, 0) + path('M109 133 Q120 137 131 132 L128 138 113 138Z', '#fff9ed', 0);
    else if (e === 'surprise') face += ellipse(120, 140, 10, 13, '#733d45', 2) + ellipse(118, 145, 4, 3, pink, 0);
    else if (e === 'triste') face += path('M108 141 Q120 129 133 141', 'none', 3);
    else if (e === 'concentre') face += path('M108 135 Q120 141 133 133', 'none', 2.5) + path('M123 138 Q126 150 133 144 L133 135', pink, 1.8);
    else face += path('M111 136 Q120 142 129 136', 'none', 2.5) + '<text x="183" y="66" fill="#805b96" font-size="23" font-family="sans-serif" font-weight="bold">z</text><text x="202" y="45" fill="#805b96" font-size="16" font-family="sans-serif">z</text>';
    face += '</g>';
    let props = '';
    if (panda) {
        props += path('M56 183 L70 131', 'none', 7, '#609642');
        for (let i = 0; i < 4; i++) props += path(`M${61+i*2} ${168-i*8} q-25 -18 -23 -4 q10 10 23 4 m0 0 q21 -18 21 -8 q-7 11 -21 8`, url('leaf'), 1.5, '#406c35');
        props += path('M57 175 l6 2 m-3 -14 6 2 m-2 -14 5 1 m-1 -13 5 1', 'none', 2, '#c7de83');
        props += path('M129 174 L184 174 179 206 Q154 219 134 203Z', gold);
        for (const x of [140, 151, 163, 175]) props += path(`M${x} 179 l1 25`, 'none', 1.5, '#aa713a');
        for (const y of [187, 192, 197, 202]) props += path(`M135 ${y} Q156 ${y+7} 180 ${y-1}`, 'none', 1, '#c28c46');
        for (const [x,y,color] of [[140,172,'#efba56'],[157,167,'#ea6556'],[173,173,'#8ebc56']] as const) props += ellipse(x,y,10,10,color,1.5);
        props += path('M156 159 q0 -10 8 -9 M130 182 Q157 188 183 181', 'none', 3, '#6c713a');
    }
    if (dragon) {
        props += path('M87 169 Q103 163 120 174 Q137 162 156 168 L151 202 Q135 197 120 207 Q102 198 89 201Z', '#65504b');
        props += path('M91 197 Q105 195 120 204 Q135 196 150 198 M92 200 Q107 198 120 207 Q135 199 150 201', 'none', 1.2, '#e3c99b');
        props += path('M92 167 Q105 165 120 176 Q139 164 152 168 L147 195 Q132 193 120 202 Q104 193 94 196Z', cream, 2) + path('M120 176 L120 201 M98 177 l15 5 m-14 3 13 5 m16 -8 16 -6 m-16 13 14 -5', 'none', 1.4, '#ad885e');
    }
    if (red) props += path('M171 164 C150 149 159 136 170 145 C184 129 198 149 171 164Z', pink, 2) + ellipse(164, 145, 4, 2, '#fff0e6', 0);
    if (monkey) {
        for (let i = 0; i < 5; i++) props += `<g transform="rotate(${i*72} 166 65)">${ellipse(166,53,7,12,pink,1.5)}</g>`;
        props += ellipse(166,65,6,6,gold,1.5);
    }
    if (unicorn) props += star(157, 177, 19) + star(200, 116, 8) + star(45, 155, 7) + path('M197 96 v9 m-4 -4 h8 M37 135 v8 m-4 -4 h8 M207 167 v10 m-5 -5 h10', 'none', 1.5, '#fff3ac');
    // Small specular marks on the paws and belly reinforce the shared light source.
    body += path('M91 151 Q89 164 94 171 M68 145 Q65 151 67 158', 'none', 2.5, '#ffe9d8');
    const movement = motion === 'reduce' ? '' : animation === 'special' ? '<animateTransform attributeName="transform" type="rotate" values="-4 120 180;4 120 180;-4 120 180" dur="4s" repeatCount="indefinite"/>' : `<animateTransform attributeName="transform" type="translate" values="0 0;0 ${animation === 'saut' ? -12 : animation === 'celebration' ? -7 : animation === 'marche' ? -4 : -2};0 0" dur="${animation === 'repos' ? 4.8 : 2.8}s" repeatCount="indefinite"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" role="img" aria-label="${c.fr}"><defs>${gradient('coat',shades[0]!,shades[1]!,shades[2]!)}${gradient('dark','#9a7973','#594246','#352d38')}${gradient('cream','#fffef0','#ffe8c7','#d5a575')}${gradient('pink','#ffe3e6','#f799b5','#ce5b8c')}${gradient('gold','#fff4af','#f5cc61','#be8437')}${gradient('iris','#eecb8a',unicorn?'#68bad6':dragon?'#db8b32':'#96633e','#493735')}${unicorn ? rainbow.map((color, i) => gradient(`mane${i}`, '#fff2e4', color, ['#ce6095', '#db8944', '#cfaf4d', '#4fae8b', '#508fbe', '#8262b8'][i]!)).join('') : ''}${red ? gradient('tailCoat','#d88953','#9d432b','#602e2c') : ''}${gradient('leaf','#d9ee8c','#76b94f','#357343')}${gradient('pearl','#fffce8','#eed6be','#c79cb9')}${gradient('wing','#c9f1c0','#73bd8c','#358778')}<clipPath id="${prefix}head"><path d="${headShape}"/></clipPath><clipPath id="${prefix}tail"><path d="${tailShape}"/></clipPath><linearGradient id="${prefix}shade" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#63334f" stop-opacity="0"/><stop offset="1" stop-color="#63334f" stop-opacity="0.3"/></linearGradient><radialGradient id="${prefix}blush"><stop stop-color="#f878a5" stop-opacity="0.8"/><stop offset="1" stop-color="#f878a5" stop-opacity="0"/></radialGradient><radialGradient id="${prefix}shadow"><stop offset="0" stop-color="#694956" stop-opacity="0.26"/><stop offset="1" stop-color="#694956" stop-opacity="0"/></radialGradient></defs>${ellipse(122,219,88,15,url('shadow'),0)}<g>${movement}${rear}${body}${head}${face}${props}<path d="M79 156 Q75 150 72 155" fill="none" stroke="${c.accent}" stroke-width="3" stroke-linecap="round"/></g></svg>`;
}
