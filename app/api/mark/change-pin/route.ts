import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { ensureV13Schema } from "@/lib/migrations";
import { findEmployeeByPin, validateLocation, validateQr } from "@/lib/attendance";
import { checkDevice } from "@/lib/device";
import { db } from "@/lib/db";
import { pinLookup } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export async function POST(request:Request){
  await ensureV13Schema();
  const b=await request.json().catch(()=>({}));
  const token=String(b.token||"");
  const currentPin=String(b.currentPin||"");
  const newPin=String(b.newPin||"");
  const location=b.location||{};
  if(!/^\d{4,8}$/.test(currentPin)||!/^\d{4,8}$/.test(newPin))return NextResponse.json({error:"El PIN debe tener entre 4 y 8 dígitos."},{status:400});
  if(currentPin===newPin)return NextResponse.json({error:"El nuevo PIN debe ser diferente al actual."},{status:400});
  if(!(await validateQr(token)))return NextResponse.json({error:"El QR venció. Escaneá nuevamente el código de la oficina."},{status:410});
  const geo=await validateLocation({lat:Number(location.lat),lng:Number(location.lng),accuracy:Number(location.accuracy)||null});
  if(!geo.ok)return NextResponse.json({error:"La ubicación está fuera del área autorizada."},{status:403});
  const employee=await findEmployeeByPin(currentPin);
  if(!employee)return NextResponse.json({error:"El PIN actual es incorrecto."},{status:401});
  const device=await checkDevice(String(employee.id),true,b.deviceKey,b.deviceSignature,b.deviceRecoverySignature);
  if(!device.ok)return NextResponse.json({error:device.reason==="DEVICE_USED_BY_OTHER"?"Este dispositivo está vinculado a otro agente.":"Existe otro dispositivo autorizado para este agente."},{status:403});
  const sql=db();
  const lookup=await pinLookup(newPin);
  const dup=await sql`SELECT id FROM employees WHERE pin_lookup=${lookup} AND id<>${String(employee.id)} LIMIT 1`;
  if(dup[0])return NextResponse.json({error:"Ese PIN ya está asignado a otro agente. Elegí uno diferente."},{status:409});
  const hash=await bcrypt.hash(newPin,12);
  await sql`UPDATE employees SET pin_hash=${hash},pin_lookup=${lookup},force_pin_change=FALSE,pin_changed_at=now(),pin_change_source='EMPLOYEE',temporary_pin_expires_at=NULL,updated_at=now() WHERE id=${String(employee.id)}`;
  await writeAudit({actor:`employee:${employee.id}`,action:"CHANGE_OWN_PIN",entityType:"employee",entityId:String(employee.id),next:{pinChanged:true,source:"EMPLOYEE"}});
  return NextResponse.json({ok:true,message:"PIN actualizado correctamente."});
}
