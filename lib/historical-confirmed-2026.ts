export type HistoricalConfirmed2026 = {
  sourcePage:number;
  formIndex:number;
  dni:string;
  employeeName:string;
  kind:'VACATION'|'MEDICAL'|'ADMINISTRATIVE';
  catalogCode?:string;
  sourceArticle:string;
  dateFrom:string;
  dateTo:string;
  quantity:number;
  unit:'DAYS'|'HOURS';
  note?:string;
};

// Lotes validados contra formularios institucionales del PDF
// "LICENCIAS 2026-comprimido.pdf". Se excluyen certificados, constancias y
// demás documentación respaldatoria. Las páginas 196, 207 (superior e inferior)
// y 209 permanecen fuera para carga manual.
export const historicalConfirmed2026:HistoricalConfirmed2026[] = [
  // Vacaciones / LAO - lote ya disponible desde V1.16
  {sourcePage:1,formIndex:1,dni:'29464444',employeeName:'Fernandez, Maria Laura',kind:'VACATION',sourceArticle:'Art. 4 inc. b',dateFrom:'2026-01-19',dateTo:'2026-02-17',quantity:30,unit:'DAYS'},
  {sourcePage:2,formIndex:1,dni:'26698143',employeeName:'Barbachuk, Marcelo Daniel',kind:'VACATION',sourceArticle:'Art. 4 inc. b',dateFrom:'2026-01-26',dateTo:'2026-02-19',quantity:25,unit:'DAYS'},
  {sourcePage:3,formIndex:1,dni:'36112294',employeeName:'Quintana Esquivel, Silvia Lorena De Jesús',kind:'VACATION',sourceArticle:'Art. 4 inc. b',dateFrom:'2026-01-19',dateTo:'2026-02-12',quantity:25,unit:'DAYS'},
  {sourcePage:4,formIndex:1,dni:'37157606',employeeName:'Alsina, Fernando Joaquin',kind:'VACATION',sourceArticle:'Art. 4',dateFrom:'2026-02-02',dateTo:'2026-02-26',quantity:25,unit:'DAYS',note:'Cantidad derivada del período consignado; el formulario no deja una cantidad legible.'},
  {sourcePage:5,formIndex:1,dni:'30997152',employeeName:'Ramirez, Clara',kind:'VACATION',sourceArticle:'Art. 4 inc. b',dateFrom:'2026-01-12',dateTo:'2026-02-05',quantity:25,unit:'DAYS'},
  {sourcePage:6,formIndex:1,dni:'32918597',employeeName:'Bordon, Enrique Manuel',kind:'VACATION',sourceArticle:'Art. 4 inc. b',dateFrom:'2026-01-19',dateTo:'2026-02-06',quantity:19,unit:'DAYS'},
  {sourcePage:7,formIndex:1,dni:'39865236',employeeName:'Romero Espindola, Gabriel Maximiliano',kind:'VACATION',sourceArticle:'Art. 4 inc. b',dateFrom:'2026-01-12',dateTo:'2026-01-30',quantity:19,unit:'DAYS'},
  {sourcePage:8,formIndex:1,dni:'30141771',employeeName:'Paniagua, Juan Matias',kind:'VACATION',sourceArticle:'Art. 4 inc. b',dateFrom:'2026-01-26',dateTo:'2026-02-14',quantity:20,unit:'DAYS'},
  {sourcePage:9,formIndex:1,dni:'28666903',employeeName:'Flores, Jesica',kind:'VACATION',sourceArticle:'Art. 4 inc. b',dateFrom:'2026-01-07',dateTo:'2026-01-31',quantity:25,unit:'DAYS'},
  {sourcePage:10,formIndex:1,dni:'31637459',employeeName:'Jonusas, Gabriel Ignacio',kind:'VACATION',sourceArticle:'Art. 4 inc. b',dateFrom:'2026-01-05',dateTo:'2026-01-29',quantity:25,unit:'DAYS'},
  {sourcePage:11,formIndex:1,dni:'33013576',employeeName:'Blanco, Alfonso Romina',kind:'VACATION',sourceArticle:'Art. 4 inc. b',dateFrom:'2026-02-09',dateTo:'2026-03-10',quantity:30,unit:'DAYS'},
  {sourcePage:13,formIndex:1,dni:'22680977',employeeName:'Cabrera, Mirta Noemi',kind:'VACATION',sourceArticle:'Art. 4 inc. b',dateFrom:'2026-01-05',dateTo:'2026-02-01',quantity:28,unit:'DAYS',note:'Solicitó 35 días; RRHH otorgó 28 y no otorgó 7. Se registra exclusivamente el período otorgado.'},
  {sourcePage:14,formIndex:1,dni:'38237019',employeeName:'Hidalgo, Maria Constanza',kind:'VACATION',sourceArticle:'Art. 4 inc. b',dateFrom:'2026-01-12',dateTo:'2026-02-05',quantity:25,unit:'DAYS'},
  {sourcePage:16,formIndex:1,dni:'32136744',employeeName:'Gimenez, Alejandra',kind:'VACATION',sourceArticle:'Art. 4 inc. b',dateFrom:'2026-01-12',dateTo:'2026-02-10',quantity:30,unit:'DAYS'},

  // Licencias médicas - Actas de Evaluación Médica oficiales
  {sourcePage:38,formIndex:1,dni:'30997780',employeeName:'Gomez Palavecino, Emilia Mariel',kind:'MEDICAL',catalogCode:'ART8A',sourceArticle:'Art. 8 inc. a',dateFrom:'2026-04-02',dateTo:'2026-04-16',quantity:15,unit:'DAYS'},
  {sourcePage:46,formIndex:1,dni:'33013576',employeeName:'Blanco, Alfonso Romina',kind:'MEDICAL',catalogCode:'ART8A',sourceArticle:'Art. 8 inc. a',dateFrom:'2026-04-20',dateTo:'2026-04-22',quantity:3,unit:'DAYS'},
  {sourcePage:57,formIndex:1,dni:'33792000',employeeName:'Sanchez, Veronica Itati',kind:'MEDICAL',catalogCode:'ART12',sourceArticle:'Art. 12',dateFrom:'2026-05-12',dateTo:'2026-05-12',quantity:1,unit:'DAYS'},
  {sourcePage:58,formIndex:1,dni:'33792000',employeeName:'Sanchez, Veronica Itati',kind:'MEDICAL',catalogCode:'ART12',sourceArticle:'Art. 12',dateFrom:'2026-03-26',dateTo:'2026-03-26',quantity:1,unit:'DAYS'},
  {sourcePage:59,formIndex:1,dni:'32233940',employeeName:'Miers, Gianina Gisela',kind:'MEDICAL',catalogCode:'ART8A',sourceArticle:'Art. 8 inc. a',dateFrom:'2026-06-22',dateTo:'2026-06-26',quantity:5,unit:'DAYS'},
  {sourcePage:60,formIndex:1,dni:'32306329',employeeName:'Vallejos, David Mariano',kind:'MEDICAL',sourceArticle:'Art. 132',dateFrom:'2026-04-14',dateTo:'2026-04-16',quantity:3,unit:'DAYS',note:'Artículo preservado literalmente del Acta de Evaluación Médica; no se fuerza equivalencia con otro artículo del catálogo.'},
  {sourcePage:81,formIndex:1,dni:'40047850',employeeName:'Billordo, Mariela Ayelen',kind:'MEDICAL',catalogCode:'ART12',sourceArticle:'Art. 12',dateFrom:'2026-08-21',dateTo:'2026-08-21',quantity:1,unit:'DAYS'},
  {sourcePage:147,formIndex:1,dni:'29464444',employeeName:'Fernandez, Maria Laura',kind:'MEDICAL',catalogCode:'ART12',sourceArticle:'Art. 12',dateFrom:'2026-06-11',dateTo:'2026-06-12',quantity:2,unit:'DAYS'},
  {sourcePage:178,formIndex:1,dni:'39865236',employeeName:'Romero Espindola, Gabriel Maximiliano',kind:'MEDICAL',catalogCode:'ART8A',sourceArticle:'Art. 8 inc. a',dateFrom:'2026-07-01',dateTo:'2026-07-01',quantity:1,unit:'DAYS'},
  {sourcePage:179,formIndex:1,dni:'39865236',employeeName:'Romero Espindola, Gabriel Maximiliano',kind:'MEDICAL',catalogCode:'ART8A',sourceArticle:'Art. 8 inc. a',dateFrom:'2026-05-07',dateTo:'2026-05-07',quantity:1,unit:'DAYS'},
  {sourcePage:222,formIndex:1,dni:'30997152',employeeName:'Ramirez, Clara Elisa',kind:'MEDICAL',catalogCode:'ART12',sourceArticle:'Art. 12',dateFrom:'2026-06-01',dateTo:'2026-06-05',quantity:5,unit:'DAYS'},
  {sourcePage:223,formIndex:1,dni:'30997152',employeeName:'Ramirez, Clara Elisa',kind:'MEDICAL',catalogCode:'ART8A',sourceArticle:'Art. 8 inc. a',dateFrom:'2026-05-14',dateTo:'2026-05-16',quantity:3,unit:'DAYS'},
  {sourcePage:230,formIndex:1,dni:'38871207',employeeName:'Fernandez, Virginia Sofia',kind:'MEDICAL',catalogCode:'ART8A',sourceArticle:'Art. 8 inc. a',dateFrom:'2026-04-06',dateTo:'2026-04-06',quantity:1,unit:'DAYS'},
  {sourcePage:231,formIndex:1,dni:'38871207',employeeName:'Fernandez, Virginia Sofia',kind:'MEDICAL',catalogCode:'ART8A',sourceArticle:'Art. 8 inc. a',dateFrom:'2026-08-07',dateTo:'2026-08-14',quantity:8,unit:'DAYS',note:'El acta consigna 5 días solicitados por médico tratante, pero auditoría resolvió JUSTIFICAR 8 días. Se registra lo efectivamente resuelto.'},
  {sourcePage:264,formIndex:1,dni:'20373631',employeeName:'Devecchi, Vicente Gaspar',kind:'MEDICAL',sourceArticle:'Art. 152',dateFrom:'2026-08-18',dateTo:'2026-08-19',quantity:2,unit:'DAYS',note:'Artículo preservado literalmente del Acta de Evaluación Médica; no se fuerza equivalencia con otro artículo del catálogo.'},

  // Licencias administrativas - Solicitud de licencia común oficial
  {sourcePage:172,formIndex:1,dni:'39865236',employeeName:'Romero Espindola, Gabriel Maximiliano',kind:'ADMINISTRATIVE',catalogCode:'ART30B',sourceArticle:'Art. 30 inc. b',dateFrom:'2026-04-24',dateTo:'2026-04-24',quantity:1,unit:'DAYS'},
  {sourcePage:173,formIndex:1,dni:'39865236',employeeName:'Romero Espindola, Gabriel Maximiliano',kind:'ADMINISTRATIVE',catalogCode:'ART30B',sourceArticle:'Art. 30 inc. b',dateFrom:'2026-05-18',dateTo:'2026-05-18',quantity:1,unit:'DAYS'},
  {sourcePage:174,formIndex:1,dni:'39865236',employeeName:'Romero Espindola, Gabriel Maximiliano',kind:'ADMINISTRATIVE',catalogCode:'ART30B',sourceArticle:'Art. 30 inc. b',dateFrom:'2026-05-29',dateTo:'2026-05-29',quantity:1,unit:'DAYS'},
  {sourcePage:175,formIndex:1,dni:'39865236',employeeName:'Romero Espindola, Gabriel Maximiliano',kind:'ADMINISTRATIVE',catalogCode:'ART30B',sourceArticle:'Art. 30 inc. b',dateFrom:'2026-06-22',dateTo:'2026-06-22',quantity:1,unit:'DAYS',note:'El campo Hasta parece consignar 23/06/2026, pero la cantidad solicitada es 1 día. Se aplica la regla acordada: Cantidad + Desde.'},
  {sourcePage:176,formIndex:1,dni:'39865236',employeeName:'Romero Espindola, Gabriel Maximiliano',kind:'ADMINISTRATIVE',catalogCode:'ART30B',sourceArticle:'Art. 30 inc. b',dateFrom:'2026-07-29',dateTo:'2026-07-29',quantity:1,unit:'DAYS'},
  {sourcePage:177,formIndex:1,dni:'39865236',employeeName:'Romero Espindola, Gabriel Maximiliano',kind:'ADMINISTRATIVE',catalogCode:'ART30B',sourceArticle:'Art. 30 inc. b',dateFrom:'2026-08-12',dateTo:'2026-08-12',quantity:1,unit:'DAYS'}
];
