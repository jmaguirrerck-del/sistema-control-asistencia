import { NextResponse } from "next/server";
import { ensureV13Schema } from "@/lib/migrations";
import { autoCloseEligibleDays, findEmployeeByPin, todayEmployeeContext, validateLocation, validateQr } from "@/lib/attendance";
import { checkDevice } from "@/lib/device";

const leaveLabels:Record<string,string>={MEDICAL:"licencia médica",ADMINISTRATIVE:"licencia administrativa",VACATION:"vacaciones",COMMISSION:"comisión de servicio",AFFECTATION:"afectación",FRANCO:"franco",OTHER:"otra novedad"};

type AttendanceSnapshot = {
  entry_at?: string | Date | null;
  exit_at?: string | Date | null;
  exit_type?: string | null;
  late_minutes?: number | string | null;
};

export async function POST(request:Request){
  await ensureV13Schema();
  const b=await request.json().catch(()=>({}));const token=String(b.token||""),pin=String(b.pin||"");const location=b.location||{};
  if(!/^\d{4,8}$/.test(pin))return NextResponse.json({error:"PIN inválido."},{status:400});
  if(!(await validateQr(token)))return NextResponse.json({error:"El QR venció. Escaneá nuevamente el código de la oficina."},{status:410});
  const geo=await validateLocation({lat:Number(location.lat),lng:Number(location.lng),accuracy:Number(location.accuracy)||null});if(!geo.ok)return NextResponse.json({error:"La ubicación ya no se encuentra dentro del área autorizada."},{status:403});
  const employee=await findEmployeeByPin(pin);if(!employee)return NextResponse.json({error:"PIN incorrecto o no configurado."},{status:401});
  const device=await checkDevice(String(employee.id),true,b.deviceKey);
  if(!device.ok){
    const msg=device.reason==="DEVICE_USED_BY_OTHER"?"Este dispositivo ya está vinculado a otro agente. Solicitá al administrador la desvinculación correspondiente.":"Tu cuenta ya tiene otro dispositivo autorizado. Solicitá al administrador autorización para cambiar de celular.";
    return NextResponse.json({error:msg},{status:403});
  }
  await autoCloseEligibleDays();
  const ctx=await todayEmployeeContext(String(employee.id));
  if(!ctx.schedule)return NextResponse.json({error:"Según el horario registrado, hoy no corresponde prestación en la oficina."},{status:409});
  if(ctx.leave)return NextResponse.json({error:`Hoy figura ${leaveLabels[String(ctx.leave.leave_type)]||"una novedad administrativa"}. No corresponde realizar marcación.`},{status:409});
  const attendance = (ctx.attendance ?? null) as AttendanceSnapshot | null;
  let action:"ENTRY"|"EXIT"|"DONE"="ENTRY";let lastMark:string|null=null;
  if(attendance && attendance.entry_at && !attendance.exit_at){action="EXIT";lastMark=`Entrada ${new Intl.DateTimeFormat("es-AR",{timeZone:"America/Argentina/Buenos_Aires",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(attendance.entry_at))}`;}
  else if(attendance && attendance.entry_at && attendance.exit_at){action="DONE";lastMark=`Salida ${new Intl.DateTimeFormat("es-AR",{timeZone:"America/Argentina/Buenos_Aires",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(attendance.exit_at))}${attendance.exit_type==="AUTO"?" · cierre automático":""}`;}
  return NextResponse.json({employee:{id:employee.id,name:`${employee.last_name}, ${employee.first_name}`,dni:employee.dni},deviceBoundNow:device.boundNow,mustChangePin:Boolean(employee.force_pin_change),schedule:`${String(ctx.schedule.start_time).slice(0,5)}–${String(ctx.schedule.end_time).slice(0,5)}`,action,lastMark,lateMinutes:Number(attendance?.late_minutes||0)});
}
