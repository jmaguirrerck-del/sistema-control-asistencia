import { NextResponse } from "next/server";
import { autoCloseEligibleDays } from "@/lib/attendance";

export async function GET(request:Request){
  const secret=process.env.CRON_SECRET; if(!secret)return NextResponse.json({error:"CRON_SECRET no configurado"},{status:503});
  const auth=request.headers.get("authorization"); if(auth!==`Bearer ${secret}`)return NextResponse.json({error:"No autorizado"},{status:401});
  const closed=await autoCloseEligibleDays();return NextResponse.json({ok:true,closed});
}
