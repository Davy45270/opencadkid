/** Authored levels for « Le goûter de Boubou ». Field units: 320 × 440, y grows downwards.
 * Every level is checked by the solver (tests/gouter.test.ts): finishable, three stars reachable,
 * nothing happens without a child's action, and the reference plan tolerates timing errors. */
export interface LevelDef {
    id: number;
    treat: { x: number; y: number };
    ropes: readonly { x: number; y: number; length?: number }[];
    hooks?: readonly { x: number; y: number; reach: number }[];
    bubbles?: readonly { x: number; y: number }[];
    stars: readonly { x: number; y: number }[];
    mouth: { x: number; y: number };
}
export const levels: readonly LevelDef[] = [
    { id: 1, treat: {x: 160,y: 110}, ropes: [{x: 160,y: 40}], stars: [{x: 160,y: 196},{x: 160,y: 273},{x: 160,y: 340}], mouth: {x: 160,y: 395} },
    { id: 2, treat: {x: 200,y: 320}, ropes: [{x: 200,y: 250}], bubbles: [{x: 200,y: 392}], stars: [{x: 200,y: 399},{x: 200,y: 299},{x: 200,y: 181}], mouth: {x: 200,y: 104} },
    { id: 3, treat: {x: 160,y: 120}, ropes: [{x: 110,y: 50},{x: 210,y: 50}], stars: [{x: 224,y: 135},{x: 173,y: 147},{x: 173,y: 309}], mouth: {x: 173,y: 390} },
    { id: 4, treat: {x: 160,y: 140}, ropes: [{x: 80,y: 60},{x: 240,y: 60}], stars: [{x: 260,y: 171},{x: 211,y: 169},{x: 181,y: 311}], mouth: {x: 181,y: 387} },
    { id: 5, treat: {x: 160,y: 150}, ropes: [{x: 100,y: 70},{x: 220,y: 70},{x: 160,y: 40}], stars: [{x: 268,y: 158},{x: 176,y: 167},{x: 178,y: 323}], mouth: {x: 178,y: 391} },
    { id: 6, treat: {x: 70,y: 120}, ropes: [{x: 160,y: 60}], stars: [{x: 145,y: 167},{x: 238,y: 142},{x: 238,y: 280}], mouth: {x: 238,y: 386} },
    { id: 7, treat: {x: 100,y: 120}, ropes: [{x: 100,y: 50},{x: 170,y: 60,length: 130}], stars: [{x: 155,y: 189},{x: 245,y: 175},{x: 243,y: 305}], mouth: {x: 242,y: 388} },
    { id: 8, treat: {x: 160,y: 200}, ropes: [{x: 160,y: 120},{x: 60,y: 250,length: 140}], bubbles: [{x: 160,y: 300}], stars: [{x: 160,y: 320},{x: 160,y: 262},{x: 143,y: 363}], mouth: {x: 92,y: 386} },
    { id: 9, treat: {x: 60,y: 120}, ropes: [{x: 140,y: 50}], hooks: [{x: 250,y: 160,reach: 60}], stars: [{x: 161,y: 154},{x: 212,y: 175},{x: 230,y: 305}], mouth: {x: 241,y: 388} },
    { id: 10, treat: {x: 250,y: 110}, ropes: [{x: 250,y: 40},{x: 160,y: 60,length: 140}], stars: [{x: 176,y: 199},{x: 133,y: 197},{x: 242,y: 260}], mouth: {x: 240,y: 395} },
    { id: 11, treat: {x: 120,y: 220}, ropes: [{x: 120,y: 150},{x: 250,y: 300,length: 175}], bubbles: [{x: 120,y: 300}], stars: [{x: 120,y: 320},{x: 120,y: 242},{x: 136,y: 165}], mouth: {x: 145,y: 100} },
    { id: 12, treat: {x: 160,y: 180}, ropes: [{x: 110,y: 90},{x: 210,y: 90},{x: 40,y: 240},{x: 280,y: 240}], stars: [{x: 234,y: 190},{x: 174,y: 243},{x: 175,y: 341}], mouth: {x: 175,y: 397} },
    { id: 13, treat: {x: 90,y: 300}, ropes: [{x: 90,y: 230}], hooks: [{x: 150,y: 120,reach: 70}], bubbles: [{x: 90,y: 380}], stars: [{x: 90,y: 295},{x: 91,y: 83},{x: 148,y: 232}], mouth: {x: 148,y: 399} },
    { id: 14, treat: {x: 160,y: 130}, ropes: [{x: 100,y: 50},{x: 220,y: 50}], stars: [{x: 229,y: 150},{x: 181,y: 142},{x: 178,y: 303}], mouth: {x: 178,y: 392} },
    { id: 15, treat: {x: 40,y: 110}, ropes: [{x: 110,y: 50}], hooks: [{x: 215,y: 150,reach: 60}], stars: [{x: 166,y: 123},{x: 244,y: 203},{x: 267,y: 287}], mouth: {x: 267,y: 390} },
    { id: 16, treat: {x: 60,y: 120}, ropes: [{x: 140,y: 50}], hooks: [{x: 250,y: 160,reach: 60}], bubbles: [{x: 230,y: 330}], stars: [{x: 227,y: 281},{x: 252,y: 362},{x: 252,y: 213}], mouth: {x: 252,y: 94} }
];
