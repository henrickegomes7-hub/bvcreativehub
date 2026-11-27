import assert from 'node:assert/strict';
import test from 'node:test';
import { toCsv } from '../src/utils/csv.js';
import { validateRequest } from '../src/utils/requestRules.js';

test('CSV preserves Unicode, separators, quotes and line breaks and protects spreadsheet formulas', () => {
  assert.equal(toCsv([['Criação; A','Linha "1"\nLinha 2','  =1+1','@SUM(A1)','+5','-1','\tTexto']]),
    '\uFEFF"Criação; A";"Linha ""1""\nLinha 2";"\u0027  =1+1";"\u0027@SUM(A1)";"\u0027+5";"\u0027-1";"\u0027\tTexto"');
});

test('briefing validation identifies exact invalid fields and accepts a legacy catalog format', () => {
  const valid = {title:'Peça',description:'Briefing',department_id:'dept-cartoes',priority:'low',format:'social_feed',deadline:'2027-01-01T12:00:00Z',estimated_hours:12,tags:['BV'],briefing:{delivery_email:'nome@example.org',delivery_whatsapp:'(11) 99999-9999'}};
  assert.deepEqual(validateRequest(valid),{});
  assert.deepEqual(validateRequest({...valid,format:'Outdoor',briefing:{...valid.briefing,print_width:9,print_height:3,print_unit:'m'}}),{});
  assert.deepEqual(Object.keys(validateRequest({...valid,format:'Flyer / Panfleto',briefing:{...valid.briefing,print_width:0}})).sort(),
    ['briefing.print_height','briefing.print_unit','briefing.print_width']);
  assert.deepEqual(validateRequest({...valid,briefing:{delivery_email:' '}}),{
    'briefing.delivery_email':'Informe o e-mail para envio.',
    'briefing.delivery_whatsapp':'Informe o WhatsApp para envio.',
  });
  assert.deepEqual(Object.keys(validateRequest({...valid,tags:[1],deadline:'amanhã',briefing:{...valid.briefing,delivery_whatsapp:'123',reference_links:['file:///local']}})).sort(),
    ['briefing.delivery_whatsapp','briefing.reference_links','deadline','tags']);
});
