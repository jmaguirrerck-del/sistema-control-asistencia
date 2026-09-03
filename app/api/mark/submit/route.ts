import { NextResponse } from "next/server";
import { ensureV13Schema } from "@/lib/migrations";
import { findEmployeeByPin, registerEntry, registerExit, todayEmployeeContext, validateLocation, validateQr } from "@/lib/attendance";
import { db } from "@/lib/db";
import { checkDevice } from "@/lib/device";

function serverTime(){return new Intl.DateTimeFormat("es-AR",{timeZone:"America/Argentina/Buenos_Aires",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date());}

export async function POST(request:Request){
  await ensureV13Schema();
  const b=await request.json().catch(()=>({}));const token=String(b.token||""),pin=String(b.pin||""),action=String(b.action||"");const location=b.location||{};
  if(action!=="ENTRY"&&action!=="EXIT")return NextResponse.json({error:"Acción de marcación inválida."},{status:400});
  const qr=await validateQr(token);if(!qr)return NextResponse.json({error:"El QR venció. Escaneá nuevamente el código de la oficina."},{status:410});
  const geo=await validateLocation({lat:Number(location.lat),lng:Number(location.lng),accuracy:Number(location.accuracy)||null});if(!geo.ok)return NextResponse.json({error:"La ubicación está fuera del área autorizada."},{status:403});
  const employee=await findEmployeeByPin(pin);if(!employee)return NextResponse.json({error:"PIN incorrecto."},{status:401});
  const device=await checkDevice(String(employee.id),true);
  if(!device.ok)return NextResponse.json({error:device.reason==="DEVICE_USED_BY_OTHER"?"Este dispositivo está vinculado a otro agente.":"Existe otro dispositivo autorizado para este agente."},{status:403});
  const ctx=await todayEmployeeContext(String(employee.id));if(!ctx.schedule)return NextResponse.json({error:"Hoy no corresponde prestación."},{status:409});if(ctx.leave)return NextResponse.json({error:"Existe una licencia, vacación o novedad vigente para hoy."},{status:409});
  try{
    const locationInput={lat:Number(location.lat),lng:Number(location.lng),accuracy:Number(location.accuracy)||null};
    const sql=db();
    if(action==="ENTRY"){
      const day=await registerEntry({employeeId:String(employee.id),location:locationInput,distance:Number(geo.distance)});await sql`UPDATE qr_tokens SET used_count=used_count+1 WHERE id=${qr.id}`;
      return NextResponse.json({kind:"ENTRY",name:`${employee.last_name}, ${employee.first_name}`,serverTime:serverTime(),lateMinutes:Number(day.late_minutes||0)});
    }
    const day=await registerExit({employeeId:String(employee.id),location:locationInput,distance:Number(geo.distance)});await sql`UPDATE qr_tokens SET used_count=used_count+1 WHERE id=${qr.id}`;
    return NextResponse.json({kind:"EXIT",name:`${employee.last_name}, ${employee.first_name}`,serverTime:serverTime(),compensationMinutes:Number(day.compensation_minutes||0),pendingMinutes:Number(day.pending_minutes||0)});
  }catch(error){
    const code=error instanceof Error?error.message:"";const messages:Record<string,string>={ENTRY_EXISTS:"La entrada de hoy ya fue registrada.",EXIT_EXISTS:"La salida de hoy ya fue registrada.",NO_ENTRY:"No existe una entrada previa para registrar la salida.",NO_SCHEDULE:"Hoy no corresponde prestación.",ON_LEAVE:"Existe una novedad vigente para hoy."};return NextResponse.json({error:messages[code]||"No se pudo registrar la marcación."},{status:409});
  }
}
