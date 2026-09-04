import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
export async function GET(){const s=await getAdminSession();if(!s)return NextResponse.json({error:"No autorizado"},{status:401});return NextResponse.json(s);}
