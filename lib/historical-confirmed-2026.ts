export type HistoricalConfirmed2026 = {
  sourcePage:number;
  formIndex:number;
  dni:string;
  employeeName:string;
  kind:'VACATION';
  article:string;
  dateFrom:string;
  dateTo:string;
  quantity:number;
  unit:'DAYS';
  note?:string;
};

// Lote 1 validado visualmente contra los formularios originales del PDF
// "LICENCIAS 2026-comprimido.pdf". No incluye documentación respaldatoria.
// Las páginas 196, 207 (superior e inferior) y 209 quedan expresamente fuera.
export const historicalConfirmed2026:HistoricalConfirmed2026[] = [
  {sourcePage:1,formIndex:1,dni:'29464444',employeeName:'Fernandez, Maria Laura',kind:'VACATION',article:'Art. 4 inc. b',dateFrom:'2026-01-19',dateTo:'2026-02-17',quantity:30,unit:'DAYS'},
  {sourcePage:2,formIndex:1,dni:'26698143',employeeName:'Barbachuk, Marcelo Daniel',kind:'VACATION',article:'Art. 4 inc. b',dateFrom:'2026-01-26',dateTo:'2026-02-19',quantity:25,unit:'DAYS'},
  {sourcePage:3,formIndex:1,dni:'36112294',employeeName:'Quintana Esquivel, Silvia Lorena De Jesús',kind:'VACATION',article:'Art. 4 inc. b',dateFrom:'2026-01-19',dateTo:'2026-02-12',quantity:25,unit:'DAYS'},
  {sourcePage:4,formIndex:1,dni:'37157606',employeeName:'Alsina, Fernando Joaquin',kind:'VACATION',article:'Art. 4',dateFrom:'2026-02-02',dateTo:'2026-02-26',quantity:25,unit:'DAYS',note:'Cantidad derivada del período consignado; el formulario no deja una cantidad legible.'},
  {sourcePage:5,formIndex:1,dni:'30997152',employeeName:'Ramirez, Clara',kind:'VACATION',article:'Art. 4 inc. b',dateFrom:'2026-01-12',dateTo:'2026-02-05',quantity:25,unit:'DAYS'},
  {sourcePage:6,formIndex:1,dni:'32918597',employeeName:'Bordon, Enrique Manuel',kind:'VACATION',article:'Art. 4 inc. b',dateFrom:'2026-01-19',dateTo:'2026-02-06',quantity:19,unit:'DAYS'},
  {sourcePage:7,formIndex:1,dni:'39865236',employeeName:'Romero Espindola, Gabriel Maximiliano',kind:'VACATION',article:'Art. 4 inc. b',dateFrom:'2026-01-12',dateTo:'2026-01-30',quantity:19,unit:'DAYS'},
  {sourcePage:8,formIndex:1,dni:'30141771',employeeName:'Paniagua, Juan Matias',kind:'VACATION',article:'Art. 4 inc. b',dateFrom:'2026-01-26',dateTo:'2026-02-14',quantity:20,unit:'DAYS'},
  {sourcePage:9,formIndex:1,dni:'28666903',employeeName:'Flores, Jesica',kind:'VACATION',article:'Art. 4 inc. b',dateFrom:'2026-01-07',dateTo:'2026-01-31',quantity:25,unit:'DAYS'},
  {sourcePage:10,formIndex:1,dni:'31637459',employeeName:'Jonusas, Gabriel Ignacio',kind:'VACATION',article:'Art. 4 inc. b',dateFrom:'2026-01-05',dateTo:'2026-01-29',quantity:25,unit:'DAYS'},
  {sourcePage:11,formIndex:1,dni:'33013576',employeeName:'Blanco, Alfonso Romina',kind:'VACATION',article:'Art. 4 inc. b',dateFrom:'2026-02-09',dateTo:'2026-03-10',quantity:30,unit:'DAYS'},
  {sourcePage:13,formIndex:1,dni:'22680977',employeeName:'Cabrera, Mirta Noemi',kind:'VACATION',article:'Art. 4 inc. b',dateFrom:'2026-01-05',dateTo:'2026-02-01',quantity:28,unit:'DAYS',note:'Solicitó 35 días; RRHH otorgó 28 y no otorgó 7. Se registra exclusivamente el período otorgado.'},
  {sourcePage:14,formIndex:1,dni:'38237019',employeeName:'Hidalgo, Maria Constanza',kind:'VACATION',article:'Art. 4 inc. b',dateFrom:'2026-01-12',dateTo:'2026-02-05',quantity:25,unit:'DAYS'},
  {sourcePage:16,formIndex:1,dni:'32136744',employeeName:'Gimenez, Alejandra',kind:'VACATION',article:'Art. 4 inc. b',dateFrom:'2026-01-12',dateTo:'2026-02-10',quantity:30,unit:'DAYS'}
];
