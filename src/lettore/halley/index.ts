import type {Gestionale} from '../tipi';
import {leggiCedolino} from './cedolino';
import {leggiRiepilogo} from './riepilogo';
import {regoleHalley} from './regole';

export {leggiCedolino, leggiRiepilogo, regoleHalley};

export const halley: Gestionale = {
  nome: 'Halley',
  lettori: [leggiRiepilogo, leggiCedolino],
  regole: regoleHalley,
  daSommare: ['10'],
};
