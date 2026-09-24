import { NextResponse } from 'next/server'
export async function GET(){return NextResponse.json({mode:'cloud',provider:'Cloudflare Workers',message:'LAN discovery is not used in the cloud deployment.'})}
